// city.js — procedural Neon Bay: river, 3 bridges, 5 districts, roads, buildings, shops.
// Fixed seed so every run builds the same city.

import { mulberry32 } from './engine.js';

export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const RIVER_X = 1780;      // river runs north-south
export const RIVER_W = 160;
export const BRIDGES = [
  { y: 380, name: '彩虹桥' },
  { y: 1240, name: '海湾大桥' },
  { y: 2080, name: '渔火桥' },
];
export const ROAD = 200; // grid spacing

export const DISTRICTS = [
  { name: '霓虹 downtown', cn: '霓虹中心', x: 300, y: 200, w: 1200, h: 1000, color: '#ff2e88', desc: '霓虹塔林' },
  { name: '港口工业区', cn: '港口工业区', x: 2100, y: 300, w: 1200, h: 900, color: '#ff9f1c', desc: '码头与仓库' },
  { name: '大学城', cn: '大学城', x: 300, y: 1400, w: 1200, h: 900, color: '#2ec4b6', desc: '校园与书店街' },
  { name: '富人山庄', cn: '富人山庄', x: 2100, y: 1500, w: 1200, h: 800, color: '#e0aaff', desc: '山坡别墅' },
  { name: '老街', cn: '老街', x: 900, y: 900, w: 900, h: 700, color: '#ffd166', desc: '旧城小巷' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) return d;
  return DISTRICTS[0];
}

export function buildCity(seed) {
  const rnd = mulberry32(seed);
  const buildings = [];
  const trees = [];
  const neonSigns = [];
  // Grid blocks: skip roads, river and bridge decks.
  for (let gx = 0; gx < WORLD_W / ROAD; gx++) {
    for (let gy = 0; gy < WORLD_H / ROAD; gy++) {
      const bx = gx * ROAD + 34, by = gy * ROAD + 34;
      const bw = ROAD - 68, bh = ROAD - 68;
      const cx = bx + bw / 2, cy = by + bh / 2;
      if (cx > RIVER_X - 60 && cx < RIVER_X + RIVER_W + 60) continue; // river strip
      if (rnd() < 0.12) { // plaza / park block
        for (let i = 0; i < 5; i++) trees.push({ x: bx + rnd() * bw, y: by + rnd() * bh, r: 8 + rnd() * 10 });
        continue;
      }
      const d = districtAt(cx, cy);
      const tall = d.cn === '霓虹中心' || d.cn === '港口工业区';
      const h = tall ? 30 + rnd() * 90 : 14 + rnd() * 26;
      const hue = d.cn === '霓虹中心' ? [300 + rnd() * 60, 180 + rnd() * 60] : null;
      buildings.push({
        x: bx, y: by, w: bw, h: bh, height: h, district: d.cn,
        color: hue ? `hsl(${hue[0]},70%,${hue[1] / 4}%)` : pickFacade(rnd, d.cn),
        roof: `hsl(${Math.floor(rnd() * 360)},30%,${22 + rnd() * 14}%)`,
        neon: d.cn === '霓虹中心' ? ['#ff2e88', '#00e5ff', '#ffe600', '#7b2fff'][Math.floor(rnd() * 4)] : null,
      });
      if (d.cn === '霓虹中心' && rnd() < 0.8) {
        neonSigns.push({ x: bx + bw / 2, y: by - 6, text: ['夜市', 'KTV', '网吧', '火锅', '电玩', '酒吧'][Math.floor(rnd() * 6)], color: buildings[buildings.length - 1].neon });
      }
      if (rnd() < 0.5) trees.push({ x: bx - 14, y: by + rnd() * bh, r: 7 + rnd() * 6 });
    }
  }
  // Fixed landmark buildings (named, hand-placed).
  const landmarks = [
    { id: 'bank', name: '霓虹银行', x: 980, y: 420, w: 150, h: 110 },
    { id: 'warehouse', name: '肥波的仓库', x: 2380, y: 560, w: 220, h: 150 },
    { id: 'villa', name: '金爷别墅', x: 2680, y: 1680, w: 200, h: 140 },
    { id: 'yacht', name: '金爷的游艇', x: 3420, y: 300, w: 90, h: 70 },
    { id: 'campus', name: '海湾大学', x: 560, y: 1680, w: 240, h: 150 },
  ];
  // Shops (drive-up spots on roads).
  const shops = [
    { id: 'repair', kind: 'repair', name: '阿强修车铺', x: 814, y: 1000, price: 60 },
    { id: 'paint', kind: 'paint', name: '彩虹喷漆房', x: 2414, y: 1120, price: 120 },
    { id: 'weapon', kind: 'weapon', name: '老陈五金·武器', x: 1214, y: 1740, price: 0 },
    { id: 'taxi', kind: 'taxi', name: '出租车站', x: 620, y: 620, price: 0 },
    { id: 'garage', kind: 'garage', name: '肥波的车库', x: 1614, y: 900, price: 0 },
    { id: 'hideout', kind: 'hideout', name: '安全屋', x: 614, y: 2200, price: 0 },
  ];
  // Hidden packages scattered in alleys and rooftops corners.
  const packages = [
    { x: 420, y: 460, taken: false }, { x: 1560, y: 700, taken: false },
    { x: 2200, y: 980, taken: false }, { x: 3300, y: 700, taken: false },
    { x: 700, y: 1900, taken: false }, { x: 1400, y: 2300, taken: false },
    { x: 2600, y: 2100, taken: false }, { x: 3300, y: 1800, taken: false },
  ];
  return { seed, buildings, trees, neonSigns, landmarks, shops, packages, rnd };
}

function pickFacade(rnd, district) {
  const palettes = {
    '港口工业区': ['#5a4a3a', '#6b5b4a', '#4a4a52', '#7a6a55'],
    '大学城': ['#3a5a6b', '#4a6b5a', '#5b4a6b', '#6b5a4a'],
    '富人山庄': ['#e8dcc8', '#d8c8b8', '#c8d8e8', '#e8c8c8'],
    '老街': ['#8a6a4a', '#7a5a3a', '#9a7a55', '#6b4a3a'],
  };
  const p = palettes[district] || ['#4a4a5a', '#5a5a6a'];
  return p[Math.floor(rnd() * p.length)];
}

export function isOnBridge(x, y) {
  if (x < RIVER_X - 10 || x > RIVER_X + RIVER_W + 10) return false;
  return BRIDGES.some((b) => Math.abs(y - b.y) < 55);
}
export function inRiver(x, y) {
  return x > RIVER_X && x < RIVER_X + RIVER_W && !isOnBridge(x, y);
}
export function isWater(x, y) {
  if (inRiver(x, y)) return true;
  return x > 3520; // deep east bay; the beach strip 3380-3520 is walkable
}
// Road check: near a grid line.
export function onRoad(x, y) {
  const mx = ((x % ROAD) + ROAD) % ROAD, my = ((y % ROAD) + ROAD) % ROAD;
  return mx < 40 || mx > ROAD - 40 || my < 40 || my > ROAD - 40;
}

export function drawCity(ctx, city, cam, time, night) {
  const { x: cx0, y: cy0 } = cam;
  const vw = ctx.canvas.width, vh = ctx.canvas.height;
  // Ground
  ctx.fillStyle = night ? '#0d1520' : '#1d2b1d';
  ctx.fillRect(0, 0, vw, vh);
  const ox = -cx0, oy = -cy0;
  // Grass / ground blocks
  ctx.fillStyle = night ? '#12201a' : '#223522';
  ctx.fillRect(ox, oy, WORLD_W, WORLD_H);
  // Beach strip on east bay
  ctx.fillStyle = night ? '#3a3423' : '#c2a878';
  ctx.fillRect(ox + 3380, oy, 220, WORLD_H);
  // River + bay water
  ctx.fillStyle = night ? '#0a2a4a' : '#1c5f8a';
  ctx.fillRect(ox + RIVER_X, oy, RIVER_W, WORLD_H);
  ctx.fillRect(ox + 3380, oy, 220, WORLD_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const wy = ((time * 30 + i * 330) % WORLD_H);
    ctx.beginPath(); ctx.moveTo(ox + RIVER_X + 20, oy + wy); ctx.lineTo(ox + RIVER_X + RIVER_W - 20, oy + wy); ctx.stroke();
  }
  // Roads
  ctx.fillStyle = night ? '#23272e' : '#33383f';
  for (let gx = 0; gx <= WORLD_W / ROAD; gx++) ctx.fillRect(ox + gx * ROAD - 20, oy, 40, WORLD_H);
  for (let gy = 0; gy <= WORLD_H / ROAD; gy++) ctx.fillRect(ox, oy + gy * ROAD - 20, WORLD_W, 40);
  // Road dashes
  ctx.fillStyle = night ? '#8a7a2a' : '#c8b83a';
  for (let gx = 0; gx <= WORLD_W / ROAD; gx++) {
    for (let y = 0; y < WORLD_H; y += 60) ctx.fillRect(ox + gx * ROAD - 2, oy + y, 4, 26);
  }
  for (let gy = 0; gy <= WORLD_H / ROAD; gy++) {
    for (let x = 0; x < WORLD_W; x += 60) ctx.fillRect(ox + x, oy + gy * ROAD - 2, 26, 4);
  }
  // Bridges
  for (const b of BRIDGES) {
    ctx.fillStyle = night ? '#3a3f4a' : '#555b66';
    ctx.fillRect(ox + RIVER_X - 14, oy + b.y - 55, RIVER_W + 28, 110);
    ctx.fillStyle = '#ff2e88';
    ctx.fillRect(ox + RIVER_X - 14, oy + b.y - 55, RIVER_W + 28, 5);
    ctx.fillRect(ox + RIVER_X - 14, oy + b.y + 50, RIVER_W + 28, 5);
  }
  // District tint labels (ground paint)
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color + '22';
    ctx.fillRect(ox + d.x, oy + d.y, d.w, d.h);
    ctx.fillStyle = d.color;
    ctx.globalAlpha = 0.55;
    ctx.fillText(d.cn, ox + d.x + d.w / 2, oy + d.y + 40);
    ctx.globalAlpha = 1;
  }
  // Buildings with fake height shadow
  for (const b of city.buildings) {
    if (b.x + b.w < cx0 - 80 || b.x > cx0 + vw + 80 || b.y + b.h < cy0 - 80 || b.y > cy0 + vh + 80) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(ox + b.x + 8, oy + b.y + 10, b.w, b.h);
    ctx.fillStyle = b.color;
    ctx.fillRect(ox + b.x, oy + b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(ox + b.x + 6, oy + b.y + 6, b.w - 12, b.h - 12);
    // windows
    ctx.fillStyle = night ? '#ffe66d' : '#9fc4d8';
    const cols = Math.max(2, Math.floor(b.w / 26)), rows = Math.max(2, Math.floor(b.h / 26));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 3 + b.height) % 4 === 0) continue;
      ctx.fillRect(ox + b.x + 10 + i * 24, oy + b.y + 10 + j * 24, 12, 10);
    }
    if (b.neon && night) {
      ctx.strokeStyle = b.neon; ctx.lineWidth = 3;
      ctx.shadowColor = b.neon; ctx.shadowBlur = 12;
      ctx.strokeRect(ox + b.x - 2, oy + b.y - 2, b.w + 4, b.h + 4);
      ctx.shadowBlur = 0;
    }
  }
  // Landmarks
  ctx.font = 'bold 15px sans-serif';
  for (const L of city.landmarks) {
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(ox + L.x, oy + L.y, L.w, L.h);
    ctx.fillStyle = '#222';
    ctx.fillText(L.name, ox + L.x + L.w / 2, oy + L.y + L.h / 2 + 5);
  }
  // Neon signs
  if (night) {
    ctx.font = 'bold 16px sans-serif';
    for (const s of city.neonSigns) {
      ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 10;
      ctx.fillText(s.text, ox + s.x, oy + s.y);
      ctx.shadowBlur = 0;
    }
  }
  // Trees
  for (const t of city.trees) {
    ctx.fillStyle = night ? '#14301c' : '#2e7d32';
    ctx.beginPath(); ctx.arc(ox + t.x, oy + t.y, t.r, 0, Math.PI * 2); ctx.fill();
  }
  // Shops
  ctx.font = 'bold 13px sans-serif';
  const shopColors = { repair: '#ff9f1c', paint: '#ff2e88', weapon: '#c0c0c0', taxi: '#ffe600', garage: '#2ec4b6', hideout: '#7b2fff' };
  for (const s of city.shops) {
    ctx.fillStyle = shopColors[s.kind] || '#fff';
    ctx.beginPath(); ctx.arc(ox + s.x, oy + s.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillText(s.kind === 'repair' ? '修' : s.kind === 'paint' ? '漆' : s.kind === 'weapon' ? '武' : s.kind === 'taxi' ? '租' : s.kind === 'garage' ? '库' : '屋', ox + s.x, oy + s.y + 5);
    ctx.fillStyle = '#fff';
    ctx.fillText(s.name, ox + s.x, oy + s.y - 24);
  }
  // Hidden packages
  for (const p of city.packages) {
    if (p.taken) continue;
    const bob = Math.sin(time * 3 + p.x) * 3;
    ctx.fillStyle = '#ffe600';
    ctx.save(); ctx.translate(ox + p.x, oy + p.y + bob); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-8, -8, 16, 16); ctx.restore();
    ctx.fillStyle = '#111'; ctx.font = 'bold 11px sans-serif';
    ctx.fillText('包', ox + p.x, oy + p.y + bob + 4);
  }
}
