// people.js — pedestrians, police AI, police helicopter.
// Original characters: 阿岩 (player), 苏晴 (ally driver), 肥波 (fixer), 金爷 (boss).

import { clamp, dist, angDiff, mulberry32 } from './engine.js';
import { WORLD_W, WORLD_H, ROAD, RIVER_X, RIVER_W, isOnBridge, inRiver } from './city.js';
import { makeCar, collideWorld, CAR_COLORS } from './vehicles.js';

const PED_COLORS = ['#e63946', '#2a9d8f', '#f4d35e', '#4361ee', '#f72585', '#ff8500', '#06d6a0', '#e0aaff'];
const PED_NAMES = ['路人', '学生', '渔民', '白领', '游客', '大爷', '外卖员', '夜市摊主'];

export function spawnPedestrians(G, n) {
  const rnd = mulberry32(G.city.seed + 55);
  G.peds = [];
  for (let i = 0; i < n; i++) {
    const x = 120 + rnd() * (WORLD_W - 240);
    const y = 120 + rnd() * (WORLD_H - 240);
    if (inRiver(x, y)) continue;
    G.peds.push({
      x, y, angle: rnd() * Math.PI * 2, speed: 28 + rnd() * 30,
      color: PED_COLORS[Math.floor(rnd() * PED_COLORS.length)],
      name: PED_NAMES[Math.floor(rnd() * PED_NAMES.length)],
      state: 'walk', panic: 0, hp: 30, wanderT: 1 + rnd() * 3,
      isTaxi: false, isTarget: false,
    });
  }
}

export function updatePedestrians(G, dt) {
  for (const p of G.peds) {
    p.wanderT -= dt;
    if (p.panic > 0) {
      p.panic -= dt;
      const away = Math.atan2(p.y - G.player.y, p.x - G.player.x);
      p.x += Math.cos(away) * 95 * dt;
      p.y += Math.sin(away) * 95 * dt;
      p.angle = away;
    } else if (p.wanderT <= 0) {
      p.wanderT = 2 + Math.random() * 4;
      p.angle = Math.random() * Math.PI * 2;
    } else {
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
    }
    const hit = collideWorld(G, p.x, p.y, 10);
    p.x = hit.x; p.y = hit.y;
    if (p.x < 30 || p.x > WORLD_W - 30 || p.y < 30 || p.y > WORLD_H - 30) p.angle += Math.PI;
  }
  // Keep the crowd up.
  if (G.peds.length < 24 && Math.random() < dt * 0.3) {
    const x = clamp(G.player.x + (Math.random() - 0.5) * 900, 60, WORLD_W - 60);
    const y = clamp(G.player.y + (Math.random() - 0.5) * 700, 60, WORLD_H - 60);
    if (!inRiver(x, y)) G.peds.push({ x, y, angle: Math.random() * 6, speed: 30, color: PED_COLORS[0], name: '路人', state: 'walk', panic: 0, hp: 30, wanderT: 2, isTaxi: false, isTarget: false });
  }
}

export function spawnPolice(G, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = 500 + Math.random() * 300;
    let x = clamp(G.player.x + Math.cos(a) * d, 80, WORLD_W - 80);
    let y = clamp(G.player.y + Math.sin(a) * d, 80, WORLD_H - 80);
    // Never spawn inside a building: snap out of any collision first.
    const fixed = collideWorld(G, x, y, 20);
    x = fixed.x; y = fixed.y;
    const car = makeCar(x, y, 0, 5, '#1b4fd8', { police: true, driver: 'police' });
    car.color = '#e8e8e8';
    G.police.push(car);
  }
  G.audio.sfx('siren');
}

export function updatePolice(G, dt) {
  const wanted = G.wanted;
  const wantCount = wanted === 0 ? 0 : wanted <= 2 ? 1 : wanted === 3 ? 2 : wanted === 4 ? 3 : 4;
  // Spawn / despawn to match wanted level.
  if (G.police.length < wantCount && Math.random() < dt * 0.8) spawnPolice(G, 1);
  if (G.police.length > wantCount) G.police.pop();
  for (const car of G.police) {
    const d = dist(car.x, car.y, G.player.x, G.player.y);
    const target = Math.atan2(G.player.y - car.y, G.player.x - car.x);
    car.angle += angDiff(target, car.angle) * Math.min(1, dt * 2.2);
    const speed = Math.min(260, 150 + wanted * 25);
    car.speed = d > 40 ? speed : 0;
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const hit = collideWorld(G, nx, ny, 18);
    car.x = hit.x; car.y = hit.y;
    car.sirenT = (car.sirenT || 0) + dt;
    // Ram the player: damage on contact.
    if (d < 46) {
      if (G.playerCar) {
        G.playerCar.hp -= 18 * dt;
        G.playerCar.speed *= 0.9;
        if (Math.random() < dt * 2) G.audio.sfx('crash');
      } else if (!G.player.invuln) {
        G.damagePlayer(12 * dt, '警察撞击');
      }
    }
    // Police shoot at high wanted.
    if (wanted >= 3 && d < 420 && Math.random() < dt * 0.7) {
      G.enemyBullets.push({ x: car.x, y: car.y, vx: Math.cos(target) * 520, vy: Math.sin(target) * 520, life: 1.2, from: 'police' });
      G.audio.sfx('shoot');
    }
  }
  // Helicopter at 4+ stars.
  if (wanted >= 4) {
    if (!G.heli) {
      G.heli = { x: G.player.x - 300, y: G.player.y - 300, angle: 0, orbit: 0, shootT: 0 };
      G.log('警用直升机升空了！甩掉它！');
      G.audio.sfx('heli');
    }
    const h = G.heli;
    h.orbit += dt * 0.5;
    const tx = G.player.x + Math.cos(h.orbit) * 240;
    const ty = G.player.y + Math.sin(h.orbit) * 240;
    h.x += (tx - h.x) * Math.min(1, dt * 1.5);
    h.y += (ty - h.y) * Math.min(1, dt * 1.5);
    h.angle = Math.atan2(G.player.y - h.y, G.player.x - h.x);
    h.shootT -= dt;
    if (h.shootT <= 0 && dist(h.x, h.y, G.player.x, G.player.y) < 420) {
      h.shootT = 1.6;
      for (let i = 0; i < 3; i++) {
        const a = h.angle + (Math.random() - 0.5) * 0.3;
        G.enemyBullets.push({ x: h.x, y: h.y + 20, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480, life: 1.4, from: 'heli' });
      }
      G.audio.sfx('shoot');
    }
  } else if (G.heli) {
    G.heli = null;
  }
}

export function drawPeople(ctx, G, cam) {
  const ox = -cam.x, oy = -cam.y;
  for (const p of G.peds) {
    if (p.x < cam.x - 40 || p.x > cam.x + ctx.canvas.width + 40 || p.y < cam.y - 40 || p.y > cam.y + ctx.canvas.height + 40) continue;
    ctx.save();
    ctx.translate(ox + p.x, oy + p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(2, 3, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(4, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (p.isTaxi) {
      ctx.fillStyle = '#ffe600'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('￥ 打车', ox + p.x, oy + p.y - 16);
    }
  }
  // 苏晴 ally marker
  if (G.ally && G.ally.active) {
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath(); ctx.arc(ox + G.ally.x, oy + G.ally.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('晴', ox + G.ally.x, oy + G.ally.y + 4);
    ctx.fillStyle = '#2ec4b6';
    ctx.fillText('苏晴', ox + G.ally.x, oy + G.ally.y - 18);
  }
  // Helicopter
  if (G.heli) {
    const h = G.heli;
    ctx.save();
    ctx.translate(ox + h.x, oy + h.y - 30);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(4, 8, 34, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(h.angle);
    ctx.fillStyle = '#222';
    ctx.fillRect(-30, -3, 60, 6);
    ctx.fillStyle = '#dfe8ff';
    ctx.beginPath(); ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b4fd8';
    ctx.fillRect(-8, -6, 16, 12);
    ctx.restore();
    // Searchlight
    ctx.save();
    ctx.translate(ox + h.x, oy + h.y);
    const grad = ctx.createLinearGradient(0, 0, G.player.x - h.x, G.player.y - h.y);
    grad.addColorStop(0, 'rgba(255,255,200,0.25)');
    grad.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(G.player.x - h.x - 30, G.player.y - h.y - 30);
    ctx.lineTo(G.player.x - h.x + 30, G.player.y - h.y + 30);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
