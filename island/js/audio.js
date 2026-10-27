/* Kenney CC0 footsteps / UI clicks, plus original Web Audio stingers.
   Nothing here is sampled from a Pokémon game. */
const IslandAudio = (function () {
  const KEY = 'pogo-island-mute';
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }

  let ctx = null;
  let noise = null;
  const files = {};

  function buffer(src, volume) {
    const a = new Audio(src);
    a.preload = 'auto';
    a.volume = volume;
    return a;
  }

  for (let i = 0; i < 5; i++) files['step' + i] = buffer('assets/sfx/footstep0' + i + '.ogg', 0.32);
  files.click = buffer('assets/sfx/metalClick.ogg', 0.4);
  files.book = buffer('assets/sfx/bookOpen.ogg', 0.4);

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const n = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noise = n;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }

  function playFile(a) {
    if (muted || !a) return;
    try {
      a.currentTime = 0;
      const p = a.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) { /* autoplay */ }
  }

  let stepN = 0;
  function footstep() { playFile(files['step' + (stepN++ % 5)]); }
  function click() { playFile(files.click); }
  function book() { playFile(files.book); }

  function envGain(g, t, dur, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  function tone(freq, dur, type, peak, slide) {
    if (muted || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    envGain(g, t, dur, peak || 0.08);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function burst(dur, peak) {
    if (muted || !ctx || !noise) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 900;
    const g = ctx.createGain();
    envGain(g, t, dur, peak || 0.12);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur);
  }

  function encounter() {
    tone(440, 0.12, 'square', 0.06);
    setTimeout(function () { tone(554, 0.12, 'square', 0.06); }, 90);
    setTimeout(function () { tone(659, 0.18, 'square', 0.07); }, 180);
  }
  function throwBall() { burst(0.18, 0.15); tone(320, 0.16, 'triangle', 0.05, 180); }
  function caught() {
    [523, 659, 784, 1046].forEach(function (f, i) {
      setTimeout(function () { tone(f, 0.14, 'square', 0.07); }, i * 90);
    });
  }
  function broke() { tone(180, 0.2, 'square', 0.07, -80); burst(0.08, 0.08); }
  function fled() {
    tone(494, 0.1, 'square', 0.05, -80);
    setTimeout(function () { tone(330, 0.16, 'square', 0.05, -60); }, 100);
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  return {
    unlock: unlock,
    footstep: footstep,
    click: click,
    book: book,
    encounter: encounter,
    throwBall: throwBall,
    caught: caught,
    broke: broke,
    fled: fled,
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); return muted; },
  };
})();
