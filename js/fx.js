/* ============================================================
   FX — sprite poses + crisp pixel attack VFX on one canvas.
   Effects are drawn at a low integer resolution and scaled up
   with nearest-neighbor so they stay chunky on phones.
   Every function the battle awaits returns a Promise.
   New moves: add a name to MOVE_SCENE, or rely on sceneForMove()
   which picks a type / category fallback.
   ============================================================ */
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const $ = (id) => document.getElementById(id);

const FX = {
  play(el, keyframes, opts) {
    if (!el || !el.animate) return Promise.resolve();
    return el.animate(keyframes, { fill: 'none', ...opts }).finished.catch(() => {});
  },

  /** Battle intro: enemy slides in from the left, like Red. */
  slideIn(el, fromLeft = true) {
    return FX.play(el, [
      { transform: `translateX(${fromLeft ? -120 : 120}vw)` },
      { transform: 'translateX(0)' },
    ], { duration: 900, easing: 'steps(18, end)' });
  },

  /** "Go! BULBASAUR!" — pop out of a Poké Ball. */
  popOut(el) {
    return FX.play(el, [
      { transform: 'scale(0.1)', opacity: 0, filter: 'brightness(4)' },
      { transform: 'scale(0.5)', opacity: 1, filter: 'brightness(4)', offset: 0.4 },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ], { duration: 450, easing: 'steps(6, end)' });
  },

  /** Defender hit: opacity blink. The white sprite background matches the field. */
  hit(el, { strong = false } = {}) {
    return FX.play(el, [
      { opacity: 1 }, { opacity: 0.1 }, { opacity: 1 }, { opacity: 0.15 }, { opacity: 1 },
      { opacity: strong ? 0.2 : 1 }, { opacity: 1 },
    ], { duration: strong ? 420 : 300, easing: 'steps(7, end)' });
  },

  screenShake() {
    const field = $('field');
    if (!field) return Promise.resolve();
    return FX.play(field, [
      { transform: 'translate(0,0)' },
      { transform: 'translate(-6px, 2px)' },
      { transform: 'translate(6px, -3px)' },
      { transform: 'translate(-4px, 1px)' },
      { transform: 'translate(3px, -1px)' },
      { transform: 'translate(0,0)' },
    ], { duration: 320, easing: 'steps(6, end)' });
  },

  flash(times = 1) {
    const el = $('flash');
    if (!el) return Promise.resolve();
    el.style.background = '#fff';
    return FX.play(el, Array.from({ length: times * 2 + 1 }, (_, i) => ({ opacity: i % 2 ? 0.85 : 0 })),
      { duration: 120 * times, easing: `steps(${times * 2}, end)` });
  },

  /** Short colored flash that does not hide the whole strike. */
  tint(color, opacity = 0.28, dur = 140) {
    const el = $('flash');
    if (!el) return Promise.resolve();
    el.style.background = color;
    return FX.play(el, [
      { opacity: 0 }, { opacity }, { opacity: 0 },
    ], { duration: dur, easing: 'steps(3, end)' }).then(() => { el.style.background = '#fff'; });
  },

  /** Stat change pulse. Opacity, not a dark filter — sprites have opaque white backgrounds. */
  stat(el, up) {
    return FX.play(el, [
      { opacity: 1 },
      { opacity: up ? 1 : 0.45 },
      { opacity: 1 },
      { opacity: up ? 1 : 0.45 },
      { opacity: 1 },
    ], { duration: 380, easing: 'steps(4, end)' });
  },

  faint(img) {
    const base = img.classList.contains('flip') ? 'scaleX(-1) ' : '';
    return FX.play(img, [
      { transform: base + 'translateY(0)' },
      { transform: base + 'translateY(105%)' },
    ], { duration: 600, easing: 'steps(10, end)', fill: 'forwards' });
  },

  async floatText(el, txt) {
    const fx = $('fx');
    if (!fx || !el) return;
    const b = Layer.locCss(el);
    const t = document.createElement('div');
    t.className = 'txt';
    t.textContent = txt;
    fx.appendChild(t);
    await FX.play(t, [
      { transform: `translate(${b.x}px, ${b.y - b.h / 3}px)`, opacity: 1 },
      { transform: `translate(${b.x + 16}px, ${b.y - b.h / 2 - 18}px)`, opacity: 0 },
    ], { duration: 700, easing: 'steps(6, end)' });
    t.remove();
  },

  prepare() { Layer.ensure(); },

  sceneFor(move, opts) { return sceneForMove(move, opts || {}); },

  /**
   * Play a move's pixel animation.
   * onImpact runs at the hit frame (HP drain / hit blink belong there).
   * Resolves when the animation ends. Capped near 1.2s.
   * If the canvas cannot draw, onImpact still runs so the battle never sticks.
   */
  playMove(attEl, defEl, move, opts = {}) {
    return playScene(attEl, defEl, move, opts);
  },

  /** Short status sprinkle (burn / poison / leech tick). No cast sound. */
  sprinkle(el, kind) {
    const type = kind === 'FIRE' ? 'FIRE' : kind === 'POISON' ? 'POISON' : kind === 'GRASS' ? 'GRASS' : 'NORMAL';
    const name = kind === 'FIRE' ? 'EMBER' : kind === 'POISON' ? 'POISONPOWDER' : 'SLEEP POWDER';
    const move = { name, type, power: 0 };
    return playScene(el, el, move, { brief: true, silent: true, scene: 'powder' });
  },

  /** Paralysis spark. */
  zap(el) {
    const move = { name: 'ZAP', type: 'NORMAL', power: 0 };
    return playScene(el, el, move, { silent: true, scene: 'static' });
  },
};

/* ---------------- Canvas layer ---------------- */
const INK = '#181820';

const Layer = {
  pixel: 3,
  canvas: null,
  ctx: null,
  token: 0,

  ensure() {
    if (!this.canvas) {
      this.canvas = $('vfx');
      if (!this.canvas) return false;
      this.ctx = this.canvas.getContext('2d', { alpha: true });
    }
    this.fit();
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    return !!(this.ctx && this.canvas.width && this.canvas.height);
  },

  fit() {
    const field = $('field');
    if (!field || !this.canvas) return;
    const cssW = field.clientWidth;
    const cssH = field.clientHeight;
    if (!cssW || !cssH) return;
    const pixel = cssW >= 460 ? 4 : 3;
    const pw = Math.max(64, Math.floor(cssW / pixel));
    const ph = Math.max(48, Math.floor(cssH / pixel));
    this.pixel = pixel;
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
    this.canvas.style.width = `${pw * pixel}px`;
    this.canvas.style.height = `${ph * pixel}px`;
  },

  /** Sprite anchor in canvas pixels. */
  loc(el) {
    const c = this.canvas.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const sx = this.canvas.width / (c.width || 1);
    const sy = this.canvas.height / (c.height || 1);
    return {
      x: (r.left - c.left + r.width / 2) * sx,
      y: (r.top - c.top + r.height / 2) * sy,
      w: r.width * sx,
      h: r.height * sy,
    };
  },

  /** Same anchor in CSS pixels, for the floating "Z". */
  locCss(el) {
    const f = $('field').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left - f.left + r.width / 2,
      y: r.top - f.top + r.height / 2,
      w: r.width,
      h: r.height,
    };
  },

  clear() {
    if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
};

/* ---------------- Pixel helpers (all snapped to the grid) ---------------- */
const COL = {
  fire: ['#fff6d0', '#f8d030', '#f07820', '#d02810', '#701008'],
  water: ['#f4fbff', '#b5e4ff', '#3aa0f0', '#1c58b0', '#102848'],
  grass: ['#f2ffd0', '#98e860', '#30a048', '#187030', '#604018'],
  poison: ['#f8e8ff', '#d898f0', '#9840c0', '#581880', '#301040'],
  normal: ['#ffffff', '#e4e4d4', '#b0b0a0', '#686860', '#303028'],
  sun: ['#fffce8', '#ffe060', '#f8c020', '#f09010'],
  smoke: ['#f7f7f7', '#c8c8c8', '#888890', '#484850'],
};

const PAT = {
  flame: ['..3..', '.322.', '32123', '.310.', '..0..'],
  leaf: ['.333.', '33333', '33223', '.313.', '..1..'],
  bubble: ['.222.', '2...2', '2...2', '2...2', '.222.'],
  seed: ['.22.', '2132', '2112', '.11.'],
  fang: ['3.3', '333', '3.3', '.2.', '.1.'],
  star: ['.2.', '212', '.2.'],
  puff: ['.11.', '1111', '1111', '.11.'],
  drop: ['.2.', '222', '212', '.1.'],
  eye: ['11111', '1.2.1', '11111'],
};

const PAL = {
  fire: { 0: COL.fire[4], 1: COL.fire[3], 2: COL.fire[2], 3: COL.fire[1], 4: COL.fire[0] },
  leaf: { 1: COL.grass[4], 2: COL.grass[2], 3: COL.grass[1], 4: COL.grass[0] },
  water: { 1: COL.water[4], 2: COL.water[2], 3: COL.water[1], 4: COL.water[0] },
  poison: { 1: COL.poison[4], 2: COL.poison[2], 3: COL.poison[1], 4: COL.poison[0] },
  seed: { 1: COL.grass[3], 2: COL.grass[1], 3: COL.grass[0] },
  fang: { 1: '#f8f8f8', 2: '#d0d0dc', 3: '#f8f8f8' },
  star: { 1: '#fff6c8', 2: '#ffffff' },
  puff: { 1: '#c8c8c8' },
  smoke: { 1: '#b0b0b0', 2: '#e8e8e8' },
  eye: { 1: INK, 2: '#f03030' },
  sun: { 1: COL.sun[3], 2: COL.sun[1], 3: COL.sun[0] },
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function qbez(a, b, c, t) {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * b.x + t * t * c.x,
    y: u * u * a.y + 2 * u * t * b.y + t * t * c.y,
  };
}

function withAlpha(ctx, alpha, fn) {
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * clamp01(alpha);
  fn();
  ctx.globalAlpha = prev;
}

function blob(ctx, x, y, color, s) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  const n = Math.max(1, s);
  ctx.fillStyle = INK;
  ctx.fillRect(ix - 1, iy - 1, n + 2, n + 2);
  ctx.fillStyle = color;
  ctx.fillRect(ix, iy, n, n);
}

function line(ctx, x0, y0, x1, y1, color, width) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy)));
  const w = Math.max(1, width);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    ctx.fillRect(Math.round(x0 + dx * k), Math.round(y0 + dy * k), w, w);
  }
}

function ring(ctx, x, y, r, color, width) {
  const steps = Math.max(10, Math.floor(Math.abs(r) * 1.7));
  const w = Math.max(1, width);
  ctx.fillStyle = color;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), w, w);
  }
}

function arc(ctx, x, y, r, a0, a1, color, width) {
  const steps = Math.max(4, Math.floor(Math.abs(a1 - a0) * Math.max(1, r)));
  const w = Math.max(1, width);
  ctx.fillStyle = color;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), w, w);
  }
}

function disc(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  const step = 1;
  for (let j = -ry; j <= ry; j += step) {
    const yy = ry ? j / ry : 0;
    const xx = Math.sqrt(Math.max(0, 1 - yy * yy));
    const w = Math.max(1, Math.round(rx * xx * 2));
    ctx.fillRect(Math.round(x - w / 2), Math.round(y + j), w, step);
  }
}

function stamp(ctx, rows, x, y, palette, angle, scale) {
  const h = rows.length;
  const w = rows[0].length;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const sc = Math.max(1, scale);
  const pts = [];
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      const lx = i - (w - 1) / 2;
      const ly = j - (h - 1) / 2;
      pts.push([
        Math.round(x + (lx * c - ly * s) * sc),
        Math.round(y + (lx * s + ly * c) * sc),
        ch,
      ]);
    }
  }
  ctx.fillStyle = INK;
  for (let i = 0; i < pts.length; i++) {
    const rx = pts[i][0];
    const ry = pts[i][1];
    ctx.fillRect(rx - sc, ry, sc, sc);
    ctx.fillRect(rx + sc, ry, sc, sc);
    ctx.fillRect(rx, ry - sc, sc, sc);
    ctx.fillRect(rx, ry + sc, sc, sc);
  }
  for (let i = 0; i < pts.length; i++) {
    ctx.fillStyle = palette[pts[i][2]] || '#ffffff';
    ctx.fillRect(pts[i][0], pts[i][1], sc, sc);
  }
}

function impactBurst(ctx, x, y, t, impactAt, colors, u) {
  if (t < impactAt) return;
  const p = (t - impactAt) / Math.max(0.2, 1 - impactAt);
  const fade = p > 0.55 ? 1 - (p - 0.55) / 0.45 : 1;
  withAlpha(ctx, fade, () => {
    const r = u * (2 + Math.min(1, p) * 7);
    ring(ctx, x, y, r, INK, Math.max(1, u - 1));
    ring(ctx, x, y, Math.max(1, r - u), colors[1] || colors[0], Math.max(1, u - 1));
    if (p < 0.35) blob(ctx, x - u * 0.5, y - u * 0.5, colors[0], u * 2);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      const d = r * (i % 2 ? 0.95 : 0.55);
      blob(ctx, x + Math.cos(ang) * d, y + Math.sin(ang) * d, colors[i % colors.length], u);
    }
  });
}

function makeGeom(attEl, defEl, opts) {
  const from = Layer.loc(attEl);
  const to = Layer.loc(defEl);
  const u = Math.max(2, Math.min(4, Math.round(Math.max(from.h, to.h, 28) / 30)));
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const push = Math.min(from.w || 20, from.h || 20) * 0.3;
  const muzzle = { x: from.x + ux * push, y: from.y + uy * push * 0.85 };
  let aim = {
    x: to.x - ux * Math.min(to.w || 20, to.h || 20) * 0.1,
    y: to.y - uy * Math.min(to.w || 20, to.h || 20) * 0.06,
  };
  if (opts.miss) {
    aim = {
      x: from.x + dx * 0.58 + px * u * 7,
      y: from.y + dy * 0.4 - u * 5,
    };
  }
  return { from, to, u, ux, uy, px, py, muzzle, aim, len };
}

/* ---------------- Scenes ----------------
   Each factory closes over geom / move / opts and returns
   { duration, impactAt, motion, shake, tint, draw }.
   draw(ctx, t) must be a pure function of t (no Math.random).
   -------------------------------------------------------------- */
function arcCtrl(geom, spread) {
  return {
    x: (geom.muzzle.x + geom.aim.x) / 2 + geom.px * spread,
    y: Math.min(geom.muzzle.y, geom.aim.y) - geom.u * 7,
  };
}

const SCENES = {
  impact(geom, move, opts) {
    return {
      duration: 520,
      impactAt: 0.46,
      motion: 'lunge',
      draw(ctx, t) {
        const p = seg(t, 0.1, 0.46);
        const pos = lerp(geom.muzzle, geom.aim, p);
        speedLines(ctx, geom, p);
        blob(ctx, pos.x, pos.y, COL.normal[0], geom.u * 2);
        blob(ctx, pos.x - geom.u, pos.y, COL.normal[2], geom.u);
        if (!opts.miss && !opts.immune) {
          impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.46, COL.normal, geom.u);
          dust(ctx, geom.aim, t, 0.46, geom.u, COL.normal[3]);
        }
      },
    };
  },

  slash(geom, move, opts) {
    return {
      duration: 640,
      impactAt: 0.56,
      motion: 'lunge',
      draw(ctx, t) {
          claws(ctx, geom, t, 3, COL.normal[0]);
          if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.56, COL.normal, geom.u);
        },
    };
  },

  slashHeavy(geom, move, opts) {
    return {
      duration: 700,
      impactAt: 0.5,
      motion: 'lunge',
      shake: true,
      draw(ctx, t) {
        claws(ctx, geom, t, 2, '#f8f8ff', true);
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.5, COL.normal, geom.u);
      },
    };
  },

  slam(geom, move, opts) {
    return {
      duration: 760,
      impactAt: 0.52,
      motion: 'lunge',
      shake: true,
      draw(ctx, t) {
        const p = seg(t, 0.08, 0.52);
        const y = geom.aim.y - (1 - p) * Math.max(geom.u * 14, geom.len * 0.28);
        const rx = geom.u * (4 + p * 2);
        const ry = geom.u * (3.2 + (p > 0.92 ? 0.8 : 0));
        disc(ctx, geom.aim.x, y, rx + 1, ry + 1, INK);
        disc(ctx, geom.aim.x, y, rx, ry, '#f0e8d0');
        disc(ctx, geom.aim.x, y - ry * 0.25, rx * 0.45, ry * 0.28, '#ffffff');
        if (!opts.miss && !opts.immune) {
          impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.52, COL.normal, geom.u + 1);
          dust(ctx, geom.aim, t, 0.52, geom.u, COL.normal[3]);
        }
      },
    };
  },

  bite(geom, move, opts) {
    return {
      duration: 600,
      impactAt: 0.62,
      motion: 'lunge',
      draw(ctx, t) {
        const p = seg(t, 0.16, 0.62);
        const gap = (1 - p) * geom.u * 8;
        stamp(ctx, PAT.fang, geom.aim.x - gap, geom.aim.y - gap * 0.7, PAL.fang, -0.5, geom.u);
        stamp(ctx, PAT.fang, geom.aim.x + gap, geom.aim.y - gap * 0.7, PAL.fang, 0.5, geom.u);
        if (!opts.miss && !opts.immune && t >= 0.62) {
          impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.62, ['#ffffff', '#f03030', '#d8d8e0'], geom.u);
        }
      },
    };
  },

  struggle(geom, move, opts) {
    return {
      duration: 720,
      impactAt: 0.5,
      motion: 'lunge',
      shake: true,
      draw(ctx, t) {
        claws(ctx, geom, t, 4, '#f8d0d0');
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.5, COL.fire, geom.u);
      },
    };
  },

  embers(geom, move, opts) {
    return {
      duration: 860,
      impactAt: 0.64,
      motion: 'lean',
      draw(ctx, t) {
        const n = 5;
        for (let i = 0; i < n; i++) {
          const delay = i * 0.08;
          const lt = seg(t, delay, delay + 0.5);
          if (lt <= 0) continue;
          const ctrl = arcCtrl(geom, (i - 2) * geom.u * 3.4);
          const pos = qbez(geom.muzzle, ctrl, geom.aim, lt);
          const pat = ((i + Math.floor(t * 12)) % 2) ? PAT.flame : PAT.flame;
          stamp(ctx, pat, pos.x, pos.y, PAL.fire, lt * 2 + i, geom.u);
          if (lt > 0.15) {
            const tail = qbez(geom.muzzle, ctrl, geom.aim, Math.max(0, lt - 0.16));
            blob(ctx, tail.x, tail.y, COL.fire[3], geom.u);
          }
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.6, COL.fire, geom.u);
      },
    };
  },

  flamethrower(geom, move, opts) {
    return {
      duration: 980,
      impactAt: 0.58,
      motion: 'lean',
      shake: true,
      tint: '#f8a060',
      draw(ctx, t) {
        cone(ctx, geom, t, COL.fire, opts, 3.2);
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.58, COL.fire, geom.u + 1);
      },
    };
  },

  bubbles(geom, move, opts) {
    return {
      duration: 900,
      impactAt: 0.7,
      motion: 'lean',
      draw(ctx, t) {
        for (let i = 0; i < 6; i++) {
          const delay = i * 0.08;
          const lt = seg(t, delay, delay + 0.55);
          if (lt <= 0) continue;
          const ctrl = arcCtrl(geom, (i - 2.5) * geom.u * 3);
          const pos = qbez(geom.muzzle, ctrl, geom.aim, lt);
          pos.x += Math.sin(lt * 7 + i) * geom.u;
          if (lt < 0.92 || opts.miss) {
            stamp(ctx, PAT.bubble, pos.x, pos.y, PAL.water, 0, geom.u);
            blob(ctx, pos.x - geom.u * 1.2, pos.y - geom.u * 1.2, '#ffffff', Math.max(1, geom.u - 1));
          } else {
            popDrops(ctx, pos, (lt - 0.92) / 0.08, geom.u);
          }
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.7, COL.water, geom.u);
      },
    };
  },

  hydro(geom, move, opts) {
    return {
      duration: 660,
      impactAt: 0.5,
      motion: 'lean',
      draw(ctx, t) {
        const reach = seg(t, 0.08, 0.5);
        jet(ctx, geom, reach, COL.water, geom.u);
        if (!opts.miss && !opts.immune) {
          splash(ctx, geom.aim, t, 0.5, geom.u);
          impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.5, COL.water, geom.u);
        }
      },
    };
  },

  vine(geom, move, opts) {
    return {
      duration: 760,
      impactAt: 0.72,
      motion: 'lean',
      draw(ctx, t) {
        const grow = seg(t, 0.06, 0.72);
        const end = grow;
        const ctrl = {
          x: (geom.muzzle.x + geom.aim.x) / 2 + geom.px * geom.u * 5,
          y: Math.min(geom.muzzle.y, geom.aim.y) - geom.u * 8,
        };
        const steps = 22;
        const n = Math.max(1, Math.floor(steps * end));
        for (let i = 0; i <= n; i++) {
          const p = qbez(geom.muzzle, ctrl, geom.aim, i / steps);
          const col = i % 3 === 0 ? COL.grass[3] : COL.grass[1];
          blob(ctx, p.x, p.y, col, i % 4 === 0 ? geom.u + 1 : geom.u);
        }
        const tip = qbez(geom.muzzle, ctrl, geom.aim, end);
        stamp(ctx, PAT.leaf, tip.x, tip.y, PAL.leaf, end * 3, geom.u);
        if (!opts.miss && !opts.immune && t >= 0.72) {
          const ang = Math.atan2(geom.uy, geom.ux);
          line(ctx,
            geom.aim.x - Math.cos(ang + 1.2) * geom.u * 4,
            geom.aim.y - Math.sin(ang + 1.2) * geom.u * 4,
            geom.aim.x + Math.cos(ang + 1.2) * geom.u * 4,
            geom.aim.y + Math.sin(ang + 1.2) * geom.u * 4,
            '#ffffff', geom.u);
          impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.72, COL.grass, geom.u);
        }
      },
    };
  },

  leaves(geom, move, opts) {
    return {
      duration: 880,
      impactAt: 0.66,
      motion: 'lean',
      draw(ctx, t) {
        for (let i = 0; i < 5; i++) {
          const delay = i * 0.07;
          const lt = seg(t, delay, delay + 0.52);
          if (lt <= 0) continue;
          const ctrl = arcCtrl(geom, (i - 2) * geom.u * 4);
          const pos = qbez(geom.muzzle, ctrl, geom.aim, Math.min(1, lt));
          stamp(ctx, PAT.leaf, pos.x, pos.y, PAL.leaf, lt * 7 + i, geom.u);
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.66, COL.grass, geom.u);
      },
    };
  },

  beam(geom, move, opts) {
    const at = 0.62;
    return {
      duration: 1080,
      impactAt: at,
      motion: 'lean',
      shake: true,
      tint: '#f8f090',
      draw(ctx, t) {
        const charge = seg(t, 0, 0.3);
        ring(ctx, geom.muzzle.x, geom.muzzle.y, geom.u * (2 + charge * 3), COL.sun[1], geom.u);
        blob(ctx, geom.muzzle.x, geom.muzzle.y, COL.sun[0], geom.u * 2);
        for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * Math.PI * 2 + t * 2;
          const inner = geom.u * 3;
          const outer = geom.u * (5 + charge * 5);
          line(ctx,
            geom.muzzle.x + Math.cos(ang) * inner, geom.muzzle.y + Math.sin(ang) * inner,
            geom.muzzle.x + Math.cos(ang) * outer, geom.muzzle.y + Math.sin(ang) * outer,
            i % 2 ? COL.sun[1] : COL.grass[1], Math.max(1, geom.u - 1));
        }
        const reach = seg(t, 0.28, at);
        if (reach > 0) {
          const end = lerp(geom.muzzle, geom.aim, reach);
          band(ctx, geom.muzzle, end, geom.u * 3, COL.grass[3]);
          band(ctx, geom.muzzle, end, geom.u * 2, COL.grass[1]);
          band(ctx, geom.muzzle, end, Math.max(1, geom.u - 1), COL.sun[0]);
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, at, COL.sun.concat(COL.grass), geom.u + 1);
      },
    };
  },

  seeds(geom, move, opts) {
    return {
      duration: 860,
      impactAt: 0.74,
      motion: 'lean',
      draw(ctx, t) {
        for (let i = 0; i < 3; i++) {
          const delay = 0.06 + i * 0.1;
          const lt = seg(t, delay, delay + 0.48);
          if (lt <= 0) continue;
          const ctrl = arcCtrl(geom, (i - 1) * geom.u * 4);
          const pos = qbez(geom.muzzle, ctrl, geom.aim, lt);
          stamp(ctx, PAT.seed, pos.x, pos.y, PAL.seed, 0.4 + i, geom.u);
          if (!opts.miss && lt > 0.92) {
            blob(ctx, pos.x, pos.y - geom.u * 2, COL.grass[1], geom.u);
            blob(ctx, pos.x, pos.y - geom.u * 3.2, COL.grass[0], Math.max(1, geom.u - 1));
          }
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.74, COL.grass, geom.u);
      },
    };
  },

  powder(geom, move, opts) {
    const colors = powderColors(move);
    const count = opts.brief ? 10 : 16;
    const duration = opts.brief ? 460 : 900;
    return {
      duration,
      impactAt: opts.brief ? 0.55 : 0.78,
      motion: opts.brief ? 'none' : 'hop',
      draw(ctx, t) {
        const anchor = opts.brief ? geom.from : geom.aim;
        const box = opts.brief ? geom.from : geom.to;
        for (let i = 0; i < count; i++) {
          const delay = (i % 6) * 0.05;
          const fall = seg(t, delay, opts.brief ? 0.9 : 0.88);
          if (fall <= 0) continue;
          const x = anchor.x + Math.sin(i * 12.9898) * (box.w || 30) * 0.38 + Math.sin(fall * 5 + i) * geom.u * 2;
          const y = anchor.y - (box.h || 30) * 0.45 + fall * (box.h || 36) * 0.75;
          blob(ctx, x, y, colors[i % colors.length], Math.max(1, geom.u - (i % 2)));
        }
      },
    };
  },

  smoke(geom, move, opts) {
    return {
      duration: 860,
      impactAt: 0.68,
      motion: 'hop',
      draw(ctx, t) {
        for (let i = 0; i < 7; i++) {
          const p = seg(t, i * 0.05, 0.8);
          if (p <= 0) continue;
          const ang = (i / 7) * Math.PI * 2;
          const r = p * geom.u * 7;
          const target = opts.miss ? geom.aim : geom.to;
          withAlpha(ctx, p < 0.75 ? 1 : 1 - (p - 0.75) / 0.25, () => {
            stamp(ctx, PAT.puff, target.x + Math.cos(ang) * r, target.y - target.h * 0.1 + Math.sin(ang) * r * 0.65, PAL.puff, 0, geom.u + (i % 2));
          });
        }
      },
    };
  },

  roar(geom, move, opts) {
    return {
      duration: 640,
      impactAt: 0.48,
      motion: 'hop',
      draw(ctx, t) {
        const dir = Math.atan2(geom.uy, geom.ux);
        for (let i = 0; i < 3; i++) {
          const p = seg(t, i * 0.1, i * 0.1 + 0.42);
          if (p <= 0) continue;
          const r = geom.u * (3 + p * 9);
          const span = 1.15;
          withAlpha(ctx, 1 - p * 0.3, () => {
            arc(ctx, geom.muzzle.x, geom.muzzle.y, r, dir - span, dir + span, i % 2 ? COL.normal[2] : INK, Math.max(1, geom.u - 1));
          });
        }
      },
    };
  },

  leer(geom, move, opts) {
    return {
      duration: 600,
      impactAt: 0.55,
      motion: 'none',
      draw(ctx, t) {
        const blink = Math.floor(t * 10) % 2 === 0;
        if (t < 0.5 && blink) {
          const y = geom.from.y - geom.from.h * 0.42;
          stamp(ctx, PAT.eye, geom.from.x - geom.u * 3, y, PAL.eye, 0, geom.u);
          stamp(ctx, PAT.eye, geom.from.x + geom.u * 3, y, PAL.eye, 0, geom.u);
        }
        const z = seg(t, 0.32, 0.58);
        if (z > 0) {
          const y = geom.from.y - geom.from.h * 0.42;
          const end = lerp({ x: geom.from.x, y }, geom.aim, z);
          line(ctx, geom.from.x, y, end.x, end.y, INK, geom.u);
          line(ctx, geom.from.x, y, end.x, end.y, '#ffffff', Math.max(1, geom.u - 1));
        }
      },
    };
  },

  whip(geom, move, opts) {
    return {
      duration: 560,
      impactAt: 0.6,
      motion: 'lunge',
      draw(ctx, t) {
        const p = seg(t, 0.12, 0.62);
        const dir = Math.atan2(geom.uy, geom.ux);
        const a0 = dir - 1.2;
        const a1 = a0 + 2.3 * p;
        const r = Math.max(geom.u * 6, (opts.miss ? geom.len * 0.35 : Math.min(geom.to.w, geom.to.h) * 0.38));
        arc(ctx, geom.aim.x, geom.aim.y, r, a0, a1, INK, geom.u + 1);
        arc(ctx, geom.aim.x, geom.aim.y, r, a0, a1, '#f0e0b0', geom.u);
        if (!opts.miss && !opts.immune && t > 0.6) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.6, COL.normal, geom.u);
      },
    };
  },

  aura(geom, move, opts) {
    const colors = move.type === 'WATER' ? COL.water : move.type === 'FIRE' ? COL.fire : COL.grass;
    return {
      duration: 720,
      impactAt: 0.4,
      motion: 'hop',
      draw(ctx, t) { sparkleRing(ctx, geom.from, t, geom.u, colors); },
    };
  },

  shell(geom, move, opts) {
    return {
      duration: 680,
      impactAt: 0.55,
      motion: 'none',
      draw(ctx, t) {
        const p = seg(t, 0.08, 0.7);
        const r = Math.max(geom.u * 8, geom.from.w * 0.42);
        const segs = 10;
        const n = Math.max(1, Math.floor(segs * p));
        for (let i = 0; i < n; i++) {
          const a0 = (i / segs) * Math.PI * 2;
          const a1 = ((i + 0.55) / segs) * Math.PI * 2;
          arc(ctx, geom.from.x, geom.from.y, r, a0, a1, INK, geom.u + 1);
          arc(ctx, geom.from.x, geom.from.y, r, a0, a1, COL.water[1], geom.u);
        }
        if (p > 0.4) ring(ctx, geom.from.x, geom.from.y, r * 0.55, COL.water[0], Math.max(1, geom.u - 1));
      },
    };
  },

  sunlight(geom, move, opts) {
    return {
      duration: 800,
      impactAt: 0.5,
      motion: 'hop',
      draw(ctx, t) {
        const pulse = 0.65 + Math.sin(t * Math.PI * 2) * 0.35;
        blob(ctx, geom.from.x, geom.from.y - geom.from.h * 0.15, COL.sun[0], geom.u * 2);
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + t * 1.4;
          const inner = geom.u * 3;
          const outer = geom.u * (6 + pulse * 6);
          line(ctx,
            geom.from.x + Math.cos(ang) * inner,
            geom.from.y + Math.sin(ang) * inner,
            geom.from.x + Math.cos(ang) * outer,
            geom.from.y + Math.sin(ang) * outer,
            i % 2 ? COL.sun[1] : COL.sun[2], geom.u);
        }
        sparkleRing(ctx, geom.from, t, geom.u, COL.sun);
      },
    };
  },

  debuff(geom, move, opts) {
    return {
      duration: 640,
      impactAt: 0.55,
      motion: 'hop',
      draw(ctx, t) {
        const anchor = geom.aim;
        for (let i = 0; i < 3; i++) {
          const p = seg(t, i * 0.12, i * 0.12 + 0.5);
          if (p <= 0) continue;
          const y = anchor.y - geom.u * 6 + p * geom.u * 12;
          const x = anchor.x + (i - 1) * geom.u * 4;
          withAlpha(ctx, 1 - Math.max(0, p - 0.7) / 0.3, () => {
            line(ctx, x - geom.u * 2, y, x, y + geom.u * 2, INK, geom.u);
            line(ctx, x + geom.u * 2, y, x, y + geom.u * 2, INK, geom.u);
            line(ctx, x - geom.u * 2, y, x, y + geom.u * 2, '#6868c8', Math.max(1, geom.u - 1));
            line(ctx, x + geom.u * 2, y, x, y + geom.u * 2, '#6868c8', Math.max(1, geom.u - 1));
          });
        }
      },
    };
  },

  poison(geom, move, opts) {
    return {
      duration: 820,
      impactAt: 0.68,
      motion: 'lean',
      draw(ctx, t) {
        for (let i = 0; i < 4; i++) {
          const lt = seg(t, i * 0.08, i * 0.08 + 0.5);
          if (lt <= 0) continue;
          const ctrl = arcCtrl(geom, (i - 1.5) * geom.u * 3);
          const pos = qbez(geom.muzzle, ctrl, geom.aim, lt);
          stamp(ctx, PAT.puff, pos.x, pos.y, PAL.poison, 0, geom.u);
          blob(ctx, pos.x, pos.y + lt * geom.u * 2, COL.poison[2], geom.u);
        }
        if (!opts.miss && !opts.immune) impactBurst(ctx, geom.aim.x, geom.aim.y, t, 0.68, COL.poison, geom.u);
      },
    };
  },

  sparkle(geom, move, opts) {
    return {
      duration: 600,
      impactAt: 0.4,
      motion: 'hop',
      draw(ctx, t) { sparkleRing(ctx, geom.from, t, geom.u, COL.normal); },
    };
  },

  static(geom) {
    return {
      duration: 420,
      impactAt: 0.3,
      motion: 'none',
      draw(ctx, t) {
        const flick = Math.floor(t * 14);
        for (let i = 0; i < 4; i++) {
          if ((flick + i) % 2 === 0) continue;
          const x = geom.from.x + (i - 1.5) * geom.u * 3;
          const y0 = geom.from.y - geom.from.h * 0.35;
          const y1 = geom.from.y + geom.from.h * 0.2;
          line(ctx, x, y0, x + ((i % 2) ? geom.u * 2 : -geom.u * 2), (y0 + y1) / 2, '#f8e040', geom.u);
          line(ctx, x + ((i % 2) ? geom.u * 2 : -geom.u * 2), (y0 + y1) / 2, x, y1, '#f8f8a0', geom.u);
        }
      },
    };
  },
};

function speedLines(ctx, geom, p) {
  if (p <= 0 || p >= 1) return;
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * geom.u * 2.4;
    const a = lerp(geom.muzzle, geom.aim, Math.max(0, p - 0.28));
    const b = lerp(geom.muzzle, geom.aim, p);
    line(ctx, a.x + geom.px * off, a.y + geom.py * off, b.x + geom.px * off, b.y + geom.py * off, INK, 1);
  }
}

function dust(ctx, aim, t, at, u, color) {
  if (t < at) return;
  const q = (t - at) / Math.max(0.2, 1 - at);
  for (let i = 0; i < 6; i++) {
    const x = aim.x + (i - 2.5) * u * 2.2;
    const y = aim.y + q * u * 4 + Math.abs(i - 2.5);
    withAlpha(ctx, 1 - q, () => blob(ctx, x, y, color, Math.max(1, u - 1)));
  }
}

function claws(ctx, geom, t, count, color, cross = false) {
  const boxW = (geom.to.w || geom.u * 16) * 0.34;
  const boxH = (geom.to.h || geom.u * 16) * 0.26;
  for (let i = 0; i < count; i++) {
    const a = 0.12 + i * (0.46 / count);
    const b = a + 0.2;
    const p = seg(t, a, b);
    if (p <= 0) continue;
    const shift = (i - (count - 1) / 2) * geom.u * 3;
    let x0;
    let y0;
    let x1;
    let y1;
    if (cross && i === 1) {
      x0 = geom.aim.x + boxW; y0 = geom.aim.y - boxH;
      x1 = geom.aim.x - boxW; y1 = geom.aim.y + boxH;
    } else {
      x0 = geom.aim.x - boxW + shift * 0.2;
      y0 = geom.aim.y - boxH + shift;
      x1 = geom.aim.x + boxW + shift * 0.2;
      y1 = geom.aim.y + boxH * 0.3 + shift;
    }
    const x = x0 + (x1 - x0) * p;
    const y = y0 + (y1 - y0) * p;
    line(ctx, x0, y0, x, y, INK, geom.u + 2);
    line(ctx, x0, y0, x, y, color, geom.u);
  }
}

function cone(ctx, geom, t, colors, opts, spreadMul) {
  const reach = seg(t, 0.1, 0.55);
  const flick = Math.floor(t * 16);
  const dist = geom.len * reach;
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const d = (i / steps) * dist;
    const spread = geom.u * (0.8 + (geom.len ? d / geom.len : 0) * spreadMul);
    for (let k = -3; k <= 3; k++) {
      if ((i * 3 + k + flick) % 4 === 0) continue;
      const wob = Math.sin(i * 0.9 + flick * 0.6 + k) * geom.u;
      const x = geom.muzzle.x + geom.ux * d + geom.px * (k * spread * 0.42 + wob);
      const y = geom.muzzle.y + geom.uy * d + geom.py * (k * spread * 0.42 + wob);
      const heat = Math.min(colors.length - 1, Math.abs(k) + ((i + flick) % 2));
      blob(ctx, x, y, colors[heat], geom.u);
    }
  }
}

function jet(ctx, geom, reach, colors, u) {
  const end = lerp(geom.muzzle, geom.aim, reach);
  band(ctx, geom.muzzle, end, u * 2, colors[3]);
  band(ctx, geom.muzzle, end, u, colors[2]);
  band(ctx, geom.muzzle, end, Math.max(1, u - 1), colors[0]);
}

function band(ctx, a, b, half, color) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const steps = Math.min(140, Math.ceil(len));
  ctx.fillStyle = color;
  const h = Math.max(0, Math.round(half));
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const x = a.x + dx * k;
    const y = a.y + dy * k;
    for (let w = -h; w <= h; w++) {
      ctx.fillRect(Math.round(x + px * w), Math.round(y + py * w), 1, 1);
    }
  }
}

function splash(ctx, aim, t, at, u) {
  if (t < at) return;
  const p = (t - at) / Math.max(0.2, 1 - at);
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI + (i / 6) * Math.PI;
    const rr = u * (2 + p * 7) * (0.75 + (i % 2) * 0.25);
    const x = aim.x + Math.cos(ang) * rr;
    const y = aim.y + Math.sin(ang) * rr + p * p * u * 5;
    stamp(ctx, PAT.drop, x, y, PAL.water, ang + Math.PI / 2, Math.max(1, u - 1));
  }
}

function popDrops(ctx, pos, p, u) {
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2;
    blob(ctx, pos.x + Math.cos(ang) * p * u * 3, pos.y + Math.sin(ang) * p * u * 3, COL.water[1], Math.max(1, u - 1));
  }
}

function sparkleRing(ctx, anchor, t, u, colors) {
  for (let i = 0; i < 8; i++) {
    const p = (t * 1.15 + i * 0.12) % 1;
    const ang = (i / 8) * Math.PI * 2;
    const r = Math.max(u * 6, (anchor.w || 20) * 0.34);
    const x = anchor.x + Math.cos(ang) * r;
    const y = anchor.y + Math.sin(ang) * r * 0.62 - p * u * 9;
    withAlpha(ctx, p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1, () => {
      stamp(ctx, PAT.star, x, y, { 1: colors[2] || colors[0], 2: colors[0] }, 0, Math.max(1, u - 1));
    });
  }
}

function powderColors(move) {
  if (move.type === 'FIRE' || move.name === 'EMBER') return COL.fire;
  if (move.type === 'POISON' || move.name === 'POISONPOWDER') return COL.poison;
  if (move.name === 'SLEEP POWDER') return ['#e8ffd8', '#d8f0b0', '#f0d8ff', '#b8e8c8', '#f8f8ff'];
  return COL.grass;
}

function critStars(ctx, aim, t, impactAt, u) {
  if (t < impactAt) return;
  const p = (t - impactAt) / Math.max(0.2, 1 - impactAt);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.5;
    const d = u * 7 * Math.min(1, p);
    stamp(ctx, PAT.star, aim.x + Math.cos(ang) * d, aim.y + Math.sin(ang) * d, { 1: '#f8d030', 2: '#ffffff' }, 0, u);
  }
}

/* Name → scene. Anything missing uses sceneForMove(). */
const MOVE_SCENE = {
  TACKLE: 'impact',
  SCRATCH: 'slash',
  SLASH: 'slashHeavy',
  'BODY SLAM': 'slam',
  BITE: 'bite',
  STRUGGLE: 'struggle',
  EMBER: 'embers',
  FLAMETHROWER: 'flamethrower',
  BUBBLE: 'bubbles',
  'WATER GUN': 'hydro',
  'VINE WHIP': 'vine',
  'RAZOR LEAF': 'leaves',
  SOLARBEAM: 'beam',
  'LEECH SEED': 'seeds',
  'SLEEP POWDER': 'powder',
  POISONPOWDER: 'powder',
  SMOKESCREEN: 'smoke',
  GROWL: 'roar',
  LEER: 'leer',
  'TAIL WHIP': 'whip',
  GROWTH: 'aura',
  WITHDRAW: 'shell',
};

function sceneForMove(move, opts) {
  if (opts && opts.scene) return opts.scene;
  if (!move) return 'impact';
  if (opts && opts.charge) return 'sunlight';
  if (MOVE_SCENE[move.name]) return MOVE_SCENE[move.name];
  if (!move.power) {
    const ef = move.effect;
    if (!ef) return 'sparkle';
    if (ef.kind === 'leech') return 'seeds';
    if (ef.kind === 'status') return 'powder';
    if (ef.kind === 'stat') {
      if (ef.delta > 0) return 'aura';
      if (ef.stat === 'acc') return 'smoke';
      return 'debuff';
    }
    return 'sparkle';
  }
  switch (move.type) {
    case 'FIRE': return move.power >= 75 ? 'flamethrower' : 'embers';
    case 'WATER': return move.power >= 55 ? 'hydro' : 'bubbles';
    case 'GRASS': return move.power >= 90 ? 'beam' : move.power >= 50 ? 'leaves' : 'vine';
    case 'POISON': return 'poison';
    default: return move.power >= 80 ? 'slam' : move.power >= 55 ? 'slash' : 'impact';
  }
}

function cancelAnim(el) {
  if (!el || !el.getAnimations) return;
  el.getAnimations().forEach((a) => a.cancel());
}

function keyframes(list) {
  const out = [];
  let last = -1;
  for (const frame of list) {
    if (frame.offset == null) { out.push(frame); continue; }
    if (frame.offset <= last) continue;
    out.push(frame);
    last = frame.offset;
  }
  if (!out.length || out[out.length - 1].offset !== 1) out.push({ transform: 'translate(0,0)', offset: 1 });
  return out;
}

function startMotion(attEl, defEl, scene, duration, impactAt, opts, move) {
  if (!attEl || scene.motion === 'none') return;
  const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 3;
  const sign = attEl.id === 'enemy-anim' ? -1 : 1;
  const dist = 9 * s;
  const lean = 4.5 * s;
  let frames;
  if (scene.motion === 'lunge') {
    const back = Math.min(0.18, impactAt * 0.45);
    frames = keyframes([
      { transform: 'translate(0,0)', offset: 0 },
      { transform: `translate(${-sign * dist * 0.35}px, ${sign * dist * 0.15}px)`, offset: back },
      { transform: `translate(${sign * dist}px, ${-sign * dist * 0.42}px)`, offset: impactAt },
      { transform: `translate(${sign * dist * 0.12}px, ${-sign * 2}px)`, offset: Math.min(0.9, impactAt + 0.18) },
      { transform: 'translate(0,0)', offset: 1 },
    ]);
  } else if (scene.motion === 'hop') {
    frames = [
      { transform: 'translateY(0)', offset: 0 },
      { transform: 'translateY(-8px)', offset: 0.2 },
      { transform: 'translateY(0)', offset: 0.4 },
      { transform: 'translateY(-6px)', offset: 0.62 },
      { transform: 'translateY(0)', offset: 1 },
    ];
  } else {
    const hold = Math.max(0.28, impactAt);
    frames = keyframes([
      { transform: 'translate(0,0)', offset: 0 },
      { transform: `translate(${sign * lean}px, ${-sign * lean * 0.35}px)`, offset: 0.16 },
      { transform: `translate(${sign * lean}px, ${-sign * lean * 0.35}px)`, offset: hold },
      { transform: 'translate(0,0)', offset: 1 },
    ]);
  }
  cancelAnim(attEl);
  attEl.animate(frames, { duration, easing: 'steps(8, end)', fill: 'none' });

  const recoil = scene.motion === 'lunge' && move && move.power && !opts.miss && !opts.immune && defEl && defEl !== attEl;
  if (!recoil) return;
  const ds = defEl.id === 'enemy-anim' ? 1 : -1;
  const kick = 5 * s;
  const mid = Math.min(0.96, impactAt + 0.12);
  cancelAnim(defEl);
  defEl.animate(keyframes([
    { transform: 'translate(0,0)', offset: 0 },
    { transform: 'translate(0,0)', offset: impactAt },
    { transform: `translate(${ds * kick}px, ${-ds * kick * 0.45}px)`, offset: mid },
    { transform: 'translate(0,0)', offset: 1 },
  ]), { duration, easing: 'steps(6, end)', fill: 'none' });
}

function playScene(attEl, defEl, move, opts) {
  return new Promise((resolve) => {
    const finishEarly = () => {
      try { if (opts.onImpact) opts.onImpact(); } catch (e) { console.error(e); }
      resolve();
    };
    if (!attEl || !move) { finishEarly(); return; }
    if (!Layer.ensure()) { finishEarly(); return; }

    const geom = makeGeom(attEl, defEl || attEl, opts);
    const sceneName = sceneForMove(move, opts);
    const factory = SCENES[sceneName] || SCENES.impact;
    const scene = factory(geom, move, opts);
    const duration = Math.min(1200, scene.duration || 700);
    const impactAt = opts.miss ? Math.min(0.88, (scene.impactAt || 0.6)) : (scene.impactAt || 0.6);

    if (!opts.silent && window.SFX) {
      try { SFX.cast(move, { charge: !!opts.charge }); } catch (e) { console.error(e); }
    }
    startMotion(attEl, defEl || attEl, scene, duration, impactAt, opts, move);

    const token = ++Layer.token;
    let done = false;
    let impacted = false;
    const t0 = performance.now();
    const timer = setTimeout(finish, duration + 450);

    function fireImpact() {
      if (impacted) return;
      impacted = true;
      if (!opts.miss && !opts.immune && (scene.shake || opts.heavy)) FX.screenShake();
      if (!opts.miss && !opts.immune && !opts.crit && scene.tint) FX.tint(scene.tint, 0.26, 150);
      try { if (opts.onImpact) opts.onImpact(); } catch (e) { console.error(e); }
    }

    function frame(now) {
      if (done) return;
      if (token !== Layer.token) { finish(); return; }
      const t = Math.min(1, (now - t0) / duration);
      const ctx = Layer.ctx;
      ctx.clearRect(0, 0, Layer.canvas.width, Layer.canvas.height);
      const missFade = !opts.miss ? 1 : (t < 0.68 ? 1 : Math.max(0, 1 - (t - 0.68) / 0.32));
      ctx.globalAlpha = missFade;
      try { scene.draw(ctx, t); } catch (e) { console.error(e); finish(); return; }
      if (opts.crit && !opts.miss && !opts.immune) critStars(ctx, geom.aim, t, impactAt, geom.u);
      if (opts.immune && t >= impactAt) {
        const p = (t - impactAt) / Math.max(0.2, 1 - impactAt);
        ctx.globalAlpha = 1 - p * 0.4;
        stamp(ctx, PAT.puff, geom.aim.x, geom.aim.y, { 1: '#b0b0a4' }, 0, geom.u + 1);
      }
      ctx.globalAlpha = 1;
      if (t >= impactAt) fireImpact();
      if (t < 1) requestAnimationFrame(frame);
      else finish();
    }

    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      fireImpact();
      if (token === Layer.token) Layer.clear();
      resolve();
    }

    requestAnimationFrame(frame);
  });
}
