// combat.js — melee punch, pistol shooting, bullets, enemies, damage.

import { dist, clamp } from './engine.js';

export function playerPunch(G) {
  if (G.player.punchCd > 0) return;
  G.player.punchCd = 0.45;
  G.audio.sfx('punch');
  const px = G.player.x, py = G.player.y;
  const reach = 46;
  const fx = px + Math.cos(G.player.angle) * reach;
  const fy = py + Math.sin(G.player.angle) * reach;
  G.effects.push({ kind: 'punch', x: fx, y: fy, t: 0.2, max: 0.2 });
  // Hit pedestrians / enemies / guards in front.
  for (const p of G.peds) {
    if (dist(fx, fy, p.x, p.y) < 26) {
      p.hp -= 15; p.panic = 3;
      G.log('你一拳打倒了' + p.name + '！');
      G.addWanted(1, '当街打人');
      if (p.hp <= 0) { p.hp = 30; p.x += Math.cos(G.player.angle) * 120; p.y += Math.sin(G.player.angle) * 120; }
    }
  }
  for (const e of G.enemies) {
    if (e.hp > 0 && dist(fx, fy, e.x, e.y) < 30) {
      e.hp -= 20;
      G.effects.push({ kind: 'hit', x: e.x, y: e.y, t: 0.3, max: 0.3 });
      if (e.hp <= 0) G.onEnemyDown(e);
    }
  }
}

export function playerShoot(G, tx, ty) {
  if (!G.player.hasGun) { G.log('你还没有手枪，去老陈五金买一把（按 E 靠近武器店）'); return; }
  if (G.player.ammo <= 0) { G.log('没子弹了！去武器店补弹药'); G.audio.sfx('empty'); return; }
  if (G.player.shootCd > 0) return;
  G.player.shootCd = 0.28;
  G.player.ammo -= 1;
  const a = Math.atan2(ty - G.player.y, tx - G.player.x);
  G.player.angle = a;
  G.bullets.push({ x: G.player.x, y: G.player.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.9, from: 'player' });
  G.audio.sfx('shoot');
  G.addWanted(0, '');
  if (Math.random() < 0.4) G.addWanted(1, '开枪');
}

export function updateBullets(G, dt) {
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    // Hit enemies
    for (const e of G.enemies) {
      if (e.hp > 0 && dist(b.x, b.y, e.x, e.y) < 20) {
        e.hp -= 34; b.life = 0;
        G.effects.push({ kind: 'hit', x: e.x, y: e.y, t: 0.3, max: 0.3 });
        if (e.hp <= 0) G.onEnemyDown(e);
        break;
      }
    }
    if (b.life <= 0) continue;
    // Hit police cars
    for (const c of G.police) {
      if (dist(b.x, b.y, c.x, c.y) < 26) { c.hp -= 12; b.life = 0; G.addWanted(1, '袭警'); break; }
    }
    if (b.life <= 0) continue;
    // Hit pedestrians
    for (const p of G.peds) {
      if (dist(b.x, b.y, p.x, p.y) < 14) { p.hp -= 34; p.panic = 4; b.life = 0; G.addWanted(1, '开枪伤人'); break; }
    }
  }
  G.bullets = G.bullets.filter((b) => b.life > 0);
  for (const b of G.enemyBullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (dist(b.x, b.y, G.player.x, G.player.y) < 16) {
      b.life = 0;
      G.damagePlayer(9, '中弹');
    }
    if (G.playerCar && dist(b.x, b.y, G.playerCar.x, G.playerCar.y) < 26) {
      b.life = 0; G.playerCar.hp -= 4;
    }
  }
  G.enemyBullets = G.enemyBullets.filter((b) => b.life > 0);
}

export function spawnEnemy(G, x, y, kind) {
  const e = {
    x, y, angle: Math.random() * 6, hp: kind === 'boss' ? 160 : 60, maxHp: kind === 'boss' ? 160 : 60,
    kind: kind || 'guard', shootT: 1 + Math.random(), speed: 55, name: kind === 'boss' ? '金爷' : '金爷打手',
  };
  G.enemies.push(e);
  return e;
}

export function updateEnemies(G, dt) {
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    const d = dist(e.x, e.y, G.player.x, G.player.y);
    const a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
    e.angle = a;
    if (d > 260) {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else if (d > 60) {
      e.x += Math.cos(a) * e.speed * 0.4 * dt;
      e.y += Math.sin(a) * e.speed * 0.4 * dt;
    }
    e.shootT -= dt;
    if (e.shootT <= 0 && d < 430) {
      e.shootT = 1.4 + Math.random() * 0.8;
      G.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, life: 1.3, from: 'enemy' });
      G.audio.sfx('shoot');
    }
  }
  // Downed enemies are removed at once (their cash drop already fired in onEnemyDown).
  G.enemies = G.enemies.filter((e) => e.hp > 0);
}

export function drawCombat(ctx, G, cam) {
  const ox = -cam.x, oy = -cam.y;
  // Player bullets
  ctx.fillStyle = '#ffe600';
  for (const b of G.bullets) {
    ctx.fillRect(ox + b.x - 3, oy + b.y - 1.5, 7, 3);
  }
  // Enemy bullets
  ctx.fillStyle = '#ff4444';
  for (const b of G.enemyBullets) {
    ctx.beginPath(); ctx.arc(ox + b.x, oy + b.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Enemies
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    ctx.save();
    ctx.translate(ox + e.x, oy + e.y);
    ctx.rotate(e.angle);
    ctx.fillStyle = e.kind === 'boss' ? '#ffd700' : '#7a1f1f';
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c89b';
    ctx.beginPath(); ctx.arc(5, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2, 14, 4);
    ctx.restore();
    // HP bar
    ctx.fillStyle = '#000';
    ctx.fillRect(ox + e.x - 18, oy + e.y - 24, 36, 5);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(ox + e.x - 18, oy + e.y - 24, 36 * clamp(e.hp / e.maxHp, 0, 1), 5);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(e.name, ox + e.x, oy + e.y - 30);
  }
  // Effects
  for (const fx of G.effects) {
    const t = fx.t / fx.max;
    if (fx.kind === 'punch') {
      ctx.strokeStyle = `rgba(255,255,255,${t})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ox + fx.x, oy + fx.y, 14 * (1.4 - t), 0, Math.PI * 2); ctx.stroke();
    } else if (fx.kind === 'hit') {
      ctx.fillStyle = `rgba(255,60,60,${t})`;
      ctx.beginPath(); ctx.arc(ox + fx.x, oy + fx.y, 10, 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'cash') {
      ctx.fillStyle = `rgba(255,230,0,${t})`;
      ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(fx.text || '+$', ox + fx.x, oy + fx.y - (1 - t) * 30);
    }
  }
}
