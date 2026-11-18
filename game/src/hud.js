// hud.js — HUD (money, health, wanted stars, objective, timer, speed),
// minimap, dialogue box, title / pause / game-over / mission-complete screens.

import { clamp, dist, fmtClock } from './engine.js';
import { DISTRICTS, WORLD_W, WORLD_H, RIVER_X, RIVER_W } from './city.js';
import { currentObjective } from './missions.js';

export function drawHUD(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.textAlign = 'left';
  // Top-left: money + health
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, 12, 230, 64);
  ctx.fillStyle = '#2ec4b6';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('$' + G.money, 22, 40);
  ctx.fillStyle = '#ff5a5a';
  ctx.fillRect(22, 50, 150, 12);
  ctx.fillStyle = '#37e08b';
  ctx.fillRect(22, 50, 150 * clamp(G.player.hp / 100, 0, 1), 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('生命 ' + Math.ceil(G.player.hp), 178, 60);
  // Top-right: wanted stars
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(W - 190, 12, 178, 40);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? '#ffd700' : '#555';
    ctx.font = '26px sans-serif';
    ctx.fillText('★', W - 178 + i * 34, 42);
  }
  // Objective + timer
  const obj = currentObjective(G);
  const y0 = 88;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(12, y0, 330, 52);
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 14px sans-serif';
  if (G.mission && G.mission.active) {
    ctx.fillText('任务 ' + G.mission.def.id + ' · ' + G.mission.def.title, 22, y0 + 20);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText((obj ? obj.text : '') + (G.mission.hint ? ' — ' + G.mission.hint : ''), 22, y0 + 40);
    ctx.fillStyle = G.mission.timer < 30 ? '#ff4444' : '#fff';
    ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'right';
    const t = Math.max(0, Math.ceil(G.mission.timer));
    ctx.fillText(Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'), 330, y0 + 20);
    ctx.textAlign = 'left';
  } else if (G.taxi.active) {
    ctx.fillText('出租单', 22, y0 + 20);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText('送乘客到目的地，车费 $' + G.taxi.fare + '，剩余 ' + Math.ceil(G.taxi.timer) + 's', 22, y0 + 40);
  } else if (G.race.active) {
    ctx.fillText('街头赛车', 22, y0 + 20);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    ctx.fillText('检查点 ' + G.race.point + '/5，剩余 ' + Math.ceil(G.race.timer) + 's', 22, y0 + 40);
  } else {
    ctx.fillText('霓虹湾 NEON BAY', 22, y0 + 20);
    ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
    const next = G.completedMissions < 5 ? '按 M 开始任务 ' + (G.completedMissions + 1) : '全部任务完成！';
    ctx.fillText(next + ' · C 赛车 · R 电台 · 找隐藏包裹 ' + G.packagesFound + '/8', 22, y0 + 40);
  }
  // Speed (driving)
  if (G.playerCar) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W - 150, H - 76, 138, 64);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(G.playerCar.speed) * 1.8) + '', W - 78, H - 38);
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('km/h', W - 72, H - 38);
    ctx.fillStyle = '#ff5a5a'; ctx.font = '11px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('车况', W - 140, H - 58);
    ctx.fillStyle = '#444'; ctx.fillRect(W - 140, H - 52, 118, 8);
    ctx.fillStyle = G.playerCar.hp > 45 ? '#37e08b' : '#ff5a5a';
    ctx.fillRect(W - 140, H - 52, 118 * clamp(G.playerCar.hp / 100, 0, 1), 8);
    ctx.textAlign = 'left';
  }
  // Weapon / ammo
  if (G.player.hasGun) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, H - 52, 150, 40);
    ctx.fillStyle = '#ffe600'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('手枪  子弹 ' + G.player.ammo, 22, H - 26);
  }
  // Clock + day/night
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(W / 2 - 60, 12, 120, 30);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(fmtClock(G.clock) + (G.night ? ' 夜' : ' 昼'), W / 2, 33);
  ctx.textAlign = 'left';
  // Message log (bottom-left, fading)
  ctx.font = '13px sans-serif';
  let ly = H - 90;
  for (let i = G.logLines.length - 1; i >= 0 && ly > H - 200; i--) {
    const line = G.logLines[i];
    ctx.globalAlpha = clamp(line.t / 4, 0, 1);
    ctx.fillStyle = '#fff';
    ctx.fillText(line.text, 16, ly);
    ly -= 18;
  }
  ctx.globalAlpha = 1;
  // Controls hint
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(12, H - 26, 640, 18);
  ctx.fillStyle = '#ccc'; ctx.font = '11px sans-serif';
  ctx.fillText('WASD 走路 / 开车 · E 上下车 · Space 拳击/手刹 · F/鼠标 射击 · M 任务 · C 赛车 · R 电台 · P 暂停 · 靠近商店按 E', 16, H - 13);
  // Dialogue box
  if (G.mission && G.mission.dialogue && G.mission.dialogueT > 0) {
    drawDialogue(ctx, G.mission.dialogue);
  }
  drawMinimap(ctx, G);
}

function drawDialogue(ctx, text) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = 'rgba(10,10,26,0.85)';
  ctx.fillRect(W / 2 - 360, H - 150, 720, 64);
  ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 360, H - 150, 720, 64);
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('▶ 对话', W / 2 - 340, H - 126);
  ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
  wrapText(ctx, text, W / 2 - 340, H - 104, 680, 18);
}

function wrapText(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, y); y += lh; line = ch; }
    else line += ch;
  }
  if (line) ctx.fillText(line, x, y);
}

export function drawMinimap(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const mw = 190, mh = 138, mx = W - mw - 12, my = H - mh - 12 - (G.playerCar ? 70 : 0);
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#0d2a1a';
  ctx.fillRect(mx, my, mw, mh);
  // River
  ctx.fillStyle = '#1c5f8a';
  ctx.fillRect(mx + RIVER_X * sx, my, RIVER_W * sx, mh);
  // Districts
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.color + '55';
    ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy);
  }
  // Roads
  ctx.fillStyle = '#555';
  for (let gx = 0; gx <= WORLD_W / 200; gx++) ctx.fillRect(mx + gx * 200 * sx, my, 1, mh);
  for (let gy = 0; gy <= WORLD_H / 200; gy++) ctx.fillRect(mx, my + gy * 200 * sy, mw, 1);
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx + x * sx, my + y * sy, r || 3, 0, Math.PI * 2); ctx.fill();
  };
  for (const c of G.parked) dot(c.x, c.y, '#aaa', 2);
  for (const c of G.traffic) dot(c.x, c.y, '#ddd', 2);
  for (const c of G.police) dot(c.x, c.y, '#3a7bff', 4);
  if (G.heli) dot(G.heli.x, G.heli.y, '#3a7bff', 5);
  const obj = currentObjective(G);
  if (obj) {
    const px = mx + obj.x * sx, py = my + obj.y * sy;
    ctx.fillStyle = '#ffe600';
    ctx.beginPath(); ctx.arc(px, py, 5 + Math.sin(G.time * 5) * 2, 0, Math.PI * 2); ctx.fill();
  }
  if (G.taxi.active) dot(G.taxi.dest.x, G.taxi.dest.y, '#ffe600', 4);
  // Player arrow
  ctx.save();
  ctx.translate(mx + G.player.x * sx, my + G.player.y * sy);
  ctx.rotate(G.player.angle);
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('霓虹湾地图', mx, my - 8);
}

export function drawTitle(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  // Neon gradient backdrop over the city (city already drawn behind).
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(20,0,40,0.55)');
  grad.addColorStop(1, 'rgba(0,0,10,0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff2e88';
  ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 30;
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('霓虹湾', W / 2, H / 2 - 110);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#00e5ff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('N E O N   B A Y', W / 2, H / 2 - 60);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText('一座被霓虹与欲望点亮的海湾之城。阿岩回来了，金爷还欠他一个说法。', W / 2, H / 2 - 10);
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 20px sans-serif';
  const blink = Math.sin(G.time * 4) > -0.3;
  if (blink) ctx.fillText('按 Enter 开始 · 按 M 直接开始任务', W / 2, H / 2 + 50);
  ctx.fillStyle = '#ccc'; ctx.font = '14px sans-serif';
  ctx.fillText('WASD 移动 / 开车 · E 上下车偷车 · Space 拳击 / 手刹 · F 或鼠标射击 · M 任务 · R 电台 · P 暂停', W / 2, H / 2 + 90);
  ctx.fillText('5 个主线任务 · 出租车 / 街头赛车 / 8 个隐藏包裹 · 修车铺 / 喷漆房 / 武器店 · 通缉 0–5 星 · 警用直升机', W / 2, H / 2 + 118);
  if (G.saveExists) {
    ctx.fillStyle = '#2ec4b6'; ctx.font = 'bold 15px sans-serif';
    ctx.fillText('检测到存档：按 L 读取上次进度', W / 2, H / 2 + 150);
  }
  ctx.fillStyle = '#888'; ctx.font = '12px sans-serif';
  ctx.fillText('原创游戏 · 霓虹湾 NEON BAY · 角色与故事均为虚构', W / 2, H - 24);
  ctx.textAlign = 'left';
}

export function drawPause(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 44px sans-serif';
  ctx.fillText('已暂停', W / 2, H / 2 - 40);
  ctx.font = '16px sans-serif'; ctx.fillStyle = '#ccc';
  ctx.fillText('P 继续 · S 保存进度 · Q 回到标题', W / 2, H / 2 + 10);
  ctx.fillText(`现金 $${G.money} · 已完成任务 ${G.completedMissions}/5 · 隐藏包裹 ${G.packagesFound}/8`, W / 2, H / 2 + 44);
  ctx.textAlign = 'left';
}

export function drawGameOver(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = 'rgba(20,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444'; ctx.font = 'bold 56px sans-serif';
  ctx.fillText('你被抓住了', W / 2, H / 2 - 30);
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
  ctx.fillText(G.deathReason || '霓虹湾的夜还很长……', W / 2, H / 2 + 16);
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('按 Enter 重新开始', W / 2, H / 2 + 60);
  ctx.textAlign = 'left';
}

export function drawComplete(ctx, G) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.fillStyle = 'rgba(0,20,30,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 24;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('霓虹湾自由了！', W / 2, H / 2 - 40);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif';
  ctx.fillText('金爷倒下了，阿岩和苏晴开着游艇驶向日出。', W / 2, H / 2 + 10);
  ctx.fillText(`最终现金 $${G.money} · 任务 5/5 · 隐藏包裹 ${G.packagesFound}/8`, W / 2, H / 2 + 44);
  ctx.fillStyle = '#ffe600'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('按 Enter 再玩一次', W / 2, H / 2 + 90);
  ctx.textAlign = 'left';
}
