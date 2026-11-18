// main.js — 霓虹湾 NEON BAY: boot, game state, fixed-step loop, rendering.
// Original open-world crime game: walk + drive, steal cars, police + helicopter,
// 5 story missions, shops, side jobs, day/night, save, HUD + minimap.

import { makeInput, makeCamera, clamp, dist, pushOutCircleRect } from './engine.js';
import { buildCity, drawCity, WORLD_W, WORLD_H, inRiver, isWater } from './city.js';
import { spawnTraffic, spawnParkedCars, nearestCar, enterCar, exitCar, updatePlayerCar, updateTraffic, drawCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, updatePolice, drawPeople } from './people.js';
import { playerPunch, playerShoot, updateBullets, updateEnemies, drawCombat } from './combat.js';
import { startMission, updateMission, drawMissionMarker, MISSION_DEFS } from './missions.js';
import { addCash, nearestShop, useShop, updateTaxi, startRace, updateRace, checkPackages, checkCashPickups, drawEconomy } from './economy.js';
import { makeAudio } from './audio.js';
import { drawHUD, drawTitle, drawPause, drawGameOver, drawComplete } from './hud.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { applyShot } from './shots.js';

const SEED = 20261118;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const G = {
  time: 0, clock: 9.0, night: false,
  state: 'title', // title | play | pause | over | complete
  money: 150, completedMissions: 0, packagesFound: 0, gameComplete: false,
  wanted: 0, wantedT: 0,
  player: { x: 1200, y: 700, angle: 0, hp: 100, speed: 0, inCar: false, hasGun: false, ammo: 0, punchCd: 0, shootCd: 0, invuln: 0 },
  playerCar: null, parked: [], traffic: [], peds: [], police: [], enemies: [],
  heli: null, bullets: [], enemyBullets: [], effects: [], pickups: [],
  mission: { index: 0, def: null, step: 0, timer: 0, active: false, dialogue: '', dialogueT: 0, nextReady: true },
  taxi: { active: false, ped: null, dest: null, timer: 0, fare: 0 },
  race: { active: false, point: 0, timer: 0 },
  ally: null, sportsCar: null,
  logLines: [], deathReason: '',
  city: null, camera: makeCamera(), input: makeInput(canvas), audio: makeAudio(),
  saveExists: false,
};

G.city = buildCity(SEED);
spawnTraffic(G, 14);
spawnParkedCars(G);
spawnPedestrians(G, 30);
G.camera.snap(G.player.x, G.player.y, canvas.width, canvas.height, WORLD_W, WORLD_H);
G.saveExists = hasSave();

G.log = (text) => {
  G.logLines.push({ text, t: 6 });
  if (G.logLines.length > 6) G.logLines.shift();
  if (statusEl) statusEl.textContent = text;
};
G.addCash = (n) => addCash(G, n);
G.addWanted = (n, why) => {
  if (n <= 0) return;
  G.wanted = clamp(G.wanted + n, 0, 5);
  G.wantedT = 0;
  if (why) G.log(why + '，通缉 +' + n);
};
G.setWanted = (n) => { G.wanted = clamp(n, 0, 5); G.wantedT = 0; };
G.damagePlayer = (n, why) => {
  if (G.player.invuln > 0 || G.state !== 'play') return;
  G.player.hp -= n;
  G.player.invuln = 0.3;
  if (Math.random() < 0.3) G.audio.sfx('hurt');
  if (G.player.hp <= 0) {
    G.player.hp = 0;
    G.state = 'over';
    G.deathReason = why ? '死因：' + why : '霓虹湾的夜还很长……';
    G.audio.sfx('fail');
  }
};
G.healPlayer = (n) => { G.player.hp = clamp(G.player.hp + n, 0, 100); };
G.onEnemyDown = (e) => {
  if (G.mission && G.mission.active) G.mission.guardsDown = (G.mission.guardsDown || 0) + 1;
  G.log('打倒了' + e.name + '！');
  addCash(G, 40);
  G.audio.sfx('win');
};

function resetGame() {
  G.money = 150; G.completedMissions = 0; G.packagesFound = 0; G.gameComplete = false;
  G.wanted = 0; G.wantedT = 0; G.clock = 9.0;
  G.player = { x: 1200, y: 700, angle: 0, hp: 100, speed: 0, inCar: false, hasGun: false, ammo: 0, punchCd: 0, shootCd: 0, invuln: 0 };
  G.playerCar = null; G.police = []; G.enemies = []; G.heli = null;
  G.bullets = []; G.enemyBullets = []; G.effects = []; G.pickups = [];
  G.mission = { index: 0, def: null, step: 0, timer: 0, active: false, dialogue: '', dialogueT: 0, nextReady: true };
  G.taxi = { active: false, ped: null, dest: null, timer: 0, fare: 0 };
  G.race = { active: false, point: 0, timer: 0 };
  G.ally = null; G.logLines = [];
  G.city = buildCity(SEED);
  G.parked = []; G.traffic = []; G.peds = [];
  spawnTraffic(G, 14); spawnParkedCars(G); spawnPedestrians(G, 30);
  G.camera.snap(G.player.x, G.player.y, canvas.width, canvas.height, WORLD_W, WORLD_H);
  G.state = 'play';
  G.log('欢迎来到霓虹湾！按 M 开始第一个任务');
  G.audio.ensure(); G.audio.startMusic();
}

function update(dt) {
  G.time += dt;
  G.clock = (G.clock + dt * 0.12) % 24; // a full day in ~3.3 minutes
  G.night = G.clock < 6 || G.clock >= 18;
  for (const l of G.logLines) l.t -= dt;
  G.logLines = G.logLines.filter((l) => l.t > 0);
  for (const e of G.effects) e.t -= dt;
  G.effects = G.effects.filter((e) => e.t > 0);
  if (G.player.punchCd > 0) G.player.punchCd -= dt;
  if (G.player.shootCd > 0) G.player.shootCd -= dt;
  if (G.player.invuln > 0) G.player.invuln -= dt;

  const input = G.input;
  // Consume a press the first time it is read, so several fixed steps in one
  // frame never act on the same keypress twice (enter+exit a car, say).
  const consume = (c) => {
    const v = input.wasPressed(c);
    if (v) input.pressed[c] = false;
    return v;
  };
  // --- On-foot movement ---
  if (!G.player.inCar) {
    let mx = 0, my = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) my -= 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) my += 1;
    if (input.isDown('KeyA') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const sp = 190;
      const nx = G.player.x + (mx / len) * sp * dt;
      const ny = G.player.y + (my / len) * sp * dt;
      G.player.angle = Math.atan2(my, mx);
      const hit = collidePlayer(nx, ny);
      G.player.x = hit.x; G.player.y = hit.y;
    }
    // Face the mouse when aiming with a gun.
    if (G.player.hasGun) {
      const wx = G.camera.x + input.mouseX, wy = G.camera.y + input.mouseY;
      if (dist(wx, wy, G.player.x, G.player.y) > 30) G.player.angle = Math.atan2(wy - G.player.y, wx - G.player.x);
    }
  } else {
    updatePlayerCar(G, dt, input);
    // A wrecked car strands the player: eject them so they are never stuck.
    if (G.playerCar && G.playerCar.hp <= 0) {
      G.log('车子彻底报废了！你爬了出来');
      exitCar(G);
    }
  }

  // Enter / exit car
  if (consume('KeyE')) {
    if (G.player.inCar) exitCar(G);
    else {
      const shop = nearestShop(G, 70);
      if (shop) useShop(G, shop);
      else {
        const car = nearestCar(G, G.player.x, G.player.y, 60);
        if (car) enterCar(G, car);
        else G.log('附近没有车，也没有商店');
      }
    }
  }
  // Punch / handbrake
  if (consume('Space') && !G.player.inCar) playerPunch(G);
  // Shoot
  if ((consume('KeyF') || input.mouseClicked) && !G.player.inCar) {
    const wx = G.camera.x + input.mouseX, wy = G.camera.y + input.mouseY;
    playerShoot(G, wx, wy);
    input.mouseClicked = false;
  }
  // Mission start / retry
  if (consume('KeyM')) {
    if (G.mission && G.mission.active) G.log('任务进行中：' + G.mission.def.title);
    else if (G.completedMissions < MISSION_DEFS.length) startMission(G, G.completedMissions);
    else G.log('全部主线任务已完成！');
  }
  // Race (C) and radio toggle (R).
  if (consume('KeyC')) startRace(G);
  if (consume('KeyR')) {
    const on = G.audio.toggleRadio();
    G.log(on ? '电台打开：霓虹电波 FM' : '电台关闭');
  }
  // Pause
  if (consume('KeyP')) {
    G.state = 'pause';
    G.audio.sfx('click');
  }

  updateTraffic(G, dt);
  updatePedestrians(G, dt);
  updatePolice(G, dt);
  updateBullets(G, dt);
  updateEnemies(G, dt);
  updateMission(G, dt);
  updateTaxi(G, dt);
  updateRace(G, dt);
  checkPackages(G);
  checkCashPickups(G);

  // Wanted decay: hide in safehouse area or lay low.
  if (G.wanted > 0) {
    G.wantedT += dt;
    const nearHideout = dist(G.player.x, G.player.y, 614, 2200) < 160;
    const decay = nearHideout ? 1 / 8 : 1 / 45;
    if (G.wantedT > 1 / decay && Math.random() < dt * decay * 2) {
      G.wanted -= 1; G.wantedT = 0;
      G.log('风头过去了，通缉 -1');
    }
  }
  // Ally follows the player after rescue.
  if (G.ally && G.ally.active) {
    const d = dist(G.ally.x, G.ally.y, G.player.x, G.player.y);
    if (d > 60) {
      const a = Math.atan2(G.player.y - G.ally.y, G.player.x - G.ally.x);
      G.ally.x += Math.cos(a) * 150 * dt;
      G.ally.y += Math.sin(a) * 150 * dt;
    }
  }
  G.camera.follow(G.player.x, G.player.y, canvas.width, canvas.height, WORLD_W, WORLD_H);
}

function collidePlayer(nx, ny) {
  return collidePoint(nx, ny);
}

function collidePoint(x, y) {
  let px = x, py = y;
  const r = 12;
  for (const b of G.city.buildings) {
    const hit = pushOutCircleRect(px, py, r, b.x, b.y, b.w, b.h);
    if (hit) { px = hit.x; py = hit.y; }
  }
  for (const L of G.city.landmarks) {
    if (L.id === 'yacht') continue;
    const hit = pushOutCircleRect(px, py, r, L.x, L.y, L.w, L.h);
    if (hit) { px = hit.x; py = hit.y; }
  }
  if (inRiver(px, py) || isWater(px, py)) {
    if (px < 1780 + 80) px = 1780 - r; else px = 1780 + 160 + r;
    if (x > 3520) px = 3520 - r;
  }
  return { x: clamp(px, 20, WORLD_W - 20), y: clamp(py, 20, WORLD_H - 20) };
}

function render() {
  const cam = G.camera;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCity(ctx, G.city, cam, G.time, G.night);
  // Mission marker under entities.
  if (G.state === 'play' || G.state === 'pause') drawMissionMarker(ctx, G, cam);
  drawEconomy(ctx, G, cam);
  for (const c of G.parked) drawCar(ctx, c, cam, G.night);
  for (const c of G.traffic) drawCar(ctx, c, cam, G.night);
  if (G.playerCar) drawCar(ctx, G.playerCar, cam, G.night);
  for (const c of G.police) drawCar(ctx, c, cam, G.night);
  drawPeople(ctx, G, cam);
  drawCombat(ctx, G, cam);
  drawPlayer(ctx);
  // Night overlay: darkness + neon glow.
  if (G.night) {
    ctx.fillStyle = 'rgba(8,8,40,0.34)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (G.state === 'title') drawTitle(ctx, G);
  else if (G.state === 'play') drawHUD(ctx, G);
  else if (G.state === 'pause') { drawHUD(ctx, G); drawPause(ctx, G); }
  else if (G.state === 'over') drawGameOver(ctx, G);
  else if (G.state === 'complete') drawComplete(ctx, G);
}

function drawPlayer(ctx2) {
  const cam = G.camera;
  if (G.player.inCar) return;
  const x = -cam.x + G.player.x, y = -cam.y + G.player.y;
  ctx2.save();
  ctx2.translate(x, y);
  ctx2.rotate(G.player.angle);
  ctx2.fillStyle = 'rgba(0,0,0,0.35)';
  ctx2.beginPath(); ctx2.ellipse(2, 3, 11, 9, 0, 0, Math.PI * 2); ctx2.fill();
  // 阿岩：red jacket, dark jeans.
  ctx2.fillStyle = '#e63946';
  ctx2.beginPath(); ctx2.arc(0, 0, 11, 0, Math.PI * 2); ctx2.fill();
  ctx2.fillStyle = '#f2c89b';
  ctx2.beginPath(); ctx2.arc(6, 0, 6, 0, Math.PI * 2); ctx2.fill();
  ctx2.fillStyle = '#222';
  ctx2.fillRect(-4, -6, 8, 12);
  if (G.player.hasGun) {
    ctx2.fillStyle = '#111';
    ctx2.fillRect(8, -2, 12, 4);
  }
  ctx2.restore();
  // Name tag
  ctx2.fillStyle = '#fff'; ctx2.font = 'bold 11px sans-serif'; ctx2.textAlign = 'center';
  ctx2.fillText('阿岩', x, y - 20);
  ctx2.textAlign = 'left';
}

// --- Input on menus ---
function handleMenuKeys() {
  const input = G.input;
  if (G.state === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter')) { resetGame(); return; }
    if (input.wasPressed('KeyM')) { resetGame(); startMission(G, G.completedMissions); return; }
    if (input.wasPressed('KeyL') && G.saveExists) {
      resetGame();
      if (loadGame(G)) { G.camera.snap(G.player.x, G.player.y, canvas.width, canvas.height, WORLD_W, WORLD_H); }
      return;
    }
  } else if (G.state === 'pause') {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) { G.state = 'play'; return; }
    if (input.wasPressed('KeyS')) { saveGame(G); return; }
    if (input.wasPressed('KeyQ')) { G.state = 'title'; G.saveExists = hasSave(); return; }
  } else if (G.state === 'over' || G.state === 'complete') {
    if (input.wasPressed('Enter') || input.wasPressed('NumpadEnter')) { resetGame(); return; }
  }
}

// --- Main loop ---
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;
  if (G.state === 'play') {
    acc += dt;
    while (acc >= STEP) { update(STEP); acc -= STEP; }
  } else {
    G.time += dt;
    handleMenuKeys();
    if (G.state === 'title') {
      // Slow cinematic pan over the city on the title screen.
      G.camera.x = 600 + Math.sin(G.time * 0.05) * 300;
      G.camera.y = 500 + Math.cos(G.time * 0.04) * 200;
    }
  }
  render();
  G.input.endFrame();
}

// Debug/test handle (read-only state for playtesting).
window.__neonbay = G;

// Screenshot staging: freeze a staged scene, paint it, signal readiness.
if (shotName) {
  applyShot(G, shotName);
  G.camera.snap(G.player.x, G.player.y, canvas.width, canvas.height, WORLD_W, WORLD_H);
  // Let the world settle a few steps so traffic/police/heli are in frame.
  for (let i = 0; i < 30; i++) {
    if (G.state === 'play') update(STEP);
    else G.time += STEP;
  }
  render();
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
