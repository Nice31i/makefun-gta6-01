// engine.js — core loop helpers, seeded RNG, keyboard/mouse input, camera.
// 霓虹湾 NEON BAY: all original code written for this entry.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
// "21:05" style clock text from a 0-24 hour value.
export function fmtClock(hours) {
  const hh = Math.floor(hours) % 24;
  const mm = Math.floor((hours % 1) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};
export function rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
// Push a circle out of an axis-aligned rect; returns true if it collided.
export function pushOutCircleRect(px, py, r, rx, ry, rw, rh) {
  const cx = clamp(px, rx, rx + rw), cy = clamp(py, ry, ry + rh);
  const dx = px - cx, dy = py - cy, d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return null;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    return { x: cx + (dx / d) * r, y: cy + (dy / d) * r };
  }
  // Center inside rect: push out along the smallest penetration axis.
  const left = px - rx, right = rx + rw - px, top = py - ry, bot = ry + rh - py;
  const m = Math.min(left, right, top, bot);
  if (m === left) return { x: rx - r, y: py };
  if (m === right) return { x: rx + rw + r, y: py };
  if (m === top) return { x: px, y: ry - r };
  return { x: px, y: ry + rh + r };
}

export function makeInput(canvas) {
  const input = {
    keys: {}, pressed: {}, mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: false,
    anyKey: false,
  };
  const code = (e) => e.code;
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code(e))) e.preventDefault();
    if (!input.keys[code(e)]) input.pressed[code(e)] = true;
    input.keys[code(e)] = true;
    input.anyKey = true;
  });
  window.addEventListener('keyup', (e) => { input.keys[code(e)] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    input.mouseDown = true; input.mouseClicked = true;
    const r = canvas.getBoundingClientRect();
    input.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    input.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  window.addEventListener('mouseup', () => { input.mouseDown = false; });
  input.endFrame = () => { input.pressed = {}; input.mouseClicked = false; input.anyKey = false; };
  input.isDown = (c) => !!input.keys[c];
  input.wasPressed = (c) => !!input.pressed[c];
  return input;
}

export function makeCamera() {
  return {
    x: 0, y: 0,
    follow(tx, ty, vw, vh, worldW, worldH) {
      this.x = clamp(lerp(this.x, tx - vw / 2, 0.12), 0, Math.max(0, worldW - vw));
      this.y = clamp(lerp(this.y, ty - vh / 2, 0.12), 0, Math.max(0, worldH - vh));
    },
    snap(tx, ty, vw, vh, worldW, worldH) {
      this.x = clamp(tx - vw / 2, 0, Math.max(0, worldW - vw));
      this.y = clamp(ty - vh / 2, 0, Math.max(0, worldH - vh));
    },
  };
}
