/* Pokémon Red audio, played by a small Game Boy APU model (pulse, wave, noise).
   Music and effects are the pret/pokered sequences, not samples:
   https://github.com/pret/pokered
   - audio/music/pallettown.asm  (Pallet Town, the island overworld theme)
   - audio/sfx/press_ab_1.asm, ball_toss.asm, ball_poof.asm, caught_mon.asm,
     run.asm, collision_1.asm
   Note lengths, pitches, duty, and envelopes follow audio/engine_1.asm. */
const IslandAudio = (function () {
  const KEY = 'pogo-island-mute';
  const FPS = 4194304 / 70224;
  let muted = false;
  try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* private mode */ }

  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let timer = null;
  let musicOn = false;
  let duckUntil = 0;
  let origin = 0;
  const live = [];

  const PITCHES = [0xF82C, 0xF89D, 0xF907, 0xF96B, 0xF9CA, 0xFA23, 0xFA77, 0xFAC7, 0xFB12, 0xFB58, 0xFB9B, 0xFBDA];
  const NOTE = { C_: 0, 'C#': 1, D_: 2, 'D#': 3, E_: 4, F_: 5, 'F#': 6, G_: 7, 'G#': 8, A_: 9, 'A#': 10, B_: 11 };
  const WAVE2 = [1, 3, 6, 9, 11, 13, 14, 14, 14, 14, 15, 15, 15, 15, 14, 13, 13, 14, 15, 15, 15, 15, 14, 14, 14, 14, 13, 11, 9, 6, 3, 1];
  const WAVE0 = [0, 2, 4, 6, 8, 10, 12, 14, 15, 15, 15, 14, 14, 13, 13, 12, 12, 11, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1, 1];

  const PALLET_1 = [
    'tempo 160', 'duty_cycle 2', 'note_type 12, 12, 3',
    'octave 3', 'note B_, 4', 'octave 4', 'note C_, 2', 'note D_, 4', 'note G_, 2', 'note D_, 2', 'note C_, 2',
    'octave 3', 'note B_, 4', 'note G_, 2', 'octave 4', 'note D_, 4', 'note D_, 2', 'note C_, 2',
    'octave 3', 'note B_, 2', 'rest 2', 'note B_, 2', 'octave 4', 'note C_, 2', 'octave 3', 'note B_, 2',
    'octave 4', 'note C_, 8', 'rest 2', 'octave 3', 'note B_, 2', 'octave 4', 'note C_, 2', 'octave 3', 'note A_, 2',
    'note B_, 2', 'note G_, 2', 'note A_, 2', 'note F#, 2',
    'note B_, 4', 'octave 4', 'note C_, 2', 'note D_, 4', 'note G_, 2', 'note D_, 2', 'note C_, 2',
    'octave 3', 'note B_, 4', 'note G_, 2', 'octave 4', 'note D_, 4', 'note D_, 2', 'note G_, 2', 'note F#, 2',
    'note E_, 4', 'note D_, 2', 'note C_, 4', 'octave 3', 'note A_, 2', 'note B_, 2', 'octave 4', 'note C_, 2',
    'note D_, 2', 'note C_, 2', 'octave 3', 'note B_, 2', 'note A_, 2', 'note G_, 4', 'note F#, 4',
    'octave 4', 'note C_, 2', 'octave 3', 'note G_, 2', 'note E_, 2', 'note G_, 2',
    'octave 4', 'note D_, 2', 'octave 3', 'note A_, 2', 'note F#, 2', 'note A_, 2',
    'note_type 12, 11, 3',
    'note B_, 2', 'note G_, 2', 'note D_, 2', 'note G_, 2', 'note B_, 2', 'note G_, 2', 'note D_, 2', 'note G_, 2',
    'octave 4', 'note C_, 2', 'octave 3', 'note G_, 2', 'note E_, 2', 'note G_, 2',
    'octave 4', 'note D_, 2', 'octave 3', 'note A_, 2', 'note F#, 2', 'note A_, 2',
    'note B_, 2', 'note G_, 2', 'note D_, 2', 'note G_, 2', 'note B_, 2', 'note G_, 2', 'note D_, 2', 'note G_, 2',
    'note A_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2', 'note A_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2',
    'note A_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2', 'note A_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2',
    'note F#, 2', 'note D_, 2', 'note C_, 2', 'note D_, 2',
    'note G_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2', 'note G_, 2', 'note E_, 2', 'note C_, 2', 'note E_, 2',
    'note F#, 2', 'note D_, 2', 'note C_, 2', 'note D_, 2',
    'sound_loop',
  ];
  const PALLET_2 = [
    'duty_cycle 2',
    'note_type 12, 13, 3', 'octave 5', 'note D_, 2',
    'note_type 12, 10, 3', 'note C_, 2',
    'note_type 12, 13, 3', 'octave 4', 'note B_, 2',
    'note_type 12, 11, 3', 'note A_, 2',
    'note_type 12, 13, 3', 'octave 5', 'note G_, 2',
    'note_type 12, 11, 3', 'note E_, 2',
    'note_type 12, 13, 3', 'note F#, 2', 'note E_, 2', 'note D_, 6',
    'octave 4', 'note B_, 2', 'note G_, 2', 'note G_, 2', 'note A_, 2', 'note B_, 2',
    'octave 5', 'note C_, 10', 'octave 4', 'note F#, 2', 'note G_, 2', 'note A_, 2',
    'note B_, 6', 'octave 5', 'note C_, 1', 'octave 4', 'note B_, 1', 'note A_, 8',
    'octave 5', 'note D_, 2', 'note_type 12, 10, 3', 'note C_, 2',
    'note_type 12, 13, 3', 'octave 4', 'note B_, 2',
    'note_type 12, 11, 3', 'octave 5', 'note D_, 2',
    'note_type 12, 13, 3', 'note G_, 2',
    'note_type 12, 10, 3', 'note F#, 2',
    'note_type 12, 11, 3', 'note F#, 2',
    'note_type 12, 13, 3', 'note G_, 2', 'note E_, 6', 'note D_, 2', 'note D_, 8',
    'note C_, 2', 'octave 4', 'note B_, 2', 'note A_, 2', 'note G_, 2',
    'octave 5', 'note D_, 2', 'note C_, 2', 'octave 4', 'note B_, 2', 'note A_, 2', 'note G_, 10',
    'note G_, 2', 'note A_, 2', 'note B_, 2', 'octave 5', 'note C_, 8',
    'note D_, 6', 'note C_, 2', 'octave 4', 'note B_, 8', 'rest 2', 'note G_, 2', 'note A_, 2', 'note B_, 2',
    'octave 5', 'note C_, 4', 'note C_, 4', 'note D_, 6', 'note C_, 1', 'note D_, 1',
    'octave 4', 'note B_, 8', 'rest 2', 'note B_, 2', 'note A_, 2', 'note G_, 2',
    'note A_, 8', 'note E_, 4', 'note B_, 4', 'note A_, 8', 'note G_, 4', 'note E_, 4',
    'note F#, 8', 'note G_, 4', 'note B_, 4', 'note B_, 8', 'note A_, 8',
    'sound_loop',
  ];
  const PALLET_3 = [
    'note_type 12, 1, 2',
    'octave 4',
    'note G_, 6', 'note E_, 6', 'note F#, 4',
    'note G_, 6', 'note A_, 6', 'note G_, 4',
    'note E_, 6', 'note F#, 6', 'note E_, 4',
    'note G_, 6', 'note E_, 6', 'note D_, 4',
    'note G_, 6', 'note E_, 6', 'note F#, 4',
    'note G_, 6', 'note A_, 6', 'note G_, 4',
    'note E_, 6', 'note F#, 6', 'note A_, 4',
    'note G_, 6', 'note E_, 6', 'note D_, 4',
    'note C_, 8', 'note D_, 8', 'note G_, 8', 'note E_, 4', 'note D_, 4',
    'note C_, 8', 'note D_, 8', 'note G_, 8', 'note A_, 4', 'note G_, 4',
    'note E_, 8', 'note A_, 8', 'note E_, 8', 'note G_, 8', 'note F#, 8', 'note E_, 8',
    'note E_, 8', 'note F#, 8',
    'sound_loop',
  ];

  function parseLine(line) {
    let m;
    if ((m = /^tempo\s+(\d+)/.exec(line))) return { op: 'tempo', n: +m[1] };
    if ((m = /^duty_cycle\s+(\d+)/.exec(line))) return { op: 'duty', n: +m[1] & 3 };
    if ((m = /^note_type\s+(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+)/.exec(line))) return { op: 'type', speed: +m[1], vol: +m[2], fade: +m[3] };
    if ((m = /^octave\s+(\d+)/.exec(line))) return { op: 'oct', n: +m[1] };
    if ((m = /^note\s+([A-G](?:#|_))\s*,\s*(\d+)/.exec(line))) return { op: 'note', pitch: NOTE[m[1]], len: +m[2] };
    if ((m = /^rest\s+(\d+)/.exec(line))) return { op: 'rest', len: +m[1] };
    if ((m = /^square_note\s+(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)/.exec(line))) return { op: 'square', len: +m[1], vol: +m[2], fade: +m[3], freq: +m[4] };
    if ((m = /^noise_note\s+(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*(\d+)/.exec(line))) return { op: 'noise', len: +m[1], vol: +m[2], fade: +m[3], poly: +m[4] };
    if ((m = /^pitch_sweep\s+(\d+)\s*,\s*(-?\d+)/.exec(line))) return { op: 'sweep', period: +m[1], shift: +m[2] };
    if (/^sound_loop/.test(line)) return { op: 'loop' };
    if (/^sound_ret/.test(line)) return { op: 'stop' };
    return null;
  }

  function compile(lines) {
    const ops = [];
    for (let i = 0; i < lines.length; i++) {
      const op = parseLine(lines[i]);
      if (op) ops.push(op);
    }
    return ops;
  }

  function gbHz(pitch, octave) {
    let d = (PITCHES[pitch] >> 8) & 255;
    let e = PITCHES[pitch] & 255;
    let a = 8 - octave;
    while (a !== 7) {
      const lo = ((e >> 1) | ((d & 1) << 7)) & 255;
      d = ((d >> 1) | (d & 128)) & 255;
      e = lo;
      a++;
    }
    d = (d + 8) & 255;
    const reg = ((d & 7) << 8) | e;
    if (reg >= 2047) return 1;
    return 131072 / (2048 - reg);
  }

  function regHz(reg) {
    if (reg >= 2047) return 1;
    return 131072 / (2048 - reg);
  }

  function noiseHz(poly) {
    const shift = (poly >> 4) & 15;
    const div = [8, 16, 32, 48, 64, 80, 96, 112][poly & 7];
    return 524288 / div / Math.pow(2, shift);
  }

  function makeChannel(lines, kind) {
    return {
      ops: compile(lines),
      pc: 0,
      octave: 4,
      speed: 1,
      vol: 12,
      fade: 3,
      duty: 2,
      frac: 0,
      frame: 0,
      kind: kind,
      sweep: null,
      done: false,
    };
  }

  const song = {
    tempo: 160,
    channels: null,
  };

  function framesFor(ch, length, tempo) {
    const prod = length * ch.speed * tempo + ch.frac;
    const frames = Math.floor(prod / 256);
    ch.frac = prod % 256;
    return Math.max(1, frames);
  }

  function stepChannel(ch, tempoBox) {
    if (ch.done) return null;
    for (let guard = 0; guard < 40; guard++) {
      if (ch.pc >= ch.ops.length) { ch.done = true; return null; }
      const op = ch.ops[ch.pc++];
      if (op.op === 'loop') { ch.pc = 0; continue; }
      if (op.op === 'stop') { ch.done = true; return null; }
      if (op.op === 'tempo') { tempoBox.tempo = op.n; continue; }
      if (op.op === 'duty') { ch.duty = op.n; continue; }
      if (op.op === 'oct') { ch.octave = op.n; continue; }
      if (op.op === 'sweep') { ch.sweep = op; continue; }
      if (op.op === 'type') {
        ch.speed = op.speed || 1;
        ch.vol = op.vol;
        ch.fade = op.fade;
        continue;
      }
      if (op.op === 'note' || op.op === 'rest') {
        const frames = framesFor(ch, op.len, tempoBox.tempo);
        const start = ch.frame;
        ch.frame += frames;
        if (op.op === 'rest' || op.pitch == null) return { rest: true, frame: start, frames: frames };
        let hz = gbHz(op.pitch, ch.octave);
        if (ch.kind === 'wave') hz *= 0.5;
        const sweep = ch.sweep;
        ch.sweep = null;
        return { frame: start, frames: frames, hz: hz, vol: ch.vol, fade: ch.fade, duty: ch.duty, kind: ch.kind, sweep: sweep };
      }
      if (op.op === 'square' || op.op === 'noise') {
        const saved = ch.speed;
        ch.speed = 1;
        const frames = framesFor(ch, op.len + 1, 256);
        ch.speed = saved;
        const start = ch.frame;
        ch.frame += frames;
        const sweep = ch.sweep;
        ch.sweep = null;
        if (op.op === 'noise') {
          return { frame: start, frames: frames, hz: noiseHz(op.poly), vol: op.vol, fade: op.fade, kind: 'noise', sweep: null, width: (op.poly & 8) !== 0 };
        }
        return { frame: start, frames: frames, hz: regHz(op.freq), vol: op.vol, fade: op.fade, duty: ch.duty, kind: 'pulse', sweep: sweep };
      }
    }
    return null;
  }

  function envGain(volNibble, fade, dur) {
    const start = Math.max(0, Math.min(15, volNibble)) / 15;
    const points = [{ t: 0, v: start }];
    let period = 0;
    let dir = -1;
    if (typeof fade === 'number') {
      const mag = Math.abs(fade) & 7;
      period = mag;
      dir = fade < 0 ? 1 : -1;
    }
    if (!period) {
      points.push({ t: dur, v: start });
      return points;
    }
    const step = period / 64;
    let v = volNibble;
    let t = 0;
    while (t < dur) {
      t += step;
      v += dir;
      if (v < 0) v = 0;
      if (v > 15) v = 15;
      points.push({ t: Math.min(t, dur), v: v / 15 });
      if (v === 0 || v === 15) break;
    }
    if (points[points.length - 1].t < dur) points.push({ t: dur, v: points[points.length - 1].v });
    return points;
  }

  function waveLevel(nibble) {
    if (nibble === 1) return 1;
    if (nibble === 2) return 0.5;
    if (nibble === 3) return 0.25;
    return 0;
  }

  function track(node) {
    live.push(node);
    node.onended = function () {
      const i = live.indexOf(node);
      if (i >= 0) live.splice(i, 1);
    };
  }

  function applyEnv(gain, points, when, peak) {
    gain.gain.cancelScheduledValues(when);
    gain.gain.setValueAtTime(Math.max(0.0001, points[0].v * peak), when);
    for (let i = 1; i < points.length; i++) {
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, points[i].v * peak), when + points[i].t);
    }
  }

  let dutyWaves = null;
  let waveBuf = null;
  let noiseBuf = null;

  function ensureBuffers() {
    if (dutyWaves) return;
    dutyWaves = [];
    for (let d = 0; d < 4; d++) {
      const real = new Float32Array(64);
      const imag = new Float32Array(64);
      const frac = [0.125, 0.25, 0.5, 0.75][d];
      for (let n = 1; n < 64; n++) imag[n] = 2 * Math.sin(Math.PI * n * frac) / (n * Math.PI);
      dutyWaves.push(ctx.createPeriodicWave(real, imag));
    }
    const cycles = 32;
    waveBuf = ctx.createBuffer(1, 32 * cycles, 32768);
    const wd = waveBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = (WAVE2[i % 32] / 7.5) - 1;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    let lfsr = 0x7fff;
    for (let i = 0; i < nd.length; i++) {
      const bit = ((lfsr >> 1) ^ lfsr) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
      nd[i] = bit ? 0.8 : -0.8;
    }
  }

  function scheduleNote(ev, when, bus, peak) {
    if (ev.rest || !ev.hz || ev.hz < 8) return;
    const dur = Math.max(0.02, ev.frames / FPS);
    const t0 = when;
    if (ev.kind === 'noise') {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = Math.max(80, Math.min(8000, ev.hz));
      filter.Q.value = 0.7;
      const g = ctx.createGain();
      applyEnv(g, envGain(ev.vol, ev.fade, dur), t0, peak);
      src.connect(filter); filter.connect(g); g.connect(bus);
      src.start(t0); src.stop(t0 + dur + 0.02);
      track(src);
      return;
    }
    const osc = ctx.createOscillator();
    if (ev.kind === 'wave') {
      const src = ctx.createBufferSource();
      src.buffer = waveBuf;
      src.loop = true;
      src.playbackRate.setValueAtTime(ev.hz / 1024, t0);
      const g = ctx.createGain();
      const level = waveLevel(ev.vol);
      g.gain.setValueAtTime(Math.max(0.0001, level * peak), t0);
      g.gain.setValueAtTime(Math.max(0.0001, level * peak), t0 + dur);
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.02);
      src.connect(g); g.connect(bus);
      src.start(t0); src.stop(t0 + dur + 0.03);
      track(src);
      return;
    }
    osc.setPeriodicWave(dutyWaves[ev.duty & 3]);
    osc.frequency.setValueAtTime(ev.hz, t0);
    if (ev.sweep && ev.sweep.shift) {
      const shift = Math.abs(ev.sweep.shift);
      const up = ev.sweep.shift > 0;
      const endHz = Math.max(30, ev.hz * Math.pow(2, (up ? 1 : -1) * Math.min(3, dur * 8 / Math.max(1, shift))));
      osc.frequency.exponentialRampToValueAtTime(endHz, t0 + dur);
    }
    const g = ctx.createGain();
    applyEnv(g, envGain(ev.vol, ev.fade, dur), t0, peak);
    osc.connect(g); g.connect(bus);
    osc.start(t0); osc.stop(t0 + dur + 0.03);
    track(osc);
  }

  function bootGraph() {
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.gain.value = 0;
    sfxGain.gain.value = 0.9;
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
    ensureBuffers();
    song.channels = [
      makeChannel(PALLET_1, 'pulse'),
      makeChannel(PALLET_2, 'pulse'),
      makeChannel(PALLET_3, 'wave'),
    ];
    song.tempo = 160;
    origin = 0;
  }

  function applyMusicGain() {
    if (!musicGain) return;
    const duck = ctx && ctx.currentTime < duckUntil;
    const level = muted || !musicOn ? 0 : (duck ? 0.32 : 1);
    musicGain.gain.setTargetAtTime(level, ctx.currentTime, 0.03);
  }

  function tick() {
    if (!ctx || !musicOn || !song.channels) return;
    if (ctx.state === 'suspended') return;
    applyMusicGain();
    const horizon = ctx.currentTime + 0.28;
    const tempoBox = song;
    for (let c = 0; c < song.channels.length; c++) {
      const ch = song.channels[c];
      let guard = 0;
      while (guard++ < 16) {
        const when = origin + ch.frame / FPS;
        if (when > horizon) break;
        const before = ch.frame;
        const ev = stepChannel(ch, tempoBox);
        if (!ev) break;
        if (ev.frame !== before) {
          /* step advanced */
        }
        if (!ev.rest && when > ctx.currentTime - 0.02) {
          scheduleNote(ev, Math.max(when, ctx.currentTime), musicGain, ev.kind === 'wave' ? 0.07 : 0.05);
        }
      }
    }
  }

  function playScript(lines, kind, peak) {
    if (muted || !ctx) return 0;
    ensureBuffers();
    const ch = makeChannel(lines, kind || 'pulse');
    const tempoBox = { tempo: 256 };
    let t = ctx.currentTime + 0.01;
    let total = 0;
    for (let i = 0; i < 48; i++) {
      const ev = stepChannel(ch, tempoBox);
      if (!ev) break;
      const dur = ev.frames / FPS;
      if (!ev.rest) scheduleNote(ev, t, sfxGain, peak || 0.42);
      t += dur;
      total += dur;
    }
    duckUntil = Math.max(duckUntil, ctx.currentTime + total + 0.05);
    applyMusicGain();
    return total;
  }

  function unlock() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!ctx) {
      ctx = new AC();
      bootGraph();
    }
    if (ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(function () {});
    }
    if (musicOn && !timer) timer = setInterval(tick, 90);
    applyMusicGain();
  }

  function startMusic() {
    musicOn = true;
    unlock();
    if (ctx && !origin) origin = ctx.currentTime + 0.06;
    if (timer == null && ctx) timer = setInterval(tick, 90);
    applyMusicGain();
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ctx && muted) {
      sfxGain.gain.setTargetAtTime(0, ctx.currentTime, 0.01);
    } else if (ctx && sfxGain) {
      sfxGain.gain.setTargetAtTime(0.9, ctx.currentTime, 0.02);
    }
    applyMusicGain();
  }

  return {
    unlock: unlock,
    startMusic: startMusic,
    footstep: function () {},
    click: function () { playScript(['duty_cycle 2', 'square_note 0, 9, 1, 1984', 'square_note 0, 8, 1, 2000', 'square_note 0, 9, 1, 1984', 'square_note 12, 10, 1, 2000'], 'pulse', 0.34); },
    book: function () { playScript(['duty_cycle 2', 'square_note 0, 9, 1, 1984', 'square_note 0, 8, 1, 2000', 'square_note 0, 9, 1, 1984', 'square_note 12, 10, 1, 2000'], 'pulse', 0.3); },
    encounter: function () { playScript(['noise_note 2, 9, 1, 51', 'noise_note 1, 12, 1, 35', 'noise_note 2, 6, 1, 17', 'noise_note 3, 4, 1, 51'], 'noise', 0.28); },
    throwBall: function () { playScript(['duty_cycle 2', 'pitch_sweep 2, -7', 'square_note 15, 15, 2, 1920'], 'pulse', 0.4); },
    caught: function () {
      playScript([
        'tempo 256', 'duty_cycle 3', 'note_type 6, 11, 2', 'octave 3',
        'note E_, 2', 'note F#, 2', 'note G#, 2', 'note G#, 1', 'note G#, 1',
        'note B_, 2', 'octave 4', 'note C#, 2', 'note D#, 2', 'note D#, 1', 'note D#, 1',
        'note_type 6, 11, 5', 'note E_, 8',
      ], 'pulse', 0.36);
    },
    broke: function () { playScript(['duty_cycle 2', 'pitch_sweep 1, 6', 'square_note 15, 15, 2, 1024'], 'pulse', 0.4); },
    fled: function () { playScript(['noise_note 2, 6, 1, 35', 'noise_note 2, 10, 1, 51', 'noise_note 2, 12, 1, 51', 'noise_note 2, 5, 1, 17', 'noise_note 2, 15, 1, 51', 'noise_note 8, 4, 1, 51'], 'noise', 0.36); },
    bump: function () { playScript(['duty_cycle 2', 'pitch_sweep 5, -2', 'square_note 15, 15, 1, 768'], 'pulse', 0.32); },
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); return muted; },
  };
})();
