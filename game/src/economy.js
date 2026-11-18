// economy.js — cash, shops (repair / paint / weapons), side jobs (taxi, races, packages).

import { dist } from './engine.js';

export function addCash(G, n) {
  G.money += n;
  if (n > 0) G.effects.push({ kind: 'cash', x: G.player.x, y: G.player.y, text: `+$${n}`, t: 1.2, max: 1.2 });
}

export function nearestShop(G, maxD) {
  let best = null, bd = maxD;
  for (const s of G.city.shops) {
    const d = dist(G.player.x, G.player.y, s.x, s.y);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function useShop(G, shop) {
  if (shop.kind === 'repair') {
    if (!G.playerCar) { G.log('修车要开车过来'); return; }
    if (G.playerCar.hp >= 100) { G.log('车子完好无损'); return; }
    if (G.money < shop.price) { G.log('修车要 $60，钱不够'); return; }
    G.money -= shop.price;
    G.playerCar.hp = 100;
    G.log('车子修好了！-$60');
    G.audio.sfx('cash');
  } else if (shop.kind === 'paint') {
    if (!G.playerCar) { G.log('喷漆要开车过来'); return; }
    if (G.money < shop.price) { G.log('喷漆要 $120，钱不够'); return; }
    G.money -= shop.price;
    const colors = ['#e63946', '#2a9d8f', '#f4d35e', '#4361ee', '#f72585', '#06d6a0'];
    G.playerCar.color = colors[Math.floor(Math.random() * colors.length)];
    G.setWanted(Math.max(0, G.wanted - 2));
    G.police.length = 0;
    G.log('换了新漆，警察认不出你了！通缉 -2');
    G.audio.sfx('cash');
  } else if (shop.kind === 'weapon') {
    if (!G.player.hasGun) {
      if (G.money < 200) { G.log('手枪 $200，钱不够'); return; }
      G.money -= 200;
      G.player.hasGun = true;
      G.player.ammo = 24;
      G.log('买到手枪一把 + 24 发子弹！按 F 或鼠标左键开枪');
      G.audio.sfx('cash');
    } else {
      if (G.money < 50) { G.log('子弹 $50 / 24 发，钱不够'); return; }
      G.money -= 50;
      G.player.ammo += 24;
      G.log('买了 24 发子弹');
      G.audio.sfx('cash');
    }
  } else if (shop.kind === 'taxi') {
    startTaxiJob(G);
  } else if (shop.kind === 'garage') {
    G.log('肥波的车库：任务 2 要把金色跑车开到这里');
  } else if (shop.kind === 'hideout') {
    G.log('安全屋：躲警察的好地方，通缉会慢慢下降');
    G.healPlayer(20);
  }
}

// --- Taxi side job ---
export function startTaxiJob(G) {
  if (G.taxi.active) { G.log('你已经在跑出租了'); return; }
  const p = G.peds.find((q) => !q.isTaxi && dist(q.x, q.y, G.player.x, G.player.y) < 700);
  if (!p) { G.log('附近没有等车的乘客'); return; }
  p.isTaxi = true;
  const dests = [
    { x: 620, y: 620, name: '出租车站' }, { x: 1055, y: 545, name: '霓虹银行' },
    { x: 2490, y: 730, name: '港口仓库' }, { x: 560, y: 1680, name: '海湾大学' },
    { x: 2814, y: 1840, name: '金爷别墅' },
  ];
  const dest = dests[Math.floor(Math.random() * dests.length)];
  G.taxi = { active: true, ped: p, dest, timer: 120, fare: 80 + Math.floor(Math.random() * 60) };
  G.log(`出租单：把乘客送到${dest.name}，车费 $${G.taxi.fare}`);
  G.audio.sfx('mission');
}

export function updateTaxi(G, dt) {
  const t = G.taxi;
  if (!t.active) return;
  t.timer -= dt;
  const p = t.ped;
  // Passenger walks to the player's car / follows the player.
  if (p && dist(p.x, p.y, G.player.x, G.player.y) > 40) {
    const a = Math.atan2(G.player.y - p.y, G.player.x - p.x);
    const sp = dist(p.x, p.y, G.player.x, G.player.y) < 200 ? 130 : 70;
    p.x += Math.cos(a) * sp * dt;
    p.y += Math.sin(a) * sp * dt;
  }
  if (t.timer <= 0) { t.active = false; if (p) p.isTaxi = false; G.log('出租单超时了'); return; }
  if (dist(G.player.x, G.player.y, t.dest.x, t.dest.y) < 90) {
    addCash(G, t.fare);
    G.log(`出租完成！收到 $${t.fare}`);
    G.audio.sfx('win');
    if (p) { p.isTaxi = false; p.x = t.dest.x + 30; p.y = t.dest.y + 30; }
    t.active = false;
  }
}

// --- Street race side job ---
export const RACE_POINTS = [
  { x: 1860, y: 380 }, { x: 1860, y: 1240 }, { x: 1860, y: 2080 }, { x: 620, y: 2080 }, { x: 620, y: 620 },
];

export function startRace(G) {
  if (G.race.active) return;
  if (!G.playerCar) { G.log('街头赛车要开车参加！按 E 上车'); return; }
  G.race = { active: true, point: 0, timer: 150 };
  G.log('街头赛车开始！依次穿过 5 个检查点，赢了拿 $250');
  G.audio.sfx('mission');
}

export function updateRace(G, dt) {
  const r = G.race;
  if (!r.active) return;
  r.timer -= dt;
  if (r.timer <= 0) { r.active = false; G.log('赛车超时，输了'); return; }
  const pt = RACE_POINTS[r.point];
  if (dist(G.player.x, G.player.y, pt.x, pt.y) < 90) {
    r.point += 1;
    G.audio.sfx('checkpoint');
    if (r.point >= RACE_POINTS.length) {
      r.active = false;
      addCash(G, 250);
      G.log('赢得街头赛车！+$250');
      G.audio.sfx('win');
    } else {
      G.log(`检查点 ${r.point}/${RACE_POINTS.length} 通过！`);
    }
  }
}

// --- Hidden packages ---
export function checkPackages(G) {
  for (const p of G.city.packages) {
    if (!p.taken && dist(G.player.x, G.player.y, p.x, p.y) < 34) {
      p.taken = true;
      G.packagesFound += 1;
      addCash(G, 100);
      G.log(`找到隐藏包裹 ${G.packagesFound}/8！+$100`);
      G.audio.sfx('win');
    }
  }
}

export function checkCashPickups(G) {
  for (const c of G.pickups) {
    if (!c.taken && dist(G.player.x, G.player.y, c.x, c.y) < 30) {
      c.taken = true;
      addCash(G, c.value);
      G.audio.sfx('cash');
    }
  }
  G.pickups = G.pickups.filter((c) => !c.taken);
}

export function dropCash(G, x, y, value) {
  G.pickups.push({ x, y, value, taken: false, t: 0 });
}

export function drawEconomy(ctx, G, cam) {
  const ox = -cam.x, oy = -cam.y;
  // Cash pickups
  for (const c of G.pickups) {
    const bob = Math.sin(G.time * 4 + c.x) * 3;
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath(); ctx.arc(ox + c.x, oy + c.y + bob, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('$', ox + c.x, oy + c.y + bob + 4);
  }
  // Taxi destination
  if (G.taxi.active) {
    const d = G.taxi.dest;
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('￥ 目的地', ox + d.x, oy + d.y - 22);
    ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox + d.x, oy + d.y, 24 + Math.sin(G.time * 5) * 4, 0, Math.PI * 2); ctx.stroke();
  }
  // Race checkpoints
  if (G.race.active) {
    const pt = RACE_POINTS[G.race.point];
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.arc(ox + pt.x, oy + pt.y, 26 + Math.sin(G.time * 5) * 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('' + (G.race.point + 1), ox + pt.x, oy + pt.y + 5);
  }
}
