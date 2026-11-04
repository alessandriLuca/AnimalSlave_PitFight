// Audio sintetizzato con WebAudio: effetti + musica a loop
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null; this.master = null; this.musicGain = null;
    this.muted = false; this.musicOn = true; this.theme = null; this.step = 0; this.timer = null; this.nextTime = 0;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      if (this.theme) this.music(this.theme, true);
    } catch (e) { this.ctx = null; }
  }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  tone(freq, dur, type = 'square', vol = 0.15, when = 0, slide = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol = 0.2, when = 0, filterF = 1200) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterF;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.05);
  }
  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'ui': this.tone(880, 0.06, 'square', 0.06); break;
      case 'select': this.tone(660, 0.05, 'square', 0.07); this.tone(990, 0.08, 'square', 0.07, 0.05); break;
      case 'hit': this.noise(0.18, 0.35, 0, 1800); this.tone(160, 0.15, 'square', 0.12, 0, 0.5); break;
      case 'superhit': this.noise(0.3, 0.45, 0, 3000); this.tone(220, 0.25, 'sawtooth', 0.14, 0, 0.3); this.tone(110, 0.3, 'square', 0.1, 0.05, 0.5); break;
      case 'weakhit': this.noise(0.1, 0.2, 0, 900); break;
      case 'miss': this.tone(500, 0.2, 'sine', 0.08, 0, 0.5); break;
      case 'heal': [0, 4, 7, 12].forEach((n, i) => this.tone(NOTE(72 + n), 0.15, 'triangle', 0.1, i * 0.07)); break;
      case 'buff': [0, 7, 12].forEach((n, i) => this.tone(NOTE(67 + n), 0.12, 'square', 0.06, i * 0.06)); break;
      case 'debuff': [12, 7, 0].forEach((n, i) => this.tone(NOTE(60 + n), 0.12, 'square', 0.06, i * 0.06)); break;
      case 'throw': this.tone(300, 0.3, 'sine', 0.1, 0, 3); break;
      case 'shake': this.tone(180, 0.06, 'square', 0.08); this.tone(140, 0.06, 'square', 0.06, 0.08); break;
      case 'caught': [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(NOTE(72 + n), 0.16, 'square', 0.08, i * 0.1)); break;
      case 'escape': this.tone(400, 0.25, 'sawtooth', 0.08, 0, 0.4); break;
      case 'faint': this.tone(440, 0.6, 'square', 0.1, 0, 0.25); break;
      case 'level': [0, 4, 7, 12, 16].forEach((n, i) => this.tone(NOTE(76 + n), 0.12, 'square', 0.07, i * 0.07)); break;
      case 'encounter': [0, 3, 6, 9, 12].forEach((n, i) => this.tone(NOTE(60 + n), 0.1, 'sawtooth', 0.08, i * 0.05)); break;
      case 'win': [0, 4, 7, 12, 12, 16, 19, 24].forEach((n, i) => this.tone(NOTE(67 + n), 0.18, 'square', 0.08, i * 0.11)); break;
      case 'lose': [12, 8, 5, 0].forEach((n, i) => this.tone(NOTE(60 + n), 0.3, 'triangle', 0.1, i * 0.2)); break;
      case 'evolve': for (let i = 0; i < 12; i++) this.tone(NOTE(60 + i * 2), 0.12, 'triangle', 0.08, i * 0.09); break;
      case 'coin': this.tone(NOTE(88), 0.06, 'square', 0.06); this.tone(NOTE(93), 0.2, 'square', 0.06, 0.06); break;
      case 'step': this.noise(0.04, 0.03, 0, 600); break;
    }
  }

  // ------------------------------------------------------------- musica
  music(theme, force = false) {
    if (this.theme === theme && !force) return;
    this.theme = theme; this.step = 0;
    if (!this.ctx) return;
    if (this.timer) clearInterval(this.timer);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 50);
  }
  schedule() {
    if (!this.ctx || !this.theme) return;
    const T = THEMES[this.theme];
    const spb = 60 / T.bpm / 2; // croma
    while (this.nextTime < this.ctx.currentTime + 0.25) {
      if (this.musicOn && !this.muted) T.play(this, this.step, this.nextTime - this.ctx.currentTime, spb);
      this.step++;
      this.nextTime += spb;
    }
  }
}

const THEMES = {
  world: {
    bpm: 96,
    play(a, s, w, spb) {
      const chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
      const bar = Math.floor(s / 8) % 4, i = s % 8;
      const ch = chords[bar];
      a.tone(NOTE(ch[i % 3] + (i > 3 ? 12 : 0)), spb * 0.9, 'triangle', 0.05, w, 0, a.musicGain);
      if (i % 4 === 0) a.tone(NOTE(ch[0] - 24), spb * 3.5, 'sine', 0.09, w, 0, a.musicGain);
      const mel = [76, 0, 74, 72, 74, 0, 67, 0, 72, 0, 74, 76, 79, 0, 76, 0, 77, 76, 74, 0, 72, 0, 69, 0, 72, 74, 72, 0, 67, 0, 0, 0];
      const n = mel[s % 32];
      if (n && (Math.floor(s / 32) % 2 === 1)) a.tone(NOTE(n), spb * 1.6, 'square', 0.025, w, 0, a.musicGain);
    },
  },
  battle: {
    bpm: 150,
    play(a, s, w, spb) {
      const roots = [57, 57, 53, 55];
      const bar = Math.floor(s / 8) % 4, i = s % 8;
      const r = roots[bar];
      a.tone(NOTE(r - 12 + (i % 2 ? 12 : 0)), spb * 0.8, 'sawtooth', 0.045, w, 0, a.musicGain);
      if (i % 2 === 0) a.noise(0.05, 0.06, w, i % 4 === 0 ? 400 : 5000);
      const mel = [69, 72, 76, 72, 69, 72, 76, 79, 77, 76, 74, 72, 74, 0, 72, 0, 65, 69, 72, 69, 67, 71, 74, 76, 74, 72, 71, 69, 71, 0, 64, 0];
      const n = mel[s % 32];
      if (n) a.tone(NOTE(n), spb * 0.9, 'square', 0.03, w, 0, a.musicGain);
    },
  },
  pit: {
    bpm: 168,
    play(a, s, w, spb) {
      const roots = [50, 50, 48, 46, 50, 50, 53, 52];
      const bar = Math.floor(s / 8) % 8, i = s % 8;
      const r = roots[bar];
      a.tone(NOTE(r - 12 + (i % 2 ? 12 : 0)), spb * 0.8, 'sawtooth', 0.05, w, 0, a.musicGain);
      if (i % 2 === 0) a.noise(0.06, 0.08, w, i % 4 === 0 ? 300 : 6000);
      const mel = [74, 0, 77, 74, 81, 0, 79, 77, 76, 0, 72, 76, 74, 0, 0, 0];
      const n = mel[s % 16];
      if (n && bar % 2 === 0) a.tone(NOTE(n), spb * 0.9, 'square', 0.035, w, 0, a.musicGain);
    },
  },
};
