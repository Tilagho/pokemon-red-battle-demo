/* Pokémon GO Island — overworld, hold-to-pathfind, hold-to-throw catch.
   Tiles: Kenney RPG base (CC0) spritesheet. Player: Tnypixels CC0 walk.
   No battles, no D-pad. Center → coast is COAST tiles at SPEED px/s = 5s. */
(function () {
  const D = ISLAND_DATA;
  const TILE = D.TILE;
  const MAP = D.MAP;
  const CENTER = D.CENTER;
  const SPEED = D.SPEED;
  console.assert(Math.abs((D.COAST * TILE) / SPEED - 5) < 1e-6, 'coast walk should be 5s');

  const SHEET_COLS = 20;
  const FLOOR = {
    water: 31, shore: 65, meadow: 44, tall: 4, forest: 44, dark: 44,
    mountain: 154, ice: 74, volcanic: 140, dirt: 125, dojo: 140,
    ruins: 154, town: 101, path: 101, waterfall: 65,
  };
  const TINT = {
    dark: '#24382c',
    volcanic: '#e07038',
    ice: '#d4eaff',
    waterfall: '#d2f4ff',
    forest: '#c8e0a0',
  };
  const BUSH = 181;
  const TREE = 220;
  const TREE_DARK = 224;
  const TREE_WARM = 222;
  const ROCK = 194;
  const ROCK_SM = 248;
  const ROOF = 126;
  const FENCE = 186;

  const PW = 16, PH = 20, PSCALE = 3;
  const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

  const speciesById = {};
  D.species.forEach(function (s) { speciesById[s.id] = s; });

  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');
  const els = {
    title: document.getElementById('title'),
    play: document.getElementById('play'),
    start: document.getElementById('btn-start'),
    sound: document.getElementById('btn-sound'),
    mute: document.getElementById('btn-mute'),
    dexBtn: document.getElementById('btn-dex'),
    hudCount: document.getElementById('hud-count'),
    hint: document.getElementById('hint'),
    encounter: document.getElementById('encounter'),
    encCard: document.getElementById('enc-card'),
    encLine: document.getElementById('enc-line'),
    encSprite: document.getElementById('enc-sprite'),
    encType: document.getElementById('enc-type'),
    arcPath: document.getElementById('arc-path'),
    arcBall: document.getElementById('arc-ball'),
    charge: document.getElementById('charge-fill'),
    ball: document.getElementById('ball'),
    ballLabel: document.getElementById('ball-label'),
    encSub: document.getElementById('enc-sub'),
    encActions: document.getElementById('enc-actions'),
    encDex: document.getElementById('enc-dex'),
    encGo: document.getElementById('enc-go'),
    encAway: document.getElementById('enc-away'),
    stars: document.getElementById('stars'),
    throwBall: document.getElementById('throw-ball'),
    dex: document.getElementById('dex'),
    dexTitle: document.getElementById('dex-title'),
    dexGrid: document.getElementById('dex-grid'),
    dexClose: document.getElementById('dex-close'),
  };

  let sheet, playerImg;
  const biome = [];
  const props = [];
  const blocked = new Uint8Array(MAP * MAP);

  const state = {
    mode: 'title',
    x: (CENTER + 0.5) * TILE,
    y: (CENTER + 0.5) * TILE,
    dir: 'down',
    path: [],
    hold: false,
    goal: null,
    moved: 0,
    tileX: CENTER,
    tileY: CENTER,
    steps: 0,
    cooldown: 1.4,
    camX: 0,
    camY: 0,
    viewW: 300,
    viewH: 500,
  };

  const enc = {
    phase: 'idle',
    mon: null,
    charge: 0,
    chargeT: 0,
    tries: 0,
    t0: 0,
    shakes: 0,
    success: false,
    openDexAfter: false,
  };

  const DEX_KEY = 'pogo-island-dex';
  let dex = [];
  try { dex = JSON.parse(localStorage.getItem(DEX_KEY) || '[]') || []; } catch (e) { dex = []; }
  if (!Array.isArray(dex)) dex = [];

  function saveDex() {
    try { localStorage.setItem(DEX_KEY, JSON.stringify(dex)); } catch (e) { /* ignore */ }
  }
  function caughtCount() {
    const set = {};
    dex.forEach(function (id) { if (speciesById[id]) set[id] = 1; });
    return Object.keys(set).length;
  }

  function idx(x, y) { return y * MAP + x; }
  function inMap(x, y) { return x >= 0 && y >= 0 && x < MAP && y < MAP; }
  function rnd(x, y) {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function baseBiome(x, y) {
    const dx = x - CENTER, dy = y - CENTER;
    const d = Math.hypot(dx, dy);
    if (d > 15.15) return 'water';
    if (d > 13.4) return 'shore';
    if (x >= 27 && x <= 28 && y >= 10 && y <= 16) return 'water';
    if (((x === 26 || x === 29) && y >= 12 && y <= 16) || (y === 16 && x >= 26 && x <= 29)) return 'waterfall';
    if (y >= 5 && y <= 8 && x >= 15 && x <= 21 && x !== CENTER) return 'ice';
    if (y <= 9 && x >= 12 && x <= 24) return 'mountain';
    if (x >= 23 && y >= 8 && y <= 14) return 'volcanic';
    if (x >= 6 && x <= 12 && y >= 5 && y <= 11) return 'ruins';
    if (x >= 5 && x <= 11 && y >= 13 && y <= 20) return 'dirt';
    if (x >= 6 && x <= 13 && y >= 24) return 'dark';
    if (x >= 6 && x <= 13 && y >= 20 && y <= 25) return 'forest';
    if (y >= 19 && y <= 26 && x >= 13 && x <= 24 && x !== CENTER) return 'tall';
    if (x >= 11 && x <= 13 && y >= 15 && y <= 17) return 'dojo';
    if (x >= 15 && x <= 21 && y >= 15 && y <= 18) return 'town';
    return 'meadow';
  }

  function placeSolid(x, y, tile) {
    if (!inMap(x, y)) return;
    if (biome[y][x] === 'water' || biome[y][x] === 'path') return;
    blocked[idx(x, y)] = 1;
    props.push({ x: x, y: y, tile: tile });
  }

  function buildMap() {
    for (let y = 0; y < MAP; y++) {
      biome[y] = [];
      for (let x = 0; x < MAP; x++) {
        let b = baseBiome(x, y);
        if ((x === CENTER || y === CENTER) && b !== 'water') b = 'path';
        // Grass cuts the south road just outside town so a short walk can catch.
        if (y >= 19 && y <= 21 && x >= 16 && x <= 20 && b !== 'water') b = 'tall';
        biome[y][x] = b;
      }
    }
    // House west of the crossroad, door facing the plaza.
    placeSolid(15, 15, ROOF);
    placeSolid(16, 15, ROOF);
    placeSolid(15, 16, FENCE);
    // Dojo: wooden back wall, open front toward the road.
    placeSolid(11, 15, ROOF);
    placeSolid(12, 15, ROOF);
    placeSolid(13, 15, ROOF);
    placeSolid(11, 16, FENCE);
    placeSolid(13, 16, FENCE);

    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        if (blocked[idx(x, y)]) continue;
        const b = biome[y][x];
        if (b === 'path' || b === 'water' || b === 'shore' || b === 'town' || b === 'waterfall') continue;
        const r = rnd(x, y);
        if (b === 'dark' && r < 0.5) placeSolid(x, y, TREE_DARK);
        else if (b === 'forest' && r < 0.38) placeSolid(x, y, TREE);
        else if (b === 'meadow' && r < 0.06) placeSolid(x, y, TREE);
        else if (b === 'mountain' && r < 0.22) placeSolid(x, y, ROCK);
        else if (b === 'ice' && r < 0.16) placeSolid(x, y, ROCK_SM);
        else if (b === 'volcanic' && r < 0.14) placeSolid(x, y, TREE_WARM);
        else if (b === 'ruins' && r < 0.3) placeSolid(x, y, ROCK_SM);
        else if (b === 'dirt' && r < 0.08) placeSolid(x, y, ROCK_SM);
      }
    }
    console.assert(walkable(CENTER, CENTER), 'spawn should be walkable');
    console.assert(walkable(CENTER, CENTER + D.COAST), 'coast tile should be walkable');
    console.assert(!walkable(CENTER, CENTER + D.COAST + 1), 'past the coast is water');
    console.assert(biome[19][CENTER] === 'tall', 'south grass patch');
  }

  function walkable(x, y) {
    if (!inMap(x, y)) return false;
    if (biome[y][x] === 'water') return false;
    if (blocked[idx(x, y)]) return false;
    return true;
  }

  function astar(sx, sy, gx, gy) {
    if (!walkable(gx, gy)) return null;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const gScore = new Float64Array(MAP * MAP);
    gScore.fill(Infinity);
    const prev = new Int32Array(MAP * MAP);
    prev.fill(-1);
    const open = [sy * MAP + sx];
    gScore[idx(sx, sy)] = 0;
    const inOpen = new Uint8Array(MAP * MAP);
    inOpen[idx(sx, sy)] = 1;
    function heur(i) {
      const x = i % MAP, y = (i / MAP) | 0;
      return Math.hypot(x - gx, y - gy);
    }
    while (open.length) {
      let best = 0;
      for (let i = 1; i < open.length; i++) {
        if (gScore[open[i]] + heur(open[i]) < gScore[open[best]] + heur(open[best])) best = i;
      }
      const cur = open.splice(best, 1)[0];
      inOpen[cur] = 0;
      const x = cur % MAP, y = (cur / MAP) | 0;
      if (x === gx && y === gy) {
        const path = [];
        let c = cur;
        while (c !== idx(sx, sy) && c >= 0) {
          path.push([c % MAP, (c / MAP) | 0]);
          c = prev[c];
        }
        path.reverse();
        return path;
      }
      for (let d = 0; d < dirs.length; d++) {
        const nx = x + dirs[d][0], ny = y + dirs[d][1];
        if (!walkable(nx, ny)) continue;
        if (dirs[d][0] && dirs[d][1] && (!walkable(x + dirs[d][0], y) || !walkable(x, y + dirs[d][1]))) continue;
        const cost = gScore[cur] + (dirs[d][0] && dirs[d][1] ? 1.41421356 : 1);
        const ni = idx(nx, ny);
        if (cost < gScore[ni]) {
          gScore[ni] = cost;
          prev[ni] = cur;
          if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; }
        }
      }
    }
    return null;
  }

  function setGoal(tx, ty) {
    if (!walkable(tx, ty)) return;
    if (state.goal && state.goal[0] === tx && state.goal[1] === ty && state.path.length) return;
    const sx = Math.floor(state.x / TILE), sy = Math.floor(state.y / TILE);
    if (sx === tx && sy === ty) { state.path = []; state.goal = [tx, ty]; return; }
    const tiles = astar(sx, sy, tx, ty);
    state.goal = [tx, ty];
    if (!tiles) { state.path = []; return; }
    state.path = tiles.map(function (t) { return [(t[0] + 0.5) * TILE, (t[1] + 0.5) * TILE]; });
  }

  function loadImage(src) {
    return new Promise(function (res, rej) {
      const img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error(src)); };
      img.src = src;
    });
  }

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    state.viewW = w;
    state.viewH = h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function drawTile(id, dx, dy) {
    const sx = (id % SHEET_COLS) * TILE;
    const sy = Math.floor(id / SHEET_COLS) * TILE;
    ctx.drawImage(sheet, sx, sy, TILE, TILE, dx, dy, TILE, TILE);
  }

  function render() {
    const w = state.viewW, h = state.viewH;
    let camX = state.x - w / 2;
    let camY = state.y - h / 2;
    const world = MAP * TILE;
    if (world > w) camX = Math.max(0, Math.min(world - w, camX));
    else camX = (world - w) / 2;
    if (world > h) camY = Math.max(0, Math.min(world - h, camY));
    else camY = (world - h) / 2;
    state.camX = camX;
    state.camY = camY;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#14304c';
    ctx.fillRect(0, 0, w, h);
    const ox = -camX, oy = -camY;
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const y0 = Math.max(0, Math.floor(camY / TILE) - 1);
    const x1 = Math.min(MAP - 1, Math.floor((camX + w) / TILE) + 1);
    const y1 = Math.min(MAP - 1, Math.floor((camY + h) / TILE) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = Math.round(x * TILE + ox);
        const dy = Math.round(y * TILE + oy);
        const b = biome[y][x];
        drawTile(FLOOR[b] || 44, dx, dy);
        if (TINT[b]) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(dx, dy, TILE, TILE);
          ctx.clip();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = TINT[b];
          ctx.fillRect(dx, dy, TILE, TILE);
          ctx.restore();
        }
        if (b === 'tall' || b === 'forest') drawTile(BUSH, dx, dy);
      }
    }
    const queue = [];
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.x < x0 - 1 || p.y < y0 - 1 || p.x > x1 + 1 || p.y > y1 + 1) continue;
      queue.push({ y: p.y * TILE + TILE, draw: (function (pp) {
        return function () { drawTile(pp.tile, Math.round(pp.x * TILE + ox), Math.round(pp.y * TILE + oy)); };
      })(p) });
    }
    queue.push({ y: state.y, draw: drawPlayer });
    queue.sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < queue.length; i++) queue[i].draw();
  }

  function drawPlayer() {
    const row = DIR_ROW[state.dir] || 0;
    const moving = state.path.length > 0 && state.mode === 'explore';
    const frame = moving ? Math.floor(state.moved / 12) % 4 : 0;
    const dw = PW * PSCALE, dh = PH * PSCALE;
    const dx = state.x - state.camX - dw / 2;
    const dy = state.y - state.camY - dh + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(state.x - state.camX, state.y - state.camY, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(playerImg, frame * PW, row * PH, PW, PH, Math.round(dx), Math.round(dy), dw, dh);
  }

  let lastTileStep = CENTER + CENTER * MAP;
  function update(dt) {
    if (state.mode !== 'explore') return;
    state.cooldown = Math.max(0, state.cooldown - dt);
    if (!state.path.length) return;
    let left = SPEED * dt;
    while (left > 0 && state.path.length) {
      const target = state.path[0];
      const dx = target[0] - state.x, dy = target[1] - state.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= left || dist < 1.5) {
        if (Math.abs(dx) > Math.abs(dy)) state.dir = dx >= 0 ? 'right' : 'left';
        else if (dy !== 0) state.dir = dy > 0 ? 'down' : 'up';
        state.moved += dist;
        state.x = target[0];
        state.y = target[1];
        left -= dist;
        state.path.shift();
      } else {
        state.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        state.x += dx / dist * left;
        state.y += dy / dist * left;
        state.moved += left;
        left = 0;
      }
    }
    const tx = Math.floor(state.x / TILE), ty = Math.floor(state.y / TILE);
    const stamp = tx + ty * MAP;
    if (stamp !== lastTileStep) {
      lastTileStep = stamp;
      state.tileX = tx;
      state.tileY = ty;
      state.steps++;
      IslandAudio.footstep();
      const b = biome[ty][tx];
      const rate = D.rates[b] || 0;
      if (rate && state.steps >= 2 && state.cooldown <= 0 && Math.random() < rate) {
        startEncounter(b);
      }
    }
    if (state.moved > 48) els.hint.classList.add('hide');
  }

  function screenToTile(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const wx = (clientX - r.left) + state.camX;
    const wy = (clientY - r.top) + state.camY;
    return [Math.floor(wx / TILE), Math.floor(wy / TILE)];
  }

  function onPointerDown(e) {
    if (state.mode !== 'explore') return;
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    IslandAudio.unlock();
    canvas.setPointerCapture(e.pointerId);
    state.hold = true;
    const t = screenToTile(e.clientX, e.clientY);
    setGoal(t[0], t[1]);
  }
  function onPointerMove(e) {
    if (!state.hold || state.mode !== 'explore') return;
    const t = screenToTile(e.clientX, e.clientY);
    setGoal(t[0], t[1]);
  }
  function onPointerUp() { state.hold = false; }

  function pickSpecies(biomeName) {
    const table = D.spawns[biomeName];
    if (!table) return speciesById.pidgey;
    let total = 0;
    for (let i = 0; i < table.length; i++) total += table[i][1];
    let roll = Math.random() * total;
    for (let i = 0; i < table.length; i++) {
      roll -= table[i][1];
      if (roll <= 0) return speciesById[table[i][0]];
    }
    return speciesById[table[table.length - 1][0]];
  }

  function refreshHud() {
    const n = caughtCount();
    els.dexBtn.innerHTML = n + '/15<br>DEX';
    els.hudCount.textContent = n + ' / 15 caught';
    const on = !IslandAudio.isMuted();
    els.sound.textContent = on ? 'SOUND: ON' : 'SOUND: OFF';
    els.mute.textContent = on ? 'SOUND' : 'MUTE';
    els.mute.setAttribute('aria-pressed', on ? 'false' : 'true');
  }

  function showBallUI(on) {
    els.ball.hidden = !on;
    els.encAway.hidden = !on;
    document.querySelector('.charge').hidden = !on;
    els.encArc = document.getElementById('enc-arc');
    els.encArc.hidden = !on;
  }

  function startEncounter(biomeName) {
    const mon = pickSpecies(biomeName);
    enc.phase = 'intro';
    enc.mon = mon;
    enc.charge = 0;
    enc.tries = 0;
    enc.t0 = performance.now();
    enc.success = false;
    state.path = [];
    state.hold = false;
    state.mode = 'encounter';
    els.encLine.textContent = 'A wild ' + mon.name + ' appeared!';
    els.encSprite.src = mon.sprite;
    els.encSprite.alt = mon.name;
    els.encSprite.className = mon.id === 'bulbasaur' ? 'bro pop' : 'pop';
    els.encType.textContent = mon.type;
    els.encType.className = 'tag ' + mon.type;
    els.encSub.textContent = 'Hold the ball, then let go.';
    els.ballLabel.textContent = 'HOLD TO THROW';
    els.charge.style.width = '0%';
    els.encActions.hidden = true;
    showBallUI(true);
    els.stars.innerHTML = '';
    els.encounter.hidden = false;
    updateArc(0);
    IslandAudio.encounter();
    setTimeout(function () { if (enc.phase === 'intro') enc.phase = 'ready'; }, 520);
  }

  function updateArc(charge) {
    const y = 96 - charge * 70;
    const x = 150;
    const endX = 150;
    const endY = 18 + (1 - charge) * 36;
    els.arcPath.setAttribute('d', 'M 150 96 Q ' + x + ' ' + y.toFixed(1) + ' ' + endX + ' ' + endY.toFixed(1));
    els.arcBall.setAttribute('cx', String(endX));
    els.arcBall.setAttribute('cy', endY.toFixed(1));
    els.charge.style.width = Math.round(charge * 100) + '%';
  }

  function endEncounter(why) {
    enc.phase = 'idle';
    state.mode = 'explore';
    state.cooldown = 4.4;
    state.steps = 0;
    els.encounter.hidden = true;
    els.throwBall.classList.remove('show', 'shake');
    els.encCard.classList.remove('flash');
    if (enc.openDexAfter) {
      enc.openDexAfter = false;
      openDex();
    }
  }

  function catchChance(mon, charge) {
    const easy = mon.catch >= 200 ? 0.8 : mon.catch >= 150 ? 0.66 : 0.48;
    return Math.min(0.93, easy * (0.55 + 0.62 * charge));
  }

  function onBallDown(e) {
    if (enc.phase !== 'ready') return;
    e.preventDefault();
    IslandAudio.unlock();
    els.ball.setPointerCapture(e.pointerId);
    enc.phase = 'charging';
    enc.chargeT = performance.now();
    enc.charge = 0;
    els.ball.classList.add('charging');
    els.ballLabel.textContent = 'RELEASE!';
  }
  function onBallUp(e) {
    if (enc.phase !== 'charging') return;
    e.preventDefault();
    els.ball.classList.remove('charging');
    const charge = enc.charge;
    throwBall(charge);
  }

  function throwBall(charge) {
    enc.phase = 'throwing';
    enc.charge = charge;
    IslandAudio.throwBall();
    const miss = charge < 0.18;
    const from = els.ball.getBoundingClientRect();
    const mon = els.encSprite.getBoundingClientRect();
    const x0 = from.left + from.width / 2 - 14;
    const y0 = from.top + 10;
    const x1 = mon.left + mon.width / 2 - 14;
    const y1 = mon.top + mon.height / 2 - 14;
    const endX = miss ? x0 + (x1 - x0) * 0.45 : x1;
    const endY = miss ? y0 + (y1 - y0) * 0.35 + 30 : y1;
    const cx = (x0 + endX) / 2;
    const cy = Math.min(y0, endY) - (50 + charge * 110);
    const ball = els.throwBall;
    ball.classList.add('show');
    const t0 = performance.now();
    const dur = 460;
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      const u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * endX;
      const y = u * u * y0 + 2 * u * t * cy + t * t * endY;
      ball.style.left = x + 'px';
      ball.style.top = y + 'px';
      if (t < 1) requestAnimationFrame(step);
      else if (miss) {
        ball.classList.remove('show');
        enc.tries++;
        els.encLine.textContent = 'The ball missed!';
        els.encSub.textContent = triesLine();
        maybeFlee(false);
      } else landBall();
    }
    requestAnimationFrame(step);
  }

  function triesLine() {
    if (enc.tries >= 3) return 'It looks ready to flee.';
    return 'Throw ' + (enc.tries + 1) + ' · it may flee after 3 fails';
  }

  function landBall() {
    const p = catchChance(enc.mon, enc.charge);
    enc.success = Math.random() < p;
    enc.shakes = enc.success ? 3 : (Math.random() < 0.5 ? 1 : 2);
    els.encSprite.classList.add('hide-mon');
    shakeNext();
  }

  function shakeNext() {
    if (enc.shakes <= 0) {
      els.throwBall.classList.remove('show', 'shake');
      if (enc.success) onCaught();
      else onBroke();
      return;
    }
    enc.shakes--;
    enc.phase = 'shaking';
    els.throwBall.classList.remove('shake');
    void els.throwBall.offsetWidth;
    els.throwBall.classList.add('shake');
    setTimeout(shakeNext, 320);
  }

  function onCaught() {
    enc.phase = 'caught';
    if (dex.indexOf(enc.mon.id) < 0) dex.push(enc.mon.id);
    saveDex();
    refreshHud();
    IslandAudio.caught();
    els.encSprite.classList.remove('hide-mon');
    els.encLine.textContent = 'Gotcha! ' + enc.mon.name + ' was caught!';
    els.encSub.textContent = caughtCount() + ' / 15 in the Pokédex.';
    els.encCard.classList.add('flash');
    showBallUI(false);
    els.encActions.hidden = false;
    burst();
  }

  function onBroke() {
    enc.tries++;
    els.encSprite.classList.remove('hide-mon');
    IslandAudio.broke();
    els.encLine.textContent = enc.mon.name + ' broke free!';
    els.encSub.textContent = triesLine();
    maybeFlee(true);
  }

  function maybeFlee(fromBreak) {
    const flee = enc.tries >= 4 || (enc.tries >= 3 && Math.random() < 0.7);
    if (flee) {
      enc.phase = 'fled';
      IslandAudio.fled();
      els.encLine.textContent = 'The wild ' + enc.mon.name + ' fled!';
      els.encSub.textContent = 'It got away.';
      showBallUI(false);
      els.encActions.hidden = false;
      els.encDex.textContent = 'POKéDEX';
      return;
    }
    enc.phase = 'ready';
    els.ballLabel.textContent = 'HOLD TO THROW';
    if (!fromBreak) els.encSub.textContent = triesLine();
  }

  function burst() {
    els.stars.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('i');
      s.style.left = (15 + Math.random() * 70) + '%';
      s.style.top = (8 + Math.random() * 55) + '%';
      s.style.animationDelay = (Math.random() * 0.12) + 's';
      els.stars.appendChild(s);
    }
  }

  function openDex() {
    if (state.mode === 'encounter') return;
    IslandAudio.book();
    state.path = [];
    const prev = state.mode;
    state.mode = 'dex';
    const n = caughtCount();
    els.dexTitle.textContent = 'POKéDEX ' + n + '/15';
    els.dexGrid.innerHTML = '';
    D.species.forEach(function (s) {
      const cell = document.createElement('div');
      const have = dex.indexOf(s.id) >= 0;
      cell.className = 'dex-cell' + (have ? '' : ' missing');
      if (have) {
        const img = document.createElement('img');
        img.src = s.sprite;
        img.alt = s.name;
        cell.appendChild(img);
        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = s.name;
        cell.appendChild(nm);
      } else {
        const q = document.createElement('div');
        q.className = 'q';
        q.textContent = '?';
        cell.appendChild(q);
        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = '???';
        cell.appendChild(nm);
      }
      els.dexGrid.appendChild(cell);
    });
    els.dex.hidden = false;
    els.dex.dataset.prev = prev;
  }
  function closeDex() {
    els.dex.hidden = true;
    if (state.mode === 'dex') state.mode = 'explore';
  }

  function syncSoundButtons() { refreshHud(); }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (enc.phase === 'charging') {
      enc.charge = Math.min(1, (now - enc.chargeT) / 900);
      updateArc(enc.charge);
    }
    if (state.mode === 'explore' || state.mode === 'encounter' || state.mode === 'dex') {
      update(dt);
      render();
    }
    requestAnimationFrame(frame);
  }

  function startGame() {
    IslandAudio.unlock();
    IslandAudio.click();
    state.mode = 'explore';
    els.title.classList.remove('on');
    els.play.classList.add('on');
    resize();
    refreshHud();
  }

  function wire() {
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('resize', resize);

    els.start.addEventListener('click', startGame);
    function toggleSound() {
      IslandAudio.unlock();
      IslandAudio.toggle();
      IslandAudio.click();
      syncSoundButtons();
    }
    els.sound.addEventListener('click', toggleSound);
    els.mute.addEventListener('click', toggleSound);
    els.dexBtn.addEventListener('click', function () {
      IslandAudio.unlock();
      if (state.mode === 'explore') openDex();
    });
    els.dexClose.addEventListener('click', function () { IslandAudio.click(); closeDex(); });

    els.ball.addEventListener('pointerdown', onBallDown, { passive: false });
    els.ball.addEventListener('pointerup', onBallUp);
    els.ball.addEventListener('pointercancel', onBallUp);
    els.encAway.addEventListener('click', function () {
      if (enc.phase === 'throwing' || enc.phase === 'shaking') return;
      IslandAudio.click();
      endEncounter('away');
    });
    els.encGo.addEventListener('click', function () { IslandAudio.click(); endEncounter('go'); });
    els.encDex.addEventListener('click', function () {
      IslandAudio.click();
      enc.openDexAfter = true;
      endEncounter('dex');
    });
  }

  async function boot() {
    buildMap();
    wire();
    syncSoundButtons();
    try {
      const imgs = await Promise.all([
        loadImage('assets/tiles/kenney-rpg/RPGpack_sheet.png'),
        loadImage('assets/player/walk.png'),
      ].concat(D.species.map(function (s) { return loadImage(s.sprite); })));
      sheet = imgs[0];
      playerImg = imgs[1];
      await loadImage('assets/items/poke-ball.png');
      els.start.disabled = false;
      els.start.textContent = 'START';
    } catch (err) {
      console.error(err);
      els.start.textContent = 'ASSET ERROR';
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
