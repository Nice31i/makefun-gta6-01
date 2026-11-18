// vehicles.js — cars, player driving physics, car theft, AI traffic.

import { clamp, dist, angDiff, mulberry32, pushOutCircleRect } from './engine.js';
import { WORLD_W, WORLD_H, ROAD, BRIDGES, RIVER_X, RIVER_W, isOnBridge, inRiver, isWater } from './city.js';

export const CAR_COLORS = ['#e63946', '#2a9d8f', '#f4d35e', '#4361ee', '#f72585', '#adb5bd', '#ff8500', '#06d6a0'];
export const CAR_MODELS = [
  { name: '小面包', len: 44, w: 22, top: 150, accel: 170, price: 0 },
  { name: '出租车', len: 46, w: 22, top: 185, accel: 210, price: 0 },
  { name: '轿车', len: 48, w: 22, top: 200, accel: 230, price: 0 },
  { name: '跑车', len: 50, w: 23, top: 280, accel: 320, price: 0 },
  { name: '货车', len: 58, w: 26, top: 140, accel: 140, price: 0 },
  { name: '警车', len: 48, w: 22, top: 240, accel: 300, price: 0 },
];

export function makeCar(x, y, angle, modelIdx, color, opts = {}) {
  const m = CAR_MODELS[modelIdx % CAR_MODELS.length];
  return {
    x, y, angle, speed: 0, model: m, modelIdx, color,
    hp: 100, maxHp: 100, driver: opts.driver || 'traffic',
    stolen: false, isPlayer: false, isPolice: !!opts.police,
    targetAngle: angle, stuck: 0, honk: 0, brakeLight: false,
    special: opts.special || null, // 'sports' | 'taxi' | null
  };
}

export function spawnTraffic(G, n) {
  const rnd = mulberry32(G.city.seed + 77);
  G.traffic = [];
  for (let i = 0; i < n; i++) {
    const gx = 1 + Math.floor(rnd() * (WORLD_W / ROAD - 2));
    const gy = 1 + Math.floor(rnd() * (WORLD_H / ROAD - 2));
    const x = gx * ROAD, y = gy * ROAD;
    if (x > RIVER_X - 100 && x < RIVER_X + RIVER_W + 100 && !isOnBridge(x, y)) continue;
    const horiz = rnd() < 0.5;
    const car = makeCar(x, y, horiz ? (rnd() < 0.5 ? 0 : Math.PI) : (rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
      Math.floor(rnd() * 5), CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)]);
    car.speed = 60 + rnd() * 60;
    G.traffic.push(car);
  }
}

export function spawnParkedCars(G) {
  const rnd = mulberry32(G.city.seed + 31);
  G.parked = [];
  const spots = [
    { x: 614, y: 700, model: 1 }, { x: 814, y: 900, model: 2 }, { x: 1214, y: 700, model: 0 },
    { x: 1614, y: 1500, model: 2 }, { x: 2214, y: 700, model: 4 }, { x: 2614, y: 1500, model: 2 },
    { x: 614, y: 2100, model: 0 }, { x: 1014, y: 2300, model: 1 }, { x: 2814, y: 1000, model: 2 },
    { x: 3214, y: 1500, model: 4 }, { x: 414, y: 1100, model: 2 }, { x: 2014, y: 1900, model: 1 },
  ];
  for (const s of spots) {
    // Spots sit on vertical roads, so park facing along the road.
    const car = makeCar(s.x, s.y, rnd() < 0.5 ? Math.PI / 2 : -Math.PI / 2, s.model, CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)], { driver: 'parked' });
    G.parked.push(car);
  }
  // 金爷的限量跑车停在别墅门口的路上 (mission 2 target).
  const sports = makeCar(2814, 1840, Math.PI / 2, 3, '#ffd700', { driver: 'parked', special: 'sports' });
  G.parked.push(sports);
  G.sportsCar = sports;
}

// Collision against buildings / water for a point with radius r.
export function collideWorld(G, x, y, r) {
  let px = x, py = y;
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
    // Bounce back toward the nearest bank / bridge.
    if (px < RIVER_X + RIVER_W / 2) px = RIVER_X - r; else px = RIVER_X + RIVER_W + r;
    if (x > 3520) px = 3520 - r;
  }
  px = clamp(px, 20, WORLD_W - 20); py = clamp(py, 20, WORLD_H - 20);
  return { x: px, y: py };
}

export function nearestCar(G, x, y, maxD) {
  let best = null, bd = maxD;
  const all = [...G.parked, ...G.traffic];
  if (G.playerCar) all.push(G.playerCar);
  for (const c of all) {
    if (c.isPlayer) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

export function enterCar(G, car) {
  if (car.driver === 'parked' || car.driver === 'traffic') {
    if (!car.stolen) {
      car.stolen = true;
      G.addWanted(1, '偷车');
      G.addCash(0);
      G.log('你撬开了车门，偷走了这辆' + car.model.name + '！通缉+1');
      G.audio.sfx('steal');
    }
  }
  car.isPlayer = true;
  car.driver = 'player';
  G.playerCar = car;
  G.player.inCar = true;
  G.player.x = car.x; G.player.y = car.y;
  const i = G.parked.indexOf(car); if (i >= 0) G.parked.splice(i, 1);
  const j = G.traffic.indexOf(car); if (j >= 0) G.traffic.splice(j, 1);
  G.audio.sfx('door');
}

export function exitCar(G) {
  const car = G.playerCar;
  if (!car) return;
  car.isPlayer = false;
  car.speed = 0;
  G.player.inCar = false;
  G.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  G.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  G.player.angle = car.angle;
  G.parked.push(car);
  G.playerCar = null;
  G.audio.sfx('door');
}

export function updatePlayerCar(G, dt, input) {
  const car = G.playerCar;
  if (!car) return;
  const m = car.model;
  const fwd = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 0.7 : 0);
  const steer = (input.isDown('KeyA') || input.isDown('ArrowLeft') ? -1 : 0) + (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0);
  const handbrake = input.isDown('Space');
  if (fwd > 0) car.speed += m.accel * fwd * dt;
  else if (fwd < 0) car.speed += m.accel * fwd * dt * 0.8;
  else car.speed *= Math.pow(0.4, dt);
  if (handbrake) car.speed *= Math.pow(0.05, dt);
  car.speed = clamp(car.speed, -m.top * 0.45, m.top);
  const dir = car.speed >= 0 ? 1 : -1;
  car.angle += steer * 1.9 * dt * dir * clamp(Math.abs(car.speed) / 60, 0, 1);
  car.brakeLight = fwd < 0 || handbrake;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  const hit = collideWorld(G, nx, ny, 20);
  car.x = hit.x; car.y = hit.y;
  if (dist(hit.x, hit.y, nx, ny) > 2 && Math.abs(car.speed) > 60) {
    car.hp -= Math.abs(car.speed) * 0.02 * dt * 10;
    car.speed *= 0.4;
    G.audio.sfx('crash');
    if (Math.abs(car.speed) > 40) G.addWanted(0, '');
    if (car.hp <= 0) { car.hp = 0; G.log('车子报废了！'); G.audio.sfx('crash'); }
  }
  G.player.x = car.x; G.player.y = car.y; G.player.angle = car.angle;
  if (car.hp <= 0) car.speed = 0;
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    // Follow roads: keep moving along current axis, turn at intersections.
    const speed = 70 + (car.modelIdx * 8);
    const nx = car.x + Math.cos(car.angle) * speed * dt;
    const ny = car.y + Math.sin(car.angle) * speed * dt;
    const onInt = (Math.abs(((nx % ROAD) + ROAD) % ROAD) < 26 || Math.abs(((ny % ROAD) + ROAD) % ROAD) < 26);
    if (onInt && Math.random() < dt * 0.6) {
      const turn = (Math.random() - 0.5) * Math.PI;
      car.targetAngle = car.angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) * (Math.random() < 0.7 ? 1 : 0);
      if (Math.random() < 0.3) car.targetAngle = car.angle + Math.PI;
    }
    car.angle += angDiff(car.targetAngle, car.angle) * Math.min(1, dt * 3);
    // Avoid river: if next step is water and not on a bridge, turn around.
    if (inRiver(nx, ny)) { car.targetAngle = car.angle + Math.PI; car.angle = car.targetAngle; continue; }
    const hit = collideWorld(G, nx, ny, 18);
    car.x = hit.x; car.y = hit.y;
    // Avoid the player car: slow down if close ahead.
    if (G.playerCar && dist(car.x, car.y, G.playerCar.x, G.playerCar.y) < 70) {
      car.x -= Math.cos(car.angle) * speed * dt * 0.8;
      car.y -= Math.sin(car.angle) * speed * dt * 0.8;
    }
  }
  // Keep traffic count up.
  if (G.traffic.length < 10 && Math.random() < dt * 0.2) {
    const rnd = Math.random;
    const gx = 1 + Math.floor(rnd() * 16), gy = 1 + Math.floor(rnd() * 11);
    const car = makeCar(gx * ROAD, gy * ROAD, Math.PI / 2 * Math.floor(rnd() * 4), Math.floor(rnd() * 5), CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)]);
    G.traffic.push(car);
  }
}

export function drawCar(ctx, car, cam, night) {
  const ox = -cam.x, oy = -cam.y;
  ctx.save();
  ctx.translate(ox + car.x, oy + car.y);
  ctx.rotate(car.angle);
  const m = car.model, L = m.len, W = m.w;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -W / 2, L, W, 7);
  ctx.fill();
  // cabin + windows
  ctx.fillStyle = '#1b2a3a';
  ctx.beginPath(); ctx.roundRect(-L / 6, -W / 2 + 4, L / 3, W - 8, 4); ctx.fill();
  // headlights
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(L / 2 - 3, -W / 2 + 3, 4, 5);
  ctx.fillRect(L / 2 - 3, W / 2 - 8, 4, 5);
  ctx.fillStyle = '#ff2222';
  ctx.fillRect(-L / 2, -W / 2 + 3, 4, 5);
  ctx.fillRect(-L / 2, W / 2 - 8, 4, 5);
  if (car.isPolice) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-L / 4, -W / 2, L / 2, W);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('警', 0, 3);
  }
  if (car.special === 'sports') {
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.strokeRect(-L / 2 - 2, -W / 2 - 2, L + 4, W + 4);
  }
  ctx.restore();
  // Headlight beams at night
  if (night && car.speed > 5) {
    ctx.save();
    ctx.translate(ox + car.x, oy + car.y);
    ctx.rotate(car.angle);
    const grad = ctx.createLinearGradient(0, 0, 190, 0);
    grad.addColorStop(0, 'rgba(255,244,180,0.28)');
    grad.addColorStop(1, 'rgba(255,244,180,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(20, -8); ctx.lineTo(200, -42); ctx.lineTo(200, 42); ctx.lineTo(20, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // Damage smoke
  if (car.hp < 45) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath(); ctx.arc(ox + car.x + (Math.random() - 0.5) * 10, oy + car.y + (Math.random() - 0.5) * 10, 8 + Math.random() * 6, 0, Math.PI * 2); ctx.fill();
  }
}
