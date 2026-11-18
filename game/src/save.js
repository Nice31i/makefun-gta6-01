// save.js — localStorage save / load for Neon Bay.

const KEY = 'neonbay-save-v1';

export function saveGame(G) {
  try {
    const data = {
      version: 1,
      money: G.money,
      completedMissions: G.completedMissions,
      packagesFound: G.packagesFound,
      packagesTaken: G.city.packages.map((p) => p.taken),
      player: {
        x: G.player.x, y: G.player.y, hp: G.player.hp,
        hasGun: G.player.hasGun, ammo: G.player.ammo,
      },
      clock: G.clock,
      savedAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    G.log('进度已保存');
    return true;
  } catch (e) {
    G.log('保存失败（浏览器不允许存储）');
    return false;
  }
}

export function loadGame(G) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 1) return false; // save from another version: ignore it
    G.money = data.money ?? G.money;
    G.completedMissions = data.completedMissions ?? 0;
    G.packagesFound = data.packagesFound ?? 0;
    if (Array.isArray(data.packagesTaken)) {
      data.packagesTaken.forEach((t, i) => { if (G.city.packages[i]) G.city.packages[i].taken = !!t; });
    }
    if (data.player) {
      G.player.x = data.player.x; G.player.y = data.player.y;
      G.player.hp = data.player.hp ?? 100;
      G.player.hasGun = !!data.player.hasGun;
      G.player.ammo = data.player.ammo ?? 0;
    }
    if (typeof data.clock === 'number') G.clock = data.clock;
    G.log('已读取存档');
    return true;
  } catch (e) {
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}
