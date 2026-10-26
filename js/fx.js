/* ============================================================
   FX — sprite animations, particles, and tiny chiptune SFX.
   All functions return Promises so battle code can `await` them.
   ============================================================ */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);

const FX = {
  // Generic Web-Animations helper
  play(el, keyframes, opts) {
    return el.animate(keyframes, { fill: 'none', ...opts }).finished.catch(() => {});
  },

  /** Battle intro: enemy slides in from the left, like Red. */
  slideIn(el, fromLeft = true) {
    return FX.play(el, [{ transform: `translateX(${fromLeft ? -120 : 120}vw)` }, { transform: 'translateX(0)' }],
      { duration: 900, easing: 'steps(18, end)' });
  },

  /** "Go! BULBASAUR!" — pop out of a Poké Ball. */
  popOut(el) {
    return FX.play(el, [
      { transform: 'scale(0.1)', opacity: 0, filter: 'brightness(4)' },
      { transform: 'scale(0.5)', opacity: 1, filter: 'brightness(4)', offset: 0.4 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ], { duration: 450, easing: 'steps(6, end)' });
  },

  /** Attacker lunges toward the foe. */
  lunge(el, isEnemy) {
    const d = isEnemy ? -1 : 1;
    return FX.play(el, [
      { transform: 'translate(0,0)' },
      { transform: `translate(${d * 22}px, ${-d * 10}px)`, offset: 0.4 },
      { transform: 'translate(0,0)' },
    ], { duration: 280, easing: 'steps(6, end)' });
  },

  /** Little hop for status moves. */
  hop(el) {
    return FX.play(el, [
      { transform: 'translateY(0)' }, { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' },
      { transform: 'translateY(-10px)' }, { transform: 'translateY(0)' },
    ], { duration: 400, easing: 'steps(4, end)' });
  },

  /** Classic Gen 1 hit: sprite blinks; screen shakes on big hits. */
  async hit(el, { strong = false } = {}) {
    if (strong) FX.screenShake();
    await FX.play(el, [
      { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 }, { opacity: 0 }, { opacity: 1 },
    ], { duration: 540, easing: 'steps(6, end)' });
  },

  screenShake() {
    return FX.play($('field'), [
      { transform: 'translate(0,0)' }, { transform: 'translate(-6px,2px)' }, { transform: 'translate(6px,-2px)' },
      { transform: 'translate(-4px,0)' }, { transform: 'translate(0,0)' },
    ], { duration: 320, easing: 'steps(4, end)' });
  },

  flash(times = 1) {
    return FX.play($('flash'), Array.from({ length: times * 2 + 1 }, (_, i) => ({ opacity: i % 2 ? 0.9 : 0 })),
      { duration: 160 * times, easing: `steps(${times * 2}, end)` });
  },

  /** Stat change: sprite flickers light/dark. */
  stat(el, up) {
    const f = up ? 'brightness(1.8)' : 'brightness(0.4)';
    return FX.play(el, [{ filter: 'none' }, { filter: f }, { filter: 'none' }, { filter: f }, { filter: 'none' }],
      { duration: 500, easing: 'steps(4, end)' });
  },

  /** Faint: sprite slides down out of its clip box. */
  faint(img) {
    const base = img.classList.contains('flip') ? 'scaleX(-1) ' : '';
    return FX.play(img, [{ transform: base + 'translateY(0)' }, { transform: base + 'translateY(105%)' }],
      { duration: 600, easing: 'steps(10, end)', fill: 'forwards' });
  },

  center(el) {
    const f = $('field').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2, w: r.width, h: r.height };
  },

  /** Pixel particles flying from attacker → defender in the move's type colors. */
  async projectile(fromEl, toEl, type, count = 8) {
    const fx = $('fx'); const a = FX.center(fromEl); const b = FX.center(toEl);
    const colors = TYPE_COLORS[type] || TYPE_COLORS.NORMAL;
    const ps = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div'); p.className = 'p';
      p.style.background = colors[i % colors.length];
      p.style.outline = '2px solid #181820';
      fx.appendChild(p);
      const jx = (Math.random() - 0.5) * b.w * 0.6, jy = (Math.random() - 0.5) * b.h * 0.6;
      ps.push(FX.play(p, [
        { transform: `translate(${a.x}px, ${a.y}px)`, opacity: 1 },
        { transform: `translate(${(a.x + b.x) / 2 + jx * 0.3}px, ${Math.min(a.y, b.y) - 30 + jy * 0.3}px)`, offset: 0.5 },
        { transform: `translate(${b.x + jx}px, ${b.y + jy}px)`, opacity: 1 },
      ], { duration: 520, delay: i * 45, easing: 'steps(8, end)', fill: 'backwards' }).then(() => p.remove()));
    }
    await Promise.all(ps);
  },

  /** Powder / spores sprinkling down on the target. */
  async powder(toEl, type, count = 14) {
    const fx = $('fx'); const b = FX.center(toEl);
    const colors = TYPE_COLORS[type] || TYPE_COLORS.NORMAL;
    const ps = [];
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div'); p.className = 'p';
      p.style.background = colors[i % colors.length];
      fx.appendChild(p);
      const x = b.x + (Math.random() - 0.5) * b.w * 0.8;
      ps.push(FX.play(p, [
        { transform: `translate(${x}px, ${b.y - b.h / 2}px)`, opacity: 1 },
        { transform: `translate(${x + (Math.random() - 0.5) * 20}px, ${b.y + b.h / 3}px)`, opacity: 0 },
      ], { duration: 700, delay: i * 40, easing: 'steps(7, end)', fill: 'backwards' }).then(() => p.remove()));
    }
    await Promise.all(ps);
  },

  /** Floating text e.g. "Z" for sleep. */
  async floatText(el, txt) {
    const fx = $('fx'); const b = FX.center(el);
    const t = document.createElement('div'); t.className = 'txt'; t.textContent = txt; fx.appendChild(t);
    await FX.play(t, [{ transform: `translate(${b.x}px, ${b.y - b.h / 3}px)` }, { transform: `translate(${b.x + 20}px, ${b.y - b.h / 2 - 20}px)`, opacity: 0 }],
      { duration: 700, easing: 'steps(6, end)' });
    t.remove();
  },
};

/* ---------------- SFX (Web Audio, square-wave chiptune) ---------------- */
const SFX = {
  on: true, ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } } if (this.ctx?.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur = 0.08, { type = 'square', vol = 0.08, slide = 0, delay = 0 } = {}) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.15, vol = 0.12) {
    if (!this.on || !this.ctx) return;
    const n = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); g.gain.value = vol;
    s.buffer = buf; s.connect(g).connect(this.ctx.destination); s.start();
  },
  blip() { this.tone(1046, 0.05); },
  select() { this.tone(784, 0.05); this.tone(1175, 0.06, { delay: 0.05 }); },
  hit(mult = 1) { this.noise(mult > 1 ? 0.28 : 0.15, mult > 1 ? 0.18 : mult < 1 ? 0.06 : 0.12); },
  cry(base) { this.tone(base, 0.18, { type: 'sawtooth', slide: base * 0.5, vol: 0.05 }); this.tone(base * 1.4, 0.22, { type: 'square', slide: -base * 0.8, vol: 0.04, delay: 0.16 }); },
  faint(base) { this.tone(base, 0.6, { type: 'sawtooth', slide: -base * 0.8, vol: 0.05 }); },
  stat(up) { [0, 1, 2, 3].forEach((i) => this.tone(up ? 500 + i * 120 : 900 - i * 120, 0.06, { delay: i * 0.06 })); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, { delay: i * 0.12, vol: 0.06 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.18, { delay: i * 0.18, vol: 0.06 })); },
};
