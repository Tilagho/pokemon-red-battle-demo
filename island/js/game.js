/* Pokémon GO Island — overworld, hold-to-pathfind, hold-to-throw catch.
   Overworld, player, and Poké Ball render from island/assets/red/ (pret/pokered).
   Each map cell is one 32×32 Red block (4×4 of 8×8 tiles) drawn at 2× = TILE px.
   The player is the 16×16 overworld sprite at that same scale.
   No battles, no D-pad. Center → coast is COAST cells at SPEED px/s = 5s. */
(function () {
  const D = ISLAND_DATA;
  const TILE = D.TILE;
  const MAP = D.MAP;
  const CENTER = D.CENTER;
  const SPEED = D.SPEED;
  console.assert(Math.abs((D.COAST * TILE) / SPEED - 5) < 1e-6, 'coast walk should be 5s');
  console.assert(TILE % 4 === 0, 'tile must cover a 4×4 Red block');

  /* pret block bytes (16 tile ids, row-major 4×4). Indices match gfx/blocksets. */
  const BLOCKS = {
    ow: {
      path: [35,35,35,35,57,35,35,35,35,35,35,35,35,35,57,35],
      tall: [82,82,82,82,82,82,82,82,82,82,82,82,82,82,82,82],
      grass: [57,57,57,57,57,57,57,57,57,57,57,57,57,57,57,57],
      roofL: [35,35,35,35,57,35,35,35,5,6,7,7,21,22,23,23],
      roofR: [35,35,35,35,57,35,35,35,7,7,8,9,23,23,24,25],
      wallL: [37,38,10,34,92,23,23,23,15,34,11,12,78,26,27,28],
      wallR: [10,10,40,41,23,23,23,93,10,10,34,31,26,26,26,79],
      treeL: [42,43,44,44,58,59,44,44,42,43,44,44,58,59,44,44],
      trees: [44,44,44,44,44,44,44,44,42,43,42,43,58,59,58,59],
      water: [20,20,20,84,20,20,20,84,20,20,20,84,20,20,20,84],
      flowers: [57,57,57,57,57,57,57,57,14,14,14,14,85,85,85,85],
    },
    forest: {
      floor: [32,32,32,32,32,32,32,32,48,48,32,32,48,48,32,32],
      tree: [4,5,6,7,35,21,22,23,36,37,38,39,0,53,54,48],
      bush: [2,3,2,3,18,19,18,19,32,32,32,32,32,32,32,32],
    },
    plateau: {
      smooth: [35,35,35,35,45,35,35,35,35,35,35,35,35,35,45,35],
      rock: [42,43,42,43,34,29,34,29,42,43,42,43,34,29,34,29],
      ground: [44,44,44,44,44,44,44,44,44,44,44,44,44,44,44,44],
      grass: [69,69,69,69,69,69,69,69,69,69,69,69,69,69,69,69],
    },
    cavern: {
      floor: [32,32,32,32,32,32,32,32,32,32,32,32,32,32,32,32],
      pale: [5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5],
    },
    port: {
      dock: [10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10],
    },
  };

  const FLOOR = {
    water: ['ow', BLOCKS.ow.water],
    shore: ['port', BLOCKS.port.dock],
    meadow: ['ow', BLOCKS.ow.grass],
    tall: ['ow', BLOCKS.ow.tall],
    forest: ['forest', BLOCKS.forest.floor],
    dark: ['forest', BLOCKS.forest.floor],
    mountain: ['plateau', BLOCKS.plateau.ground],
    ice: ['cavern', BLOCKS.cavern.pale],
    volcanic: ['plateau', BLOCKS.plateau.ground],
    dirt: ['cavern', BLOCKS.cavern.floor],
    dojo: ['plateau', BLOCKS.plateau.grass],
    ruins: ['plateau', BLOCKS.plateau.smooth],
    town: ['ow', BLOCKS.ow.path],
    path: ['ow', BLOCKS.ow.path],
    waterfall: ['ow', BLOCKS.ow.water],
  };
  const TINT = {
    dark: '#24382c',
    volcanic: '#e07038',
    ice: '#d4eaff',
    waterfall: '#d2f4ff',
  };

  /* 16×16 overworld sprite rows in sprites/red.png: stand down/up/left, then walk. */
  const POSE = { down: [0, 3], up: [1, 4], left: [2, 5], right: [2, 5] };
  const SPRITE = TILE / 2;

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

  const sheets = {};
  let playerCanvas = null;
  const biome = [];
  const props = [];
  const flowers = [];
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

  function placeSolid(x, y, sheet, block) {
    if (!inMap(x, y)) return;
    if (biome[y][x] === 'water' || biome[y][x] === 'path') return;
    if (y >= 19 && y <= 21 && x >= 16 && x <= 20) return;
    blocked[idx(x, y)] = 1;
    props.push({ x: x, y: y, sheet: sheet, block: block });
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
    placeSolid(15, 15, 'ow', BLOCKS.ow.roofL);
    placeSolid(16, 15, 'ow', BLOCKS.ow.roofR);
    placeSolid(15, 16, 'ow', BLOCKS.ow.wallL);
    // Dojo: roof along the back, open front toward the road.
    placeSolid(11, 15, 'ow', BLOCKS.ow.roofL);
    placeSolid(12, 15, 'ow', BLOCKS.ow.roofR);
    placeSolid(13, 15, 'ow', BLOCKS.ow.roofL);
    placeSolid(11, 16, 'ow', BLOCKS.ow.wallL);
    placeSolid(13, 16, 'ow', BLOCKS.ow.wallR);

    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        if (blocked[idx(x, y)]) continue;
        const b = biome[y][x];
        if (b === 'path' || b === 'water' || b === 'shore' || b === 'town' || b === 'waterfall') continue;
        const r = rnd(x, y);
        if (b === 'dark' && r < 0.42) placeSolid(x, y, 'forest', BLOCKS.forest.tree);
        else if (b === 'forest' && r < 0.28) placeSolid(x, y, 'forest', BLOCKS.forest.tree);
        else if (b === 'forest' && r < 0.4) placeSolid(x, y, 'forest', BLOCKS.forest.bush);
        else if (b === 'meadow' && r < 0.05) placeSolid(x, y, 'ow', BLOCKS.ow.treeL);
        else if (b === 'meadow' && r < 0.1) flowers.push({ x: x, y: y });
        else if (b === 'mountain' && r < 0.2) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'ice' && r < 0.12) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'volcanic' && r < 0.16) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'ruins' && r < 0.28) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'dirt' && r < 0.07) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'tall' && r < 0.04) flowers.push({ x: x, y: y });
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

  function drawBlock(sheetName, block, dx, dy) {
    const sheet = sheets[sheetName];
    const step = TILE / 4;
    for (let i = 0; i < 16; i++) {
      const tid = block[i];
      const sx = (tid % 16) * 8;
      const sy = (tid / 16 | 0) * 8;
      ctx.drawImage(sheet, sx, sy, 8, 8, dx + (i % 4) * step, dy + ((i / 4) | 0) * step, step, step);
    }
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
        const spec = FLOOR[b] || FLOOR.meadow;
        drawBlock(spec[0], spec[1], dx, dy);
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
      }
    }
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.x < x0 - 1 || f.y < y0 - 1 || f.x > x1 + 1 || f.y > y1 + 1) continue;
      drawBlock('ow', BLOCKS.ow.flowers, Math.round(f.x * TILE + ox), Math.round(f.y * TILE + oy));
    }
    const queue = [];
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.x < x0 - 1 || p.y < y0 - 1 || p.x > x1 + 1 || p.y > y1 + 1) continue;
      queue.push({ y: p.y * TILE + TILE, draw: (function (pp) {
        return function () { drawBlock(pp.sheet, pp.block, Math.round(pp.x * TILE + ox), Math.round(pp.y * TILE + oy)); };
      })(p) });
    }
    queue.push({ y: state.y, draw: drawPlayer });
    queue.sort(function (a, b) { return a.y - b.y; });
    for (let i = 0; i < queue.length; i++) queue[i].draw();
  }

  function drawPlayer() {
    const pose = POSE[state.dir] || POSE.down;
    const moving = state.path.length > 0 && state.mode === 'explore';
    const frame = pose[moving ? (Math.floor(state.moved / 16) % 2) : 0];
    const dw = SPRITE, dh = SPRITE;
    const dx = state.x - state.camX - dw / 2;
    const dy = state.y - state.camY - dh + 4;
    ctx.fillStyle = 'rgba(8,24,32,0.28)';
    ctx.beginPath();
    ctx.ellipse(state.x - state.camX, state.y - state.camY, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    const flip = state.dir === 'right';
    if (flip) {
      ctx.save();
      ctx.translate(Math.round(dx + dw), Math.round(dy));
      ctx.scale(-1, 1);
      ctx.drawImage(playerCanvas, 0, frame * 16, 16, 16, 0, 0, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(playerCanvas, 0, frame * 16, 16, 16, Math.round(dx), Math.round(dy), dw, dh);
    }
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

  const GB = [[224, 248, 208], [136, 192, 112], [52, 104, 86], [8, 24, 32]];
  const RED_SPRITE = [null, [248, 248, 248], [224, 48, 48], [16, 16, 16]];
  const RED_PIC = [[248, 248, 248], [240, 208, 176], [224, 48, 48], [16, 16, 16]];

  function grayIndex(v) {
    if (v >= 212) return 0;
    if (v >= 128) return 1;
    if (v >= 43) return 2;
    return 3;
  }

  function paint(img, palette) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const image = g.getImageData(0, 0, c.width, c.height);
    const d = image.data;
    for (let i = 0; i < d.length; i += 4) {
      const col = palette[grayIndex(d[i])];
      if (!col) d[i + 3] = 0;
      else { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; }
    }
    g.putImageData(image, 0, 0);
    return c;
  }

  async function boot() {
    buildMap();
    wire();
    syncSoundButtons();
    try {
      const src = {
        ow: 'assets/red/tiles/overworld.png',
        forest: 'assets/red/tiles/forest.png',
        plateau: 'assets/red/tiles/plateau.png',
        cavern: 'assets/red/tiles/cavern.png',
        port: 'assets/red/tiles/ship_port.png',
        center: 'assets/red/tiles/pokecenter.png',
        house: 'assets/red/tiles/reds_house.png',
      };
      const keys = Object.keys(src);
      const imgs = await Promise.all(keys.map(function (k) { return loadImage(src[k]); }).concat([
        loadImage('assets/red/sprites/red.png'),
        loadImage('assets/red/player/red.png'),
        loadImage('assets/red/sprites/poke_ball.png'),
      ], D.species.map(function (s) { return loadImage(s.sprite); })));
      keys.forEach(function (k, i) { sheets[k] = paint(imgs[i], GB); });
      // Interior sheets stay loaded with the Red set. Outdoor cells do not draw them.
      if (!sheets.center || !sheets.house) throw new Error('red interiors');
      playerCanvas = paint(imgs[keys.length], RED_SPRITE);
      const portrait = paint(imgs[keys.length + 1], RED_PIC);
      const ball = paint(imgs[keys.length + 2], RED_SPRITE);
      const ballURL = ball.toDataURL();
      document.querySelectorAll('#ball img, #throw-ball').forEach(function (el) { el.src = ballURL; });
      const face = document.getElementById('red-portrait');
      if (face) {
        face.src = portrait.toDataURL();
        face.hidden = false;
      }
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
