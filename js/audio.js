/* ============================================================
   AUDIO — original Web Audio battle SFX. No samples, no ROM rips.
   Square / triangle / saw + a short LFSR noise buffer.
   The AudioContext is created on the first tap (iOS Safari).
   Mute is stored in localStorage under "prbd-sound".
   ============================================================ */
const SFX = {
  on: true,
  ctx: null,
  master: null,
  _noise: null,
  _low: null,
  _primed: false,
  _tickAt: 0,
  KEY: 'prbd-sound',

  load() {
    try {
      const v = localStorage.getItem(this.KEY);
      if (v === 'off') this.on = false;
      else if (v === 'on') this.on = true;
    } catch (e) { /* private mode / file restrictions */ }
  },

  save() {
    try { localStorage.setItem(this.KEY, this.on ? 'on' : 'off'); } catch (e) { /* ignore */ }
  },

  /** Call from a user gesture. Safe to call again later. */
  unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.on ? 0.55 : 0;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this._primed) {
      // A one-sample buffer started inside the gesture unlocks iOS audio
      // even when the master bus is muted.
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      try { src.start(0); } catch (e) { /* already started */ }
      this._primed = true;
    }
    return true;
  },

  applyGain() {
    if (!this.master || !this.ctx) return;
    this.master.gain.setValueAtTime(this.on ? 0.55 : 0, this.ctx.currentTime);
  },

  toggle() {
    this.unlock();
    this.on = !this.on;
    this.applyGain();
    this.save();
    this.refreshLabels();
    if (this.on) this.blip();
    else this.stopLowHp();
    return this.on;
  },

  refreshLabels() {
    const word = this.on ? 'ON' : 'OFF';
    const title = document.getElementById('btn-sound');
    if (title) {
      title.textContent = `SOUND: ${word}`;
      title.setAttribute('aria-pressed', String(this.on));
      title.setAttribute('aria-label', this.on ? 'Mute sound' : 'Unmute sound');
    }
    const fab = document.getElementById('btn-sound-fab');
    if (fab) {
      fab.textContent = this.on ? 'ON' : 'OFF';
      fab.setAttribute('aria-pressed', String(this.on));
      fab.setAttribute('aria-label', this.on ? 'Mute sound' : 'Unmute sound');
    }
  },

  noiseBuf() {
    if (this._noise) return this._noise;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, sr, sr);
    const d = buf.getChannelData(0);
    let reg = 0x59a5;
    for (let i = 0; i < sr; i++) {
      const bit = (reg ^ (reg >> 1)) & 1;
      reg = (reg >> 1) | (bit << 14);
      d[i] = bit ? 0.85 : -0.85;
    }
    this._noise = buf;
    return buf;
  },

  tone(freq, dur = 0.08, { type = 'square', vol = 0.12, slide = 0, delay = 0 } = {}) {
    if (!this.on || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    const peak = Math.max(0.0002, vol);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.012, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.02, dur));
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  },

  noise(dur = 0.12, { vol = 0.14, freq = 900, q = 0.7, type = 'bandpass', slideTo = 0, delay = 0 } = {}) {
    if (!this.on || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (slideTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  },

  blip() { this.tone(1046, 0.05, { vol: 0.1 }); },
  select() {
    this.tone(784, 0.045, { vol: 0.1 });
    this.tone(1175, 0.06, { vol: 0.1, delay: 0.05 });
  },
  cancel() {
    this.tone(620, 0.05, { vol: 0.09 });
    this.tone(340, 0.07, { vol: 0.08, delay: 0.05, slide: -80 });
  },

  /** Move cast. `charge` is the sunlight turn of a two-turn move. */
  cast(move, { charge = false } = {}) {
    if (!this.on || !this.ctx || !move) return;
    if (charge) {
      this.tone(420, 0.18, { type: 'triangle', vol: 0.09, slide: 280 });
      this.tone(640, 0.22, { type: 'triangle', vol: 0.07, delay: 0.12, slide: 420 });
      this.tone(980, 0.16, { type: 'square', vol: 0.04, delay: 0.22 });
      return;
    }
    const play = MOVE_PATCH[move.name];
    if (play) { play(); return; }
    if (!move.power) {
      const up = !!(move.effect && move.effect.delta > 0);
      this.stat(up);
      return;
    }
    if (move.type === 'FIRE') return (move.power >= 75 ? MOVE_PATCH.FLAMETHROWER : MOVE_PATCH.EMBER)();
    if (move.type === 'WATER') return (move.power >= 55 ? MOVE_PATCH['WATER GUN'] : MOVE_PATCH.BUBBLE)();
    if (move.type === 'GRASS') {
      if (move.power >= 90) return MOVE_PATCH.SOLARBEAM();
      if (move.power >= 50) return MOVE_PATCH['RAZOR LEAF']();
      return MOVE_PATCH['VINE WHIP']();
    }
    if (move.type === 'POISON') return MOVE_PATCH.POISONPOWDER();
    if (move.power >= 70) return MOVE_PATCH['BODY SLAM']();
    MOVE_PATCH.TACKLE();
  },

  strike(mult = 1, crit = false) {
    if (crit) {
      this.noise(0.16, { vol: 0.2, freq: 1400, slideTo: 500, type: 'bandpass' });
      this.tone(180, 0.1, { type: 'sine', vol: 0.2, slide: -80 });
      [784, 988, 1318].forEach((f, i) => this.tone(f, 0.07, { type: 'square', vol: 0.08, delay: 0.04 + i * 0.045 }));
      return;
    }
    if (mult > 1) {
      this.noise(0.18, { vol: 0.2, freq: 1100, slideTo: 320, type: 'bandpass' });
      this.tone(160, 0.12, { type: 'sine', vol: 0.18, slide: -70 });
      this.tone(880, 0.08, { type: 'square', vol: 0.07, delay: 0.06 });
      this.tone(1320, 0.09, { type: 'square', vol: 0.06, delay: 0.1 });
      return;
    }
    if (mult < 1) {
      this.noise(0.08, { vol: 0.08, freq: 320, type: 'lowpass' });
      this.tone(140, 0.06, { type: 'triangle', vol: 0.06 });
      return;
    }
    this.noise(0.11, { vol: 0.15, freq: 700, slideTo: 240, type: 'lowpass' });
    this.tone(170, 0.08, { type: 'sine', vol: 0.14, slide: -60 });
  },

  miss() {
    this.tone(880, 0.09, { type: 'square', vol: 0.06, slide: -520 });
    this.noise(0.1, { vol: 0.06, freq: 1400, slideTo: 300, type: 'highpass' });
  },

  immune() {
    this.tone(220, 0.06, { type: 'square', vol: 0.05 });
    this.tone(160, 0.08, { type: 'square', vol: 0.05, delay: 0.07 });
  },

  stat(up) {
    const seq = up ? [523, 659, 784, 1046] : [784, 659, 523, 392];
    seq.forEach((f, i) => this.tone(f, 0.07, { type: 'square', vol: 0.07, delay: i * 0.055 }));
  },

  damageTick() {
    const now = performance.now();
    if (now - this._tickAt < 55) return;
    this._tickAt = now;
    this.tone(186, 0.022, { type: 'square', vol: 0.045 });
  },

  statusTick(kind) {
    if (kind === 'BRN') {
      this.noise(0.12, { vol: 0.1, freq: 600, slideTo: 180, type: 'bandpass' });
      this.tone(240, 0.08, { type: 'sawtooth', vol: 0.04, slide: -40 });
    } else if (kind === 'PSN') {
      this.tone(180, 0.06, { type: 'square', vol: 0.06 });
      this.tone(140, 0.07, { type: 'square', vol: 0.05, delay: 0.06 });
      this.noise(0.1, { vol: 0.06, freq: 400, type: 'lowpass' });
    } else {
      this.tone(520, 0.05, { type: 'triangle', vol: 0.06 });
      this.tone(390, 0.07, { type: 'triangle', vol: 0.05, delay: 0.05 });
    }
  },

  heal() {
    this.tone(523, 0.06, { type: 'triangle', vol: 0.08 });
    this.tone(784, 0.09, { type: 'triangle', vol: 0.07, delay: 0.06 });
  },

  sleep() {
    this.tone(392, 0.16, { type: 'triangle', vol: 0.07, slide: -70 });
    this.tone(294, 0.2, { type: 'triangle', vol: 0.05, delay: 0.14 });
  },

  paralyze() {
    for (let i = 0; i < 6; i++) this.tone(i % 2 ? 220 : 110, 0.028, { type: 'square', vol: 0.07, delay: i * 0.028 });
  },

  escape() {
    this.noise(0.16, { vol: 0.1, freq: 500, slideTo: 2400, type: 'bandpass' });
    this.tone(480, 0.12, { type: 'square', vol: 0.06, slide: 280 });
  },

  cry(base) {
    const f = base || 440;
    this.tone(f, 0.16, { type: 'sawtooth', slide: f * 0.45, vol: 0.05 });
    this.tone(f * 1.5, 0.2, { type: 'square', slide: -f * 0.7, vol: 0.045, delay: 0.14 });
  },

  faint(base) {
    const f = base || 300;
    this.tone(f, 0.55, { type: 'sawtooth', slide: -f * 0.75, vol: 0.06 });
    this.tone(f * 0.5, 0.5, { type: 'triangle', slide: -f * 0.3, vol: 0.05, delay: 0.05 });
  },

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(f, 0.14, { type: 'square', vol: 0.08, delay: i * 0.12 });
      this.tone(f / 2, 0.14, { type: 'triangle', vol: 0.05, delay: i * 0.12 });
    });
  },

  lose() {
    [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', vol: 0.08, delay: i * 0.16 }));
    this.tone(196, 0.4, { type: 'sawtooth', vol: 0.04, delay: 0.5, slide: -40 });
  },

  startLowHp() {
    if (this._low || !this.on || !this.ctx) return;
    const beep = () => {
      if (!this.on) return;
      this.tone(880, 0.055, { type: 'square', vol: 0.04 });
    };
    beep();
    this._low = setInterval(beep, 1080);
  },

  stopLowHp() {
    if (this._low) clearInterval(this._low);
    this._low = null;
  },
};

const MOVE_PATCH = {
  TACKLE() {
    SFX.tone(150, 0.09, { type: 'sine', vol: 0.2, slide: -70 });
    SFX.noise(0.07, { vol: 0.12, freq: 200, type: 'lowpass' });
  },
  SCRATCH() {
    for (let i = 0; i < 3; i++) {
      SFX.noise(0.04, { vol: 0.12, freq: 1800, slideTo: 600, type: 'highpass', delay: i * 0.05 });
      SFX.tone(900 + i * 180, 0.04, { type: 'square', vol: 0.05, delay: i * 0.05 });
    }
  },
  SLASH() {
    SFX.noise(0.1, { vol: 0.16, freq: 2200, slideTo: 500, type: 'highpass' });
    SFX.tone(420, 0.12, { type: 'square', vol: 0.07, slide: 900 });
  },
  'BODY SLAM'() {
    SFX.tone(90, 0.16, { type: 'sine', vol: 0.24, slide: -40 });
    SFX.noise(0.18, { vol: 0.18, freq: 180, type: 'lowpass' });
  },
  BITE() {
    SFX.noise(0.09, { vol: 0.18, freq: 500, slideTo: 140, type: 'bandpass' });
    SFX.tone(160, 0.08, { type: 'square', vol: 0.1, slide: -50 });
  },
  GROWL() {
    if (!SFX.ctx || !SFX.master) return;
    const dur = 0.36;
    const t0 = SFX.ctx.currentTime;
    const o = SFX.ctx.createOscillator();
    const g = SFX.ctx.createGain();
    o.type = 'sawtooth';
    for (let i = 0; i <= 14; i++) {
      const p = i / 14;
      o.frequency.setValueAtTime(210 - p * 90 + Math.sin(p * Math.PI * 6) * 18, t0 + dur * p);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.07, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(SFX.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },
  LEER() {
    SFX.tone(1760, 0.05, { type: 'square', vol: 0.06 });
    SFX.tone(2340, 0.07, { type: 'square', vol: 0.05, delay: 0.07 });
  },
  'TAIL WHIP'() {
    SFX.noise(0.12, { vol: 0.12, freq: 2000, slideTo: 400, type: 'bandpass' });
  },
  SMOKESCREEN() {
    SFX.noise(0.4, { vol: 0.12, freq: 1800, slideTo: 180, type: 'lowpass' });
  },
  GROWTH() {
    [523, 659, 784, 1046].forEach((f, i) => SFX.tone(f, 0.08, { type: 'triangle', vol: 0.08, delay: i * 0.07 }));
  },
  WITHDRAW() {
    SFX.tone(880, 0.05, { type: 'triangle', vol: 0.08 });
    SFX.tone(1320, 0.08, { type: 'triangle', vol: 0.07, delay: 0.06 });
    SFX.tone(1760, 0.1, { type: 'square', vol: 0.04, delay: 0.12 });
  },
  'VINE WHIP'() {
    SFX.noise(0.12, { vol: 0.12, freq: 500, slideTo: 1600, type: 'bandpass' });
    SFX.noise(0.05, { vol: 0.16, freq: 2400, type: 'highpass', delay: 0.12 });
    SFX.tone(220, 0.08, { type: 'triangle', vol: 0.06, delay: 0.12 });
  },
  'RAZOR LEAF'() {
    for (let i = 0; i < 4; i++) {
      SFX.noise(0.05, { vol: 0.1, freq: 1400, slideTo: 500, type: 'bandpass', delay: i * 0.07 });
      SFX.tone(700 + i * 40, 0.04, { type: 'square', vol: 0.04, delay: i * 0.07 });
    }
  },
  SOLARBEAM() {
    SFX.tone(80, 0.28, { type: 'sawtooth', vol: 0.1, slide: -30 });
    SFX.tone(660, 0.22, { type: 'square', vol: 0.06, slide: 400 });
    SFX.noise(0.28, { vol: 0.14, freq: 800, slideTo: 2400, type: 'bandpass' });
  },
  'LEECH SEED'() {
    [392, 494, 587].forEach((f, i) => SFX.tone(f, 0.07, { type: 'triangle', vol: 0.08, delay: i * 0.08 }));
    SFX.noise(0.08, { vol: 0.06, freq: 900, type: 'bandpass', delay: 0.22 });
  },
  'SLEEP POWDER'() {
    [880, 1174, 1318, 1568].forEach((f, i) => SFX.tone(f, 0.09, { type: 'triangle', vol: 0.05, delay: i * 0.07 }));
  },
  POISONPOWDER() {
    [196, 164, 220, 146].forEach((f, i) => SFX.tone(f, 0.08, { type: 'square', vol: 0.06, delay: i * 0.06 }));
    SFX.noise(0.2, { vol: 0.06, freq: 300, type: 'lowpass' });
  },
  EMBER() {
    SFX.noise(0.16, { vol: 0.14, freq: 900, slideTo: 300, type: 'bandpass' });
    SFX.tone(320, 0.1, { type: 'sawtooth', vol: 0.05, slide: 80 });
  },
  FLAMETHROWER() {
    SFX.noise(0.42, { vol: 0.16, freq: 400, slideTo: 1400, type: 'bandpass' });
    SFX.tone(140, 0.36, { type: 'sawtooth', vol: 0.05, slide: 40 });
  },
  BUBBLE() {
    [620, 540, 700, 480].forEach((f, i) => SFX.tone(f, 0.07, { type: 'sine', vol: 0.08, delay: i * 0.08, slide: -80 }));
  },
  'WATER GUN'() {
    SFX.tone(280, 0.16, { type: 'square', vol: 0.08, slide: 640 });
    SFX.noise(0.14, { vol: 0.12, freq: 1200, slideTo: 400, type: 'bandpass', delay: 0.08 });
  },
  STRUGGLE() {
    for (let i = 0; i < 4; i++) {
      SFX.noise(0.05, { vol: 0.12, freq: 800 + i * 200, type: 'bandpass', delay: i * 0.06 });
      SFX.tone(200 + i * 30, 0.05, { type: 'square', vol: 0.05, delay: i * 0.06 });
    }
  },
};
