// missions.js — story, dialogue and the 5 main missions of Neon Bay.
// Characters: 阿岩 (ex-courier, the player), 肥波 (fixer), 苏晴 (ally driver), 金爷 (crime boss).

import { dist } from './engine.js';
import { spawnEnemy } from './combat.js';

export const MISSION_DEFS = [
  {
    id: 1, title: '飞车送货', giver: '肥波',
    brief: '肥波：阿岩，第一单！把这箱“海鲜”送过三座桥，送到港口仓库。别迟到，迟到就没钱！',
    reward: 300, timeLimit: 150,
    steps: [
      { text: '开车穿过彩虹桥', x: 1860, y: 380 },
      { text: '穿过海湾大桥', x: 1860, y: 1240 },
      { text: '穿过渔火桥', x: 1860, y: 2080 },
      { text: '把货送到港口仓库', x: 2490, y: 640 },
    ],
  },
  {
    id: 2, title: '金爷的跑车', giver: '肥波',
    brief: '肥波：金爷有辆限量金色跑车停在山庄别墅门口。偷出来，开回我的车库，事成给你分红。',
    reward: 600, timeLimit: 240,
    steps: [
      { text: '到富人山庄别墅，偷走金色跑车', x: 2814, y: 1840, needSports: true },
      { text: '开回肥波的车库', x: 1614, y: 900, needSports: true },
    ],
  },
  {
    id: 3, title: '银行大劫案', giver: '肥波',
    brief: '肥波：霓虹银行，今晚动手。进去拿钱，然后甩掉条子，活着到安全屋。',
    reward: 1200, timeLimit: 300,
    steps: [
      { text: '进入霓虹银行', x: 1055, y: 545 },
      { text: '按 E 抢银行（站着别动 3 秒）', x: 1055, y: 545, hold: 3 },
      { text: '甩掉警察，逃到安全屋', x: 614, y: 2200, escape: true },
    ],
  },
  {
    id: 4, title: '营救苏晴', giver: '苏晴',
    brief: '苏晴（电话）：阿岩！金爷的人把我扣在港口仓库了……快来！别一个人硬闯，他们有枪。',
    reward: 900, timeLimit: 300,
    steps: [
      { text: '潜入港口仓库', x: 2490, y: 730 },
      { text: '打倒 3 名看守', x: 2490, y: 730, guards: 3 },
      { text: '带苏晴离开仓库', x: 2490, y: 730, rescue: true },
      { text: '把苏晴送到安全屋', x: 614, y: 2200 },
    ],
  },
  {
    id: 5, title: '游艇决战', giver: '肥波',
    brief: '肥波：最后一单。金爷今晚在游艇上数钱，带上家伙，结束这一切。干掉他的人，抢下游艇。',
    reward: 2500, timeLimit: 420,
    steps: [
      { text: '登上东湾的游艇', x: 3440, y: 360 },
      { text: '打倒金爷的 5 名手下', x: 3440, y: 360, guards: 5 },
      { text: '打倒金爷本人', x: 3440, y: 360, boss: true },
      { text: '开游艇逃离霓虹湾', x: 3490, y: 500, escape: true },
    ],
  },
];

export function startMission(G, idx) {
  const def = MISSION_DEFS[idx];
  if (!def) return;
  G.mission = {
    index: idx, def, step: 0, timer: def.timeLimit, active: true,
    holdT: 0, guardsDown: 0, dialogue: def.brief, dialogueT: 6, done: false,
  };
  G.log('任务开始：' + def.title);
  G.audio.sfx('mission');
  if (idx === 3) {
    // Warehouse guards for the rescue.
    spawnEnemy(G, 2440, 600, 'guard');
    spawnEnemy(G, 2540, 600, 'guard');
    spawnEnemy(G, 2490, 700, 'guard');
  }
  if (idx === 4) {
    spawnEnemy(G, 3390, 330, 'guard');
    spawnEnemy(G, 3490, 330, 'guard');
    spawnEnemy(G, 3440, 410, 'guard');
    spawnEnemy(G, 3390, 390, 'guard');
    spawnEnemy(G, 3490, 390, 'guard');
    spawnEnemy(G, 3440, 360, 'boss');
  }
}

export function currentObjective(G) {
  const m = G.mission;
  if (!m || !m.active) return null;
  return m.def.steps[m.step] || null;
}

export function updateMission(G, dt) {
  const m = G.mission;
  if (!m || !m.active) return;
  m.timer -= dt;
  if (m.dialogueT > 0) m.dialogueT -= dt;
  if (m.timer <= 0) {
    failMission(G, '时间到了！任务失败。');
    return;
  }
  const step = currentObjective(G);
  if (!step) { completeMission(G); return; }
  const d = dist(G.player.x, G.player.y, step.x, step.y);
  // Step-specific logic.
  if (step.guards) {
    if (m.guardsDown >= step.guards) { advanceStep(G, '看守全部倒下！'); return; }
  }
  if (step.boss) {
    const boss = G.enemies.find((e) => e.kind === 'boss');
    if (!boss || boss.hp <= 0) { advanceStep(G, '金爷倒下了！'); return; }
  }
  if (step.rescue) {
    if (m.rescued) { advanceStep(G, '苏晴得救了！快带她走！'); return; }
    if (d < 60) {
      m.rescued = true;
      G.ally = { x: G.player.x + 20, y: G.player.y + 20, active: true };
      G.log('苏晴：谢谢你，阿岩！快走！');
      G.audio.sfx('mission');
    }
    return;
  }
  if (step.hold) {
    if (d < 70) {
      m.holdT += dt;
      if (m.holdT >= step.hold) {
        m.holdT = 0;
        G.addCash(0);
        G.log('抢到了！快跑！');
        G.setWanted(4);
        advanceStep(G, '得手了，甩掉警察！');
        return;
      }
    } else m.holdT = 0;
    return;
  }
  if (step.escape) {
    // Finale escape by boat needs no wanted level; other escapes need to lose the cops first.
    if (d < 80 && (G.wanted === 0 || m.index === 4)) { advanceStep(G, '甩掉了！'); return; }
    if (d < 80 && G.wanted > 0) { G.mission.hint = '先甩掉警察（通缉降到 0）再进安全区！'; return; }
    return;
  }
  if (step.needSports) {
    const inSports = G.playerCar && G.playerCar.special === 'sports';
    if (m.index === 1 && m.step === 0) {
      if (inSports) { advanceStep(G, '跑车到手！开回车库！'); return; }
      if (d < 90) G.mission.hint = '按 E 偷走金色跑车';
    } else if (m.index === 1 && m.step === 1) {
      if (inSports && d < 90) { advanceStep(G, ''); return; }
    }
    return;
  }
  if (d < 80) {
    if (m.index === 0) advanceStep(G, step.text + ' —— 完成！');
    else advanceStep(G, '到达目标！');
  }
}

function advanceStep(G, msg) {
  const m = G.mission;
  m.step += 1;
  m.holdT = 0;
  m.hint = '';
  if (msg) G.log(msg);
  G.audio.sfx('checkpoint');
  if (m.step >= m.def.steps.length) completeMission(G);
}

function completeMission(G) {
  const m = G.mission;
  m.active = false; m.done = true;
  G.addCash(m.def.reward);
  G.completedMissions += 1;
  G.log(`任务完成：${m.def.title}！奖励 $${m.def.reward}`);
  G.audio.sfx('win');
  G.effects.push({ kind: 'cash', x: G.player.x, y: G.player.y, text: `+$${m.def.reward}`, t: 1.5, max: 1.5 });
  if (m.index === 3 && G.ally) G.ally.active = false;
  if (m.index === 4) {
    G.gameComplete = true;
    G.state = 'complete';
    G.log('霓虹湾自由了！你赢了！');
  }
  G.mission = { index: m.index + 1, def: null, step: 0, timer: 0, active: false, dialogue: '', dialogueT: 0, done: true, nextReady: true };
}

function failMission(G, reason) {
  const m = G.mission;
  m.active = false;
  G.log(reason + ' 按 M 可以重试。');
  G.audio.sfx('fail');
  G.mission = { index: m.index, def: null, step: 0, timer: 0, active: false, dialogue: '', dialogueT: 0, done: false, nextReady: true };
  G.enemies = G.enemies.filter((e) => e.kind !== 'guard' && e.kind !== 'boss');
}

export function drawMissionMarker(ctx, G, cam) {
  const step = currentObjective(G);
  if (!step) return;
  const ox = -cam.x, oy = -cam.y;
  const bob = Math.sin(G.time * 4) * 6;
  const x = ox + step.x, y = oy + step.y - 40 + bob;
  ctx.fillStyle = '#ffe600';
  ctx.beginPath();
  ctx.moveTo(x, y + 26); ctx.lineTo(x - 14, y - 6); ctx.lineTo(x - 14, y - 26);
  ctx.lineTo(x + 14, y - 26); ctx.lineTo(x + 14, y - 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('!', x, y - 8);
  // Guide arrow at screen edge pointing to the marker.
  const sx = step.x - cam.x, sy = step.y - cam.y;
  const vw = ctx.canvas.width, vh = ctx.canvas.height;
  if (sx < 0 || sx > vw || sy < 0 || sy > vh) {
    const cx = Math.max(40, Math.min(vw - 40, sx)), cy = Math.max(40, Math.min(vh - 40, sy));
    const a = Math.atan2(sy - vh / 2, sx - vw / 2);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.fillStyle = '#ffe600';
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -10); ctx.lineTo(-10, 10); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
