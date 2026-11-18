// audio.js — WebAudio synth SFX and a simple synth music loop (radio).
// No audio files: every sound is synthesized in code.

export function makeAudio() {
  const A = {
    ctx: null, musicOn: true, radioOn: true, musicTimer: null, step: 0, volume: 1,
    setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); },
    ensure() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(freq, dur, type, vol, slideTo) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime((vol || 0.15) * this.volume, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol, low) {
      const ctx = this.ensure();
      if (!ctx) return;
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = low || 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(ctx.destination);
      src.start(t);
    },
    sfx(name) {
      if (!this.ctx && name !== 'click') this.ensure();
      switch (name) {
        case 'click': this.tone(660, 0.06, 'square', 0.08); break;
        case 'door': this.tone(220, 0.12, 'triangle', 0.18, 140); break;
        case 'steal': this.tone(880, 0.1, 'square', 0.12); this.tone(1100, 0.12, 'square', 0.12); break;
        case 'crash': this.noise(0.25, 0.3, 700); this.tone(90, 0.2, 'sawtooth', 0.2, 40); break;
        case 'shoot': this.noise(0.12, 0.25, 3000); this.tone(160, 0.08, 'square', 0.15, 60); break;
        case 'empty': this.tone(1200, 0.05, 'square', 0.1); break;
        case 'punch': this.noise(0.1, 0.25, 500); break;
        case 'cash': this.tone(1320, 0.08, 'sine', 0.15); setTimeout(() => this.tone(1760, 0.12, 'sine', 0.15), 70); break;
        case 'checkpoint': this.tone(880, 0.1, 'sine', 0.18); setTimeout(() => this.tone(1174, 0.14, 'sine', 0.18), 90); break;
        case 'mission': this.tone(523, 0.12, 'square', 0.12); setTimeout(() => this.tone(659, 0.12, 'square', 0.12), 110); setTimeout(() => this.tone(784, 0.2, 'square', 0.12), 220); break;
        case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'triangle', 0.18), i * 120)); break;
        case 'fail': [400, 350, 300, 220].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sawtooth', 0.12), i * 130)); break;
        case 'siren': this.tone(700, 0.4, 'sine', 0.07, 1100); setTimeout(() => this.tone(1100, 0.4, 'sine', 0.07, 700), 400); break;
        case 'heli': this.noise(0.8, 0.12, 400); break;
        case 'hurt': this.tone(200, 0.15, 'sawtooth', 0.15, 90); break;
        case 'pickup': this.tone(990, 0.08, 'sine', 0.14); break;
        default: this.tone(440, 0.08, 'square', 0.1); break;
      }
    },
    // Simple synthwave bass + arp loop, 8 steps a bar, toggled with R (radio).
    startMusic() {
      if (this.musicTimer) return;
      const bass = [55, 55, 65.4, 49, 55, 55, 73.4, 82.4];
      const arp = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196];
      this.musicTimer = setInterval(() => {
        if (!this.radioOn || !this.ctx) return;
        const i = this.step % 8;
        this.tone(bass[i], 0.42, 'sawtooth', 0.05);
        if (i % 2 === 0) this.tone(arp[i], 0.2, 'square', 0.03);
        if (i === 0) this.noise(0.05, 0.05, 6000);
        this.step += 1;
      }, 240);
    },
    stopMusic() {
      if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    },
    toggleRadio() {
      this.radioOn = !this.radioOn;
      return this.radioOn;
    },
  };
  return A;
}
