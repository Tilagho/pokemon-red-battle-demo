/* Pokémon GO Island — overworld, invisible joystick, GO-style flick catch.
   The world is pret/pokered, colored as four muted Game Boy shades and scaled
   by an integer 4× (8×8 tiles → 32px, 16×16 Red → 64px). Nearest-neighbor only.
   Encounter chip, signs, buttons, and the throw are drawn on this same pixel grid.
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
    shore: ['ow', BLOCKS.ow.grass],
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
  /* pret/pokered gfx/blocksets/overworld.bst. These are the Pallet / Viridian
     exteriors: house 56+57 / 60+61, gym 12–14 / 16–18, mart & center 32+33. */
  const OW = {
    12: [5, 6, 83, 83, 21, 56, 18, 18, 21, 56, 18, 18, 21, 22, 23, 23],
    13: [83, 83, 83, 83, 18, 18, 18, 18, 18, 18, 18, 18, 23, 23, 23, 23],
    14: [83, 83, 8, 9, 18, 18, 56, 25, 18, 18, 56, 25, 23, 23, 24, 25],
    16: [37, 38, 10, 10, 15, 34, 34, 34, 15, 10, 10, 10, 78, 26, 26, 26],
    17: [34, 47, 63, 34, 34, 34, 34, 34, 10, 10, 10, 10, 26, 26, 26, 26],
    18: [10, 10, 40, 41, 34, 34, 34, 31, 11, 12, 10, 31, 27, 28, 26, 79],
    32: [76, 83, 83, 83, 90, 18, 18, 18, 90, 18, 18, 18, 92, 23, 23, 23],
    33: [83, 83, 83, 77, 18, 18, 18, 90, 18, 18, 18, 90, 23, 23, 23, 93],
    56: [35, 35, 35, 35, 57, 35, 35, 35, 5, 6, 7, 7, 21, 22, 23, 23],
    57: [35, 35, 35, 35, 57, 35, 35, 35, 7, 7, 8, 9, 23, 23, 24, 25],
    60: [37, 38, 10, 34, 92, 23, 23, 23, 15, 34, 11, 12, 78, 26, 27, 28],
    61: [10, 10, 40, 41, 23, 23, 23, 93, 10, 10, 34, 31, 26, 26, 26, 79],
    114: [10, 10, 10, 31, 75, 75, 75, 31, 66, 67, 75, 31, 74, 74, 26, 79],
    115: [10, 10, 10, 31, 75, 75, 75, 31, 68, 69, 75, 31, 74, 74, 26, 79],
    124: [15, 10, 10, 10, 15, 75, 75, 75, 15, 75, 11, 12, 78, 26, 27, 28],
  };
  /* 16×16 overworld sprite rows in sprites/red.png: stand down/up/left, then walk. */
  const POSE = { down: [0, 3], up: [1, 4], left: [2, 5], right: [2, 5] };
  const SPRITE = TILE / 2;
  /* One Game Boy pixel. 8×8 Red tiles are drawn at 4×, so this is 4 CSS px. */
  const PX = TILE / 32;
  console.assert(PX === 4, 'GB pixel must stay on the 4× grid');

  const speciesById = {};
  D.species.forEach(function (s) { speciesById[s.id] = s; });

  const canvas = document.getElementById('view');
  /* Opaque backing store. A translucent canvas on iOS composites stale frames. */
  const ctx = canvas.getContext('2d', { alpha: false });
  let DPR = 1;
  const INK = '#081820';
  const PAPER = '#e0f8d0';
  const MID = '#88c070';
  const SHADE = '#346856';
  const BALL = 16 * PX;

  let ready = false;
  let bootError = false;
  let redPic = null;
  let ballCanvas = null;
  let shore = null;
  let waterFrames = null;
  let waterFrame = 0;
  let waterTick = 0;
  let dexScroll = 0;
  const spriteImg = {};
  const spriteSil = {};
  const ui = { hits: [], press: null, mon: null, ballHome: null, ballHit: null };

  const sheets = {};
  let playerCanvas = null;
  const biome = [];
  const props = [];
  const flowers = [];
  const signs = [];
  const blocked = new Uint8Array(MAP * MAP);
  const stick = { on: false, ox: 0, oy: 0, x: 0, y: 0, dir: null };
  let bumpT = 0;

  const state = {
    mode: 'title',
    x: (CENTER + 0.5) * TILE,
    y: (CENTER + 0.5) * TILE,
    dir: 'down',
    camHold: false,
    camLock: null,
    sign: null,
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
    tries: 0,
    spin: 0,
    curved: false,
    vx: 0,
    vy: 0,
    bx: 0,
    by: 0,
    ax: 0,
    ay: 0,
    drag: false,
    pts: [],
    trail: [],
    flightT: 0,
    shakes: 0,
    shakeT: 0,
    success: false,
    hideMon: false,
    holdT: 0,
    stars: [],
    last: null,
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

  function stamp(x, y, rows) {
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) placeSolid(x + c, y + r, 'ow', OW[rows[r][c]]);
    }
  }

  function placeSign(x, y, lines) {
    if (!inMap(x, y)) return;
    if (biome[y][x] === 'water' || biome[y][x] === 'path') return;
    blocked[idx(x, y)] = 1;
    signs.push({ x: x, y: y, lines: lines });
  }

  function townLot(x, y) {
    return x >= 10 && x <= 22 && y >= 10 && y <= 17;
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
    // Pallet house, Viridian gym, Pokémon Center, and Mart. Each door faces south.
    stamp(15, 14, [[56, 57], [60, 61]]);
    placeSign(15, 16, ["RED'S HOUSE", 'A QUIET HOUSE', 'ON THIS ISLAND.']);
    stamp(11, 14, [[12, 13, 14], [16, 17, 18]]);
    placeSign(11, 16, ['FIGHTING DOJO', 'TRAINERS MEET', 'AND PRACTICE.']);
    stamp(19, 14, [[32, 33], [124, 114]]);
    placeSign(19, 16, ['POKEMON', 'CENTER', 'A PLACE TO REST.']);
    stamp(19, 11, [[32, 33], [124, 115]]);
    placeSign(21, 12, ['POKEMON', 'MART', 'GOODS FOR THE ROAD.']);

    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        if (blocked[idx(x, y)] || townLot(x, y)) continue;
        const b = biome[y][x];
        if (b === 'path' || b === 'water' || b === 'shore' || b === 'town' || b === 'waterfall') continue;
        const r = rnd(x, y);
        if (b === 'dark' && r < 0.42) placeSolid(x, y, 'forest', BLOCKS.forest.tree);
        else if (b === 'forest' && r < 0.28) placeSolid(x, y, 'forest', BLOCKS.forest.tree);
        else if (b === 'forest' && r < 0.4) placeSolid(x, y, 'forest', BLOCKS.forest.bush);
        else if (b === 'meadow' && r < 0.05 && !nearOcean(x, y)) placeSolid(x, y, 'ow', BLOCKS.ow.treeL);
        else if (b === 'meadow' && r < 0.1 && !nearOcean(x, y)) flowers.push({ x: x, y: y });
        else if (b === 'mountain' && r < 0.2) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'ice' && r < 0.12) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'volcanic' && r < 0.16) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'ruins' && r < 0.28) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'dirt' && r < 0.07) placeSolid(x, y, 'plateau', BLOCKS.plateau.rock);
        else if (b === 'tall' && r < 0.04 && !nearOcean(x, y)) flowers.push({ x: x, y: y });
      }
    }
    console.assert(walkable(CENTER, CENTER), 'spawn should be walkable');
    console.assert(walkable(CENTER, CENTER + D.COAST), 'coast tile should be walkable');
    console.assert(!walkable(CENTER, CENTER + D.COAST + 1), 'past the coast is water');
    console.assert(biome[19][CENTER] === 'tall', 'south grass patch');
    console.assert(!walkable(15, 15), 'house wall');
    console.assert(!walkable(16, 15), 'house window');
    console.assert(walkable(15, 17), 'approach the house');
    console.assert(signs.length === 4, 'every building has a sign');
  }

  function walkable(x, y) {
    if (!inMap(x, y)) return false;
    if (biome[y][x] === 'water') return false;
    if (blocked[idx(x, y)]) return false;
    return true;
  }

  const DEAD = 24;
  const FACE = ['right', 'down', 'down', 'down', 'left', 'up', 'up', 'up'];

  function stickVector() {
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    if (dx * dx + dy * dy < DEAD * DEAD) return null;
    const oct = ((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8;
    const a = oct * (Math.PI / 4);
    return { x: Math.cos(a), y: Math.sin(a), oct: oct };
  }

  function nudge(dx, dy) {
    if (!dx && !dy) return false;
    const nx = state.x + dx;
    const ny = state.y + dy;
    if (!walkable(Math.floor(nx / TILE), Math.floor(ny / TILE))) return false;
    state.x = nx;
    state.y = ny;
    return true;
  }

  function holdCam() { state.camHold = true; }

  function loadImage(src) {
    return new Promise(function (res, rej) {
      const img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error(src)); };
      img.src = src;
    });
  }

  /* 1, 2, or 3 so each CSS pixel is a whole device pixel. A 2× buffer on a
     3× iPhone is a 1.5× resample, which shears the 4× grid into seams. */
  function deviceScale() {
    const raw = window.devicePixelRatio || 1;
    if (raw >= 2.75) return 3;
    if (raw >= 1.5) return 2;
    return 1;
  }
  function viewPixels() {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    return [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
  }
  function crisp() {
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
  }
  function resize() {
    DPR = deviceScale();
    const box = viewPixels();
    const w = box[0], h = box[1];
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const vv = window.visualViewport;
    if (vv) {
      canvas.style.left = Math.round(vv.offsetLeft) + 'px';
      canvas.style.top = Math.round(vv.offsetTop) + 'px';
    }
    state.viewW = w;
    state.viewH = h;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    crisp();
  }

  /* Nearest-neighbor upscale onto its own canvas. Drawing a crop out of the
     atlas lets Safari sample the next tile and stamp a dark vertical bar. */
  function scaleNN(src, sx, sy, sw, sh, scale) {
    const sc = src.getContext('2d', { willReadFrequently: true });
    const srcData = sc.getImageData(sx, sy, sw, sh).data;
    const staged = document.createElement('canvas');
    staged.width = sw * scale;
    staged.height = sh * scale;
    const g = staged.getContext('2d');
    const image = g.createImageData(staged.width, staged.height);
    const d = image.data;
    const dw = staged.width;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const si = (y * sw + x) * 4;
        const r = srcData[si], gc = srcData[si + 1], b = srcData[si + 2], a = srcData[si + 3];
        for (let py = 0; py < scale; py++) {
          const row = (y * scale + py) * dw;
          for (let px = 0; px < scale; px++) {
            const di = (row + x * scale + px) * 4;
            d[di] = r; d[di + 1] = gc; d[di + 2] = b; d[di + 3] = a;
          }
        }
      }
    }
    g.putImageData(image, 0, 0);
    const out = document.createElement('canvas');
    out.width = staged.width;
    out.height = staged.height;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(staged, 0, 0);
    return out;
  }
  function flipCanvas(src) {
    const w = src.width, h = src.height;
    const s = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
    const staged = document.createElement('canvas');
    staged.width = w;
    staged.height = h;
    const g = staged.getContext('2d');
    const image = g.createImageData(w, h);
    const d = image.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = (y * w + (w - 1 - x)) * 4;
        d[di] = s[si]; d[di + 1] = s[si + 1]; d[di + 2] = s[si + 2]; d[di + 3] = s[si + 3];
      }
    }
    g.putImageData(image, 0, 0);
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const og = out.getContext('2d');
    og.imageSmoothingEnabled = false;
    og.drawImage(staged, 0, 0);
    return out;
  }
  const tileBlit = {};
  function drawSheetTile(sheetName, tid, dx, dy) {
    const key = sheetName + ':' + tid;
    let c = tileBlit[key];
    if (!c) {
      const sheet = sheets[sheetName];
      c = scaleNN(sheet, (tid % 16) * 8, ((tid / 16) | 0) * 8, 8, 8, PX);
      tileBlit[key] = c;
    }
    crisp();
    ctx.drawImage(c, dx, dy);
  }
  const scaled8 = new WeakMap();
  function drawScaled8(src, dx, dy) {
    let c = scaled8.get(src);
    if (!c) {
      c = scaleNN(src, 0, 0, 8, 8, PX);
      scaled8.set(src, c);
    }
    crisp();
    ctx.drawImage(c, dx, dy);
  }
  let walkFrame = [];
  let walkFrameFlip = [];
  function buildWalkFrames() {
    walkFrame = [];
    walkFrameFlip = [];
    for (let f = 0; f < 6; f++) {
      const scaled = scaleNN(playerCanvas, 0, f * 16, 16, 16, PX);
      walkFrame.push(scaled);
      walkFrameFlip.push(flipCanvas(scaled));
    }
  }

  function drawBlock(sheetName, block, dx, dy) {
    const step = TILE / 4;
    for (let i = 0; i < 16; i++) {
      drawSheetTile(sheetName, block[i], dx + (i % 4) * step, dy + ((i / 4) | 0) * step);
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
    camX = snap(camX);
    camY = snap(camY);
    const lock = state.camLock;
    if (lock && lock.x === state.x && lock.y === state.y && lock.viewW === w && lock.viewH === h) {
      camX = lock.camX;
      camY = lock.camY;
    } else {
      state.camLock = null;
    }
    if (state.camHold) {
      state.camLock = { x: state.x, y: state.y, camX: camX, camY: camY, viewW: w, viewH: h };
      state.camHold = false;
    }
    state.camX = camX;
    state.camY = camY;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#081820';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    crisp();
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
        if (b === 'water' || b === 'waterfall') drawWater(dx, dy);
        else {
          const spec = FLOOR[b] || FLOOR.meadow;
          drawBlock(spec[0], spec[1], dx, dy);
          drawShoreRim(x, y, dx, dy);
        }
      }
    }
    for (let i = 0; i < flowers.length; i++) {
      const f = flowers[i];
      if (f.x < x0 - 1 || f.y < y0 - 1 || f.x > x1 + 1 || f.y > y1 + 1) continue;
      drawBlock('ow', BLOCKS.ow.flowers, Math.round(f.x * TILE + ox), Math.round(f.y * TILE + oy));
    }
    /* Trees, rocks, houses, and signs are background blocks, same as pret.
       Red is a sprite, so he paints after them. Sorting a whole tree block
       against his feet covered the half of him that overlaps the trunk. */
    const propsDraw = [];
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.x < x0 - 1 || p.y < y0 - 1 || p.x > x1 + 1 || p.y > y1 + 1) continue;
      propsDraw.push(p);
    }
    propsDraw.sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
    for (let i = 0; i < propsDraw.length; i++) {
      const p = propsDraw[i];
      drawBlock(p.sheet, p.block, Math.round(p.x * TILE + ox), Math.round(p.y * TILE + oy));
    }
    for (let i = 0; i < signs.length; i++) {
      const s = signs[i];
      if (s.x < x0 - 1 || s.y < y0 - 1 || s.x > x1 + 1 || s.y > y1 + 1) continue;
      drawSignPost(s, ox, oy);
    }
    drawPlayer();
    drawPixelUI();
  }

  function drawPlayer() {
    const pose = POSE[state.dir] || POSE.down;
    const moving = !!stick.dir && state.mode === 'explore';
    const frame = pose[moving ? (Math.floor(state.moved / 32) % 2) : 0];
    const dw = SPRITE, dh = SPRITE;
    const dx = snap(state.x - state.camX - dw / 2);
    const dy = snap(state.y - state.camY - dh + PX);
    const fx = snap(state.x - state.camX);
    const fy = snap(state.y - state.camY);
    ctx.fillStyle = INK;
    ctx.fillRect(fx - 2 * PX, fy - PX, 4 * PX, PX);
    ctx.fillRect(fx - 3 * PX, fy, 6 * PX, PX);
    ctx.fillRect(fx - 2 * PX, fy + PX, 4 * PX, PX);
    const img = state.dir === 'right' ? walkFrameFlip[frame] : walkFrame[frame];
    if (!img) return;
    /* A negative scale here makes iOS repeat the side-view frame to the right. */
    crisp();
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function drawSignPost(s, ox, oy) {
    const step = TILE / 4;
    const tiles = [70, 71, 86, 87];
    const dx = Math.round(s.x * TILE + ox + (TILE - 2 * step) / 2);
    const dy = Math.round(s.y * TILE + oy + step);
    for (let i = 0; i < 4; i++) {
      drawSheetTile('ow', tiles[i], dx + (i % 2) * step, dy + ((i / 2) | 0) * step);
    }
  }

  let lastTileStep = CENTER + CENTER * MAP;
  function update(dt) {
    if (state.mode !== 'explore') return;
    state.cooldown = Math.max(0, state.cooldown - dt);
    bumpT = Math.max(0, bumpT - dt);
    stick.dir = null;
    if (stick.on) {
      const v = stickVector();
      if (v) {
        stick.dir = v;
        state.dir = FACE[v.oct];
        const stepX = v.x * SPEED * dt;
        const stepY = v.y * SPEED * dt;
        const movedX = nudge(stepX, 0);
        const movedY = nudge(0, stepY);
        if ((stepX && !movedX) || (stepY && !movedY)) {
          if (bumpT <= 0) { bumpT = 0.32; IslandAudio.bump(); }
        }
        if (movedX || movedY) state.moved += Math.hypot(movedX ? stepX : 0, movedY ? stepY : 0);
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
      if (enc.phase === 'idle' && rate && state.steps >= 2 && state.cooldown <= 0 && Math.random() < rate) {
        startEncounter(b);
      }
    }
    if (enc.phase === 'chip') {
      const dist = Math.hypot(state.x - enc.ax, state.y - enc.ay);
      if (dist >= 3 * TILE) endEncounter();
    }
  }

  function canvasPoint(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  function hitAt(x, y) {
    const list = ui.hits;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) return b.id;
    }
    return null;
  }
  function signInFront() {
    const tx = Math.floor(state.x / TILE);
    const ty = Math.floor(state.y / TILE);
    const step = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.dir] || [0, 1];
    for (let i = 0; i < signs.length; i++) {
      const s = signs[i];
      if (s.x === tx + step[0] && s.y === ty + step[1]) return s;
    }
    return null;
  }
  function signUnderPoint(px, py) {
    const step = TILE / 4;
    for (let i = signs.length - 1; i >= 0; i--) {
      const s = signs[i];
      const sx = s.x * TILE - state.camX + (TILE - 2 * step) / 2;
      const sy = s.y * TILE - state.camY + step;
      if (px < sx - 8 * PX || py < sy - 8 * PX || px >= sx + 2 * step + 8 * PX || py >= sy + 2 * step + 8 * PX) continue;
      const dist = Math.max(Math.abs(state.x / TILE - (s.x + 0.5)), Math.abs(state.y / TILE - (s.y + 0.5)));
      if (dist <= 1.8) return s;
    }
    return null;
  }
  function openSign(s) {
    if (!s || state.mode !== 'explore') return;
    stick.on = false;
    stick.dir = null;
    holdCam();
    state.sign = s;
    state.mode = 'sign';
    IslandAudio.click();
  }
  function closeSign() {
    if (state.mode !== 'sign') return;
    holdCam();
    state.mode = 'explore';
    state.sign = null;
    IslandAudio.click();
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    IslandAudio.unlock();
    if (!ready) return;
    const p = canvasPoint(e);
    const id = hitAt(p[0], p[1]);
    if (state.mode === 'title' || state.mode === 'dex' || state.mode === 'sign') {
      ui.press = id;
      return;
    }
    if (state.mode === 'throw') {
      onThrowDown(e, p[0], p[1], id);
      return;
    }
    if (id) {
      ui.press = id;
      return;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already captured */ }
    stick.on = true;
    stick.ox = p[0];
    stick.oy = p[1];
    stick.x = p[0];
    stick.y = p[1];
    stick.dir = null;
  }
  function onPointerMove(e) {
    if (e.cancelable) e.preventDefault();
    const p = canvasPoint(e);
    if (state.mode === 'throw' && enc.drag) {
      noteSpin(p[0], p[1]);
      enc.pts.push({ x: p[0], y: p[1], t: performance.now() });
      if (enc.pts.length > 28) enc.pts.shift();
      enc.bx = p[0] - BALL / 2;
      enc.by = p[1] - BALL / 2;
      return;
    }
    if (!stick.on || state.mode !== 'explore') return;
    stick.x = p[0];
    stick.y = p[1];
  }
  function onPointerUp(e) {
    const p = e ? canvasPoint(e) : null;
    if (enc.drag) releaseThrow();
    if (ui.press && p) {
      const id = hitAt(p[0], p[1]);
      if (id === ui.press) activate(id);
      else if (state.mode === 'sign') closeSign();
    } else if (state.mode === 'sign') {
      closeSign();
    } else if (stick.on && p && state.mode === 'explore') {
      const moved = Math.hypot(p[0] - stick.ox, p[1] - stick.oy);
      if (moved < DEAD) {
        const near = signUnderPoint(p[0], p[1]) || signInFront();
        if (near) openSign(near);
      }
    }
    ui.press = null;
    stick.on = false;
    stick.dir = null;
  }

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

  function snap(v) { return Math.round(v / PX) * PX; }

  function isOcean(x, y) {
    if (!inMap(x, y)) return true;
    const b = biome[y][x];
    return b === 'water' || b === 'waterfall';
  }
  function nearOcean(x, y) {
    return isOcean(x - 1, y) || isOcean(x + 1, y) || isOcean(x, y - 1) || isOcean(x, y + 1);
  }

  function drawWater(dx, dy) {
    const block = BLOCKS.ow.water;
    const step = TILE / 4;
    const frame = waterFrames[waterFrame];
    for (let i = 0; i < 16; i++) {
      const tid = block[i];
      const destX = dx + (i % 4) * step;
      const destY = dy + ((i / 4) | 0) * step;
      if (tid === 20 && frame) drawScaled8(frame, destX, destY);
      else drawSheetTile('ow', tid, destX, destY);
    }
  }

  function drawShoreRim(x, y, dx, dy) {
    if (!shore || isOcean(x, y)) return;
    const n = isOcean(x, y - 1), s = isOcean(x, y + 1), e = isOcean(x + 1, y), w = isOcean(x - 1, y);
    const se = isOcean(x + 1, y + 1), sw = isOcean(x - 1, y + 1);
    const ne = isOcean(x + 1, y - 1), nw = isOcean(x - 1, y - 1);
    if (!n && !s && !e && !w && !se && !sw && !ne && !nw) return;
    const step = TILE / 4;
    function stamp(tile, col, row) {
      drawScaled8(tile, dx + col * step, dy + row * step);
    }
    if (n) for (let i = 0; i < 4; i++) stamp(shore.n, i, 0);
    if (s) for (let i = 0; i < 4; i++) stamp(shore.s, i, 3);
    if (w) for (let i = 0; i < 4; i++) stamp(shore.w, 0, i);
    if (e) for (let i = 0; i < 4; i++) stamp(shore.e, 3, i);
    if ((n && w) || nw) stamp(shore.nw, 0, 0);
    if ((n && e) || ne) stamp(shore.ne, 3, 0);
    if ((s && w) || sw) stamp(shore.sw, 0, 3);
    if ((s && e) || se) stamp(shore.se, 3, 3);
  }

  const FONT = {};
  function addGlyph(ch, rows) {
    const bits = [];
    for (let y = 0; y < 8; y++) {
      let n = 0;
      const s = rows[y] || '';
      for (let x = 0; x < 8; x++) if (s.charAt(x) === '#') n |= 128 >> x;
      bits.push(n);
    }
    FONT[ch] = bits;
  }
  const G = {
    ' ': ['', '', '', '', '', '', '', ''],
    'A': [' ## ', '#  #', '#  #', '####', '#  #', '#  #', '#  #', ''],
    'B': ['### ', '#  #', '#  #', '### ', '#  #', '#  #', '### ', ''],
    'C': [' ###', '#   ', '#   ', '#   ', '#   ', '#   ', ' ###', ''],
    'D': ['### ', '#  #', '#  #', '#  #', '#  #', '#  #', '### ', ''],
    'E': ['####', '#   ', '#   ', '### ', '#   ', '#   ', '####', ''],
    'F': ['####', '#   ', '#   ', '### ', '#   ', '#   ', '#   ', ''],
    'G': [' ###', '#   ', '#   ', '# ##', '#  #', '#  #', ' ###', ''],
    'H': ['#  #', '#  #', '#  #', '####', '#  #', '#  #', '#  #', ''],
    'I': ['###', ' # ', ' # ', ' # ', ' # ', ' # ', '###', ''],
    'J': ['  ##', '   #', '   #', '   #', '#  #', '#  #', ' ## ', ''],
    'K': ['#  #', '# # ', '##  ', '#   ', '##  ', '# # ', '#  #', ''],
    'L': ['#   ', '#   ', '#   ', '#   ', '#   ', '#   ', '####', ''],
    'M': ['#   #', '## ##', '# # #', '#   #', '#   #', '#   #', '#   #', ''],
    'N': ['#  #', '## #', '## #', '# ##', '# ##', '#  #', '#  #', ''],
    'O': [' ## ', '#  #', '#  #', '#  #', '#  #', '#  #', ' ## ', ''],
    'P': ['### ', '#  #', '#  #', '### ', '#   ', '#   ', '#   ', ''],
    'Q': [' ## ', '#  #', '#  #', '#  #', '# ##', '#  #', ' ## ', ''],
    'R': ['### ', '#  #', '#  #', '### ', '# # ', '#  #', '#  #', ''],
    'S': [' ###', '#   ', '#   ', ' ## ', '   #', '   #', '### ', ''],
    'T': ['####', ' #  ', ' #  ', ' #  ', ' #  ', ' #  ', ' #  ', ''],
    'U': ['#  #', '#  #', '#  #', '#  #', '#  #', '#  #', ' ## ', ''],
    'V': ['#  #', '#  #', '#  #', '#  #', '#  #', ' ## ', ' ## ', ''],
    'W': ['#   #', '#   #', '#   #', '# # #', '# # #', '## ##', '#   #', ''],
    'X': ['#  #', '#  #', ' ## ', ' ## ', ' ## ', '#  #', '#  #', ''],
    'Y': ['#  #', '#  #', ' ## ', ' #  ', ' #  ', ' #  ', ' #  ', ''],
    'Z': ['####', '   #', '  # ', ' #  ', '#   ', '#   ', '####', ''],
    '0': [' ## ', '#  #', '#  #', '#  #', '#  #', '#  #', ' ## ', ''],
    '1': [' # ', '## ', ' # ', ' # ', ' # ', ' # ', '###', ''],
    '2': [' ## ', '#  #', '   #', '  # ', ' #  ', '#   ', '####', ''],
    '3': ['### ', '   #', '   #', ' ## ', '   #', '   #', '### ', ''],
    '4': ['#  #', '#  #', '#  #', '####', '   #', '   #', '   #', ''],
    '5': ['####', '#   ', '#   ', '### ', '   #', '   #', '### ', ''],
    '6': [' ## ', '#   ', '#   ', '### ', '#  #', '#  #', ' ## ', ''],
    '7': ['####', '   #', '  # ', '  # ', ' #  ', ' #  ', ' #  ', ''],
    '8': [' ## ', '#  #', '#  #', ' ## ', '#  #', '#  #', ' ## ', ''],
    '9': [' ## ', '#  #', '#  #', ' ###', '   #', '   #', ' ## ', ''],
    '.': ['', '', '', '', '', '##', '##', ''],
    ',': ['', '', '', '', ' #', ' #', '# ', ''],
    '!': [' # ', ' # ', ' # ', ' # ', '   ', ' # ', ' # ', ''],
    '?': [' ## ', '#  #', '   #', '  # ', ' #  ', '    ', ' #  ', ''],
    "'": [' # ', ' # ', '#  ', '', '', '', '', ''],
    '/': ['   #', '   #', '  # ', '  # ', ' #  ', ' #  ', '#   ', ''],
    '-': ['', '', '', '###', '', '', '', ''],
    ':': ['', ' # ', ' # ', '', ' # ', ' # ', '', ''],
  };
  Object.keys(G).forEach(function (ch) { addGlyph(ch, G[ch]); });

  const ADV = 6;

  function textW(text) { return text.length * ADV * PX; }

  function drawText(text, x, y, color) {
    ctx.fillStyle = color || INK;
    let cx = snap(x);
    const cy = snap(y);
    for (let i = 0; i < text.length; i++) {
      const g = FONT[text.charAt(i)] || FONT[' '];
      for (let row = 0; row < 8; row++) {
        const bits = g[row];
        for (let col = 0; col < 8; col++) {
          if (bits & (128 >> col)) ctx.fillRect(cx + col * PX, cy + row * PX, PX, PX);
        }
      }
      cx += ADV * PX;
    }
  }

  function wrapLines(text, maxW) {
    const maxChars = Math.max(1, Math.floor(maxW / (ADV * PX)));
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (let i = 0; i < words.length; i++) {
      let w = words[i];
      while (w.length > maxChars) {
        if (cur) { lines.push(cur); cur = ''; }
        lines.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      if (!w) continue;
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function buttonSize(label, maxInner) {
    const limit = Math.max(8 * PX, maxInner || (textW(label) + PX));
    const lines = wrapLines(label, limit);
    let w = 0;
    for (let i = 0; i < lines.length; i++) w = Math.max(w, textW(lines[i]));
    return { lines: lines, w: snap(w + 4 * PX), h: snap((lines.length * 8 + 4) * PX) };
  }

  function drawButton(x, y, w, h, lines, pressed) {
    x = snap(x); y = snap(y); w = snap(w); h = snap(h);
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pressed ? MID : PAPER;
    ctx.fillRect(x + PX, y + PX, Math.max(PX, w - 2 * PX), Math.max(PX, h - 2 * PX));
    const th = lines.length * 8 * PX;
    let ty = y + snap((h - th) / 2);
    for (let i = 0; i < lines.length; i++) {
      const tw = textW(lines[i]);
      drawText(lines[i], x + snap((w - tw) / 2), ty, INK);
      ty += 8 * PX;
    }
  }

  function placeButton(x, y, id, label, forceW) {
    const inner = forceW ? forceW - 4 * PX : textW(label);
    const b = buttonSize(label, inner);
    const w = forceW ? snap(forceW) : b.w;
    const h = b.h;
    drawButton(x, y, w, h, b.lines, ui.press === id);
    const box = { id: id, x: snap(x), y: snap(y), w: w, h: h };
    ui.hits.push(box);
    return { x: box.x, y: box.y, w: w, h: h, bottom: box.y + h };
  }

  function drawPanel(x, y, w, h) {
    x = snap(x); y = snap(y); w = snap(w); h = snap(h);
    ctx.fillStyle = INK;
    ctx.fillRect(x, y, w, h);
    if (w > 2 * PX && h > 2 * PX) {
      ctx.fillStyle = PAPER;
      ctx.fillRect(x + PX, y + PX, w - 2 * PX, h - 2 * PX);
    }
    return { x: x, y: y, w: w, h: h };
  }

  /* pret/pokered gfx/font/font_extra.png tiles $79–$7e. One tile is 8 GB px. */
  const BOX = {
    tl: [0, 24, 45, 126, 66, 37, 26, 20],
    t: [0, 0, 255, 0, 255, 255, 0, 0],
    tr: [0, 24, 172, 126, 66, 164, 88, 40],
    v: [40, 40, 40, 40, 40, 40, 40, 40],
    bl: [20, 26, 45, 126, 66, 37, 24, 0],
    br: [40, 88, 172, 126, 66, 164, 24, 0],
  };
  const TW = 8 * PX;

  function drawBoxTile(bits, x, y) {
    ctx.fillStyle = INK;
    for (let row = 0; row < 8; row++) {
      const b = bits[row];
      for (let col = 0; col < 8; col++) {
        if (b & (128 >> col)) ctx.fillRect(x + col * PX, y + row * PX, PX, PX);
      }
    }
  }

  function drawRedBox(x, y, w, h) {
    w = Math.max(TW * 3, Math.ceil(w / TW) * TW);
    h = Math.max(TW * 3, Math.ceil(h / TW) * TW);
    x = snap(x);
    y = snap(y);
    ctx.fillStyle = PAPER;
    ctx.fillRect(x, y, w, h);
    const cols = w / TW;
    const rows = h / TW;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let bits = null;
        if (r === 0 && c === 0) bits = BOX.tl;
        else if (r === 0 && c === cols - 1) bits = BOX.tr;
        else if (r === rows - 1 && c === 0) bits = BOX.bl;
        else if (r === rows - 1 && c === cols - 1) bits = BOX.br;
        else if (r === 0 || r === rows - 1) bits = BOX.t;
        else if (c === 0 || c === cols - 1) bits = BOX.v;
        if (bits) drawBoxTile(bits, x + c * TW, y + r * TW);
      }
    }
    return { x: x, y: y, w: w, h: h, ix: x + TW, iy: y + TW, iw: w - 2 * TW, ih: h - 2 * TW };
  }

  const LEGAL = 'UNOFFICIAL FAN PROJECT. NOT AFFILIATED WITH NINTENDO, GAME FREAK, OR THE POKEMON COMPANY.';

  function drawFooter() {
    const lines = wrapLines(LEGAL, Math.max(8 * PX, state.viewW - 4 * PX));
    const h = (lines.length * 8 + 2) * PX;
    const y = snap(state.viewH - h);
    ctx.fillStyle = INK;
    ctx.fillRect(0, y, snap(state.viewW), state.viewH - y);
    ctx.fillStyle = PAPER;
    ctx.fillRect(PX, y + PX, Math.max(PX, snap(state.viewW) - 2 * PX), Math.max(PX, h - 2 * PX));
    for (let i = 0; i < lines.length; i++) drawText(lines[i], 2 * PX, y + PX + i * 8 * PX, INK);
    return y;
  }

  function drawHud() {
    const y = PX;
    const narrow = state.viewW < 420;
    const dex = placeButton(PX, y, 'dex', 'DEX');
    const soundLabel = IslandAudio.isMuted() ? (narrow ? 'MUT' : 'MUTE') : (narrow ? 'SND' : 'SOUND');
    const sw = buttonSize(soundLabel).w;
    const sound = placeButton(snap(state.viewW - sw - PX), y, 'sound', soundLabel);
    const count = caughtCount() + '/15';
    const cx = dex.x + dex.w + PX;
    if (sound.x - cx >= textW(count) + 2 * PX) {
      ctx.fillStyle = INK;
      ctx.fillRect(cx, y, textW(count) + 2 * PX, 10 * PX);
      drawText(count, cx + PX, y + PX, PAPER);
    }
    return Math.max(dex.bottom, sound.bottom);
  }

  function gridSil(src, dw, dh) {
    if (dw === src.width && dh === src.height) return src;
    const key = dw + 'x' + dh;
    if (!src._small) src._small = {};
    if (src._small[key]) return src._small[key];
    const c = document.createElement('canvas');
    c.width = dw;
    c.height = dh;
    const g = c.getContext('2d');
    const im = g.createImageData(dw, dh);
    const sd = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data;
    const o = im.data;
    for (let y = 0; y < dh; y++) {
      const sy = Math.min(src.height - 1, ((y * src.height / dh) | 0));
      for (let x = 0; x < dw; x++) {
        const sx = Math.min(src.width - 1, ((x * src.width / dw) | 0));
        const si = (sy * src.width + sx) * 4;
        const di = (y * dw + x) * 4;
        o[di] = sd[si];
        o[di + 1] = sd[si + 1];
        o[di + 2] = sd[si + 2];
        o[di + 3] = sd[si + 3];
      }
    }
    g.putImageData(im, 0, 0);
    src._small[key] = c;
    return c;
  }

  function drawChip(footTop) {
    const mon = enc.mon;
    const sil = spriteSil[mon.id];
    if (!sil) return;
    // Screen overlay only. Red's world position and camera are not touched.
    const redBottom = snap(state.y - state.camY - SPRITE + PX) + SPRITE;
    const bandTop = snap(redBottom + 2 * PX);
    const bandBottom = snap(footTop - PX);
    const bandH = Math.max(TW * 3, bandBottom - bandTop);
    const outerW = Math.max(TW * 3, Math.floor((state.viewW - 2 * PX) / TW) * TW);
    const innerW = outerW - 2 * TW;
    let step = 1;
    let lay = null;
    while (step <= 8) {
      const dw = Math.max(1, (sil.width / step) | 0);
      const dh = Math.max(1, (sil.height / step) | 0);
      const cssW = dw * PX;
      const cssH = dh * PX;
      const away = buttonSize('BACK AWAY', innerW - 4 * PX);
      const cat = buttonSize('CATCH!', innerW - 4 * PX);
      const innerH = snap(PX + cssH + PX + away.h + PX + cat.h + PX);
      const outerH = Math.ceil(innerH / TW) * TW + 2 * TW;
      lay = { dw: dw, dh: dh, cssW: cssW, cssH: cssH, innerW: innerW, away: away, cat: cat, outerH: outerH };
      if (outerH <= bandH) break;
      step++;
    }
    let y = snap(bandBottom - lay.outerH);
    if (y < bandTop) y = bandTop;
    const x = snap((state.viewW - outerW) / 2);
    const box = drawRedBox(x, y, outerW, lay.outerH);
    const sprite = gridSil(sil, lay.dw, lay.dh);
    ctx.imageSmoothingEnabled = false;
    const sx = snap(box.ix + (box.iw - lay.cssW) / 2);
    const sy = snap(box.iy + PX);
    if (sy + lay.cssH <= box.y + box.h - TW) {
      ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, sx, sy, lay.cssW, lay.cssH);
    }
    let by = snap(sy + lay.cssH + PX);
    if (by + lay.away.h <= box.iy + box.ih) {
      const awayBtn = placeButton(box.ix + 2 * PX, by, 'away', 'BACK AWAY', box.iw - 4 * PX);
      const catchY = snap(awayBtn.bottom + PX);
      if (catchY + lay.cat.h <= box.iy + box.ih) {
        placeButton(box.ix + 2 * PX, catchY, 'catch', 'CATCH!', box.iw - 4 * PX);
      }
    }
  }

  let promptBlink = 0;
  function drawSignBox() {
    const s = state.sign;
    if (!s) return;
    promptBlink++;
    const w = Math.max(TW * 3, Math.floor(state.viewW / TW) * TW);
    const x = snap((state.viewW - w) / 2);
    const flat = [];
    const limit = w - 2 * TW - 2 * PX;
    for (let i = 0; i < s.lines.length; i++) {
      const wrapped = wrapLines(s.lines[i], limit);
      for (let k = 0; k < wrapped.length; k++) flat.push(wrapped[k]);
    }
    const h = TW * (2 + Math.max(1, flat.length));
    let y = snap(state.viewH - h - PX);
    if (y < 14 * PX) y = 14 * PX;
    const box = drawRedBox(x, y, w, h);
    for (let i = 0; i < flat.length; i++) drawText(flat[i], box.ix + PX, box.iy + i * 8 * PX, INK);
    if (((promptBlink / 18) | 0) % 2 === 0) {
      const ax = box.x + box.w - TW + 2 * PX;
      const ay = box.y + box.h - TW + 3 * PX;
      ctx.fillStyle = INK;
      ctx.fillRect(ax, ay, PX, PX);
      ctx.fillRect(ax - PX, ay + PX, 3 * PX, PX);
      ctx.fillRect(ax, ay + 2 * PX, PX, PX);
    }
  }

  function drawBallAt(x, y) {
    if (!ballCanvas) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ballCanvas, 0, 0, ballCanvas.width, ballCanvas.height, snap(x), snap(y), BALL, BALL);
  }

  function drawTrail(pts, ox, oy) {
    for (let i = 0; i < pts.length; i++) {
      ctx.fillStyle = i % 2 ? '#f8f8f8' : '#e03030';
      const px = snap(pts[i].x + (ox || 0));
      const py = snap(pts[i].y + (oy || 0));
      ctx.fillRect(px, py, PX * 2, PX * 2);
    }
  }

  function drawMeter(x, y, w) {
    const slots = 8;
    const seg = 4 * PX;
    const gap = PX;
    const mw = slots * seg + (slots - 1) * gap;
    let mx = snap(x + (w - mw) / 2);
    const filled = Math.max(0, Math.min(slots, Math.round(Math.min(1, Math.abs(enc.spin) / 0.85) * slots)));
    const curved = Math.abs(enc.spin) >= 0.85 || (enc.phase === 'flight' && enc.curved);
    for (let i = 0; i < slots; i++) {
      ctx.fillStyle = INK;
      ctx.fillRect(mx, y, seg, 4 * PX);
      ctx.fillStyle = i < filled ? (curved ? SHADE : MID) : PAPER;
      ctx.fillRect(mx + PX, y + PX, seg - 2 * PX, 2 * PX);
      mx += seg + gap;
    }
    const label = curved ? 'CURVE' : 'STRAIGHT';
    drawText(label, snap(x + (w - textW(label)) / 2), y + 5 * PX, INK);
  }

  function drawThrow(footTop) {
    const top = 16 * PX;
    const x = PX;
    const w = snap(state.viewW - 2 * PX);
    const y = top;
    const h = snap(Math.max(32 * PX, footTop - y - PX));
    drawPanel(x, y, w, h);
    const mon = enc.mon;
    const img = spriteImg[mon.id];
    const name = mon.name;
    drawText(name, snap(x + (w - textW(name)) / 2), y + 2 * PX, INK);
    drawText(mon.type, snap(x + (w - textW(mon.type)) / 2), y + 12 * PX, INK);
    const sw = img.width * PX;
    const sh = img.height * PX;
    const showAway = enc.phase === 'aim' || enc.phase === 'caught' || enc.phase === 'fled';
    const awayH = showAway ? buttonSize('BACK AWAY', w - 4 * PX).h : 0;
    const ballY = snap(y + h - awayH - BALL - 3 * PX);
    const ballX = snap(x + (w - BALL) / 2);
    ui.ballHome = { x: ballX, y: ballY, w: BALL, h: BALL };
    ui.ballHit = { x: ballX - 4 * PX, y: ballY - 4 * PX, w: BALL + 8 * PX, h: BALL + 8 * PX };
    if (enc.phase === 'aim' && !enc.drag) {
      enc.bx = ballX;
      enc.by = ballY;
    }
    let spriteY = y + 22 * PX;
    if (spriteY + sh > ballY - 16 * PX) spriteY = snap(Math.max(y + 22 * PX, ballY - 16 * PX - sh));
    const spriteX = snap(x + (w - sw) / 2);
    ui.mon = { x: spriteX, y: spriteY, w: sw, h: sh };
    if (!enc.hideMon) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, img.width, img.height, spriteX, spriteY, sw, sh);
    }
    if (enc.phase === 'caught') {
      for (let i = 0; i < enc.stars.length; i++) {
        if (Math.floor(enc.holdT * 8) % 2 === i % 2) continue;
        ctx.fillStyle = INK;
        ctx.fillRect(enc.stars[i].x, enc.stars[i].y, PX * 2, PX * 2);
      }
    }
    const meterY = snap(ballY - 12 * PX);
    if (enc.phase === 'aim' || enc.phase === 'flight') drawMeter(x, meterY, w);
    let status = enc.note || 'FLICK UP';
    if (enc.phase === 'caught') status = 'GOTCHA! ' + name;
    else if (enc.phase === 'fled') status = name + ' FLED!';
    else if (enc.phase === 'flight') status = enc.curved ? 'CURVE BALL' : 'STRAIGHT';
    else if (enc.phase === 'shake') status = enc.curved ? 'CURVE BALL' : 'STRAIGHT';
    else if (enc.drag && Math.abs(enc.spin) >= 0.85) status = 'CURVE';
    const lines = wrapLines(status, w - 4 * PX).slice(0, 2);
    for (let i = 0; i < lines.length; i++) {
      drawText(lines[i], snap(x + (w - textW(lines[i])) / 2), meterY - (lines.length - i) * 8 * PX - PX, INK);
    }
    if (enc.phase === 'shake' && ui.mon) {
      const dir = Math.floor(enc.shakeT / 0.08) % 2 ? -2 : 2;
      drawBallAt(ui.mon.x + ui.mon.w / 2 - BALL / 2 + dir * PX, ui.mon.y + ui.mon.h / 2 - BALL / 2);
    } else if (enc.phase !== 'caught' && enc.phase !== 'fled') {
      if (enc.phase === 'flight') drawTrail(enc.trail, BALL / 2, BALL / 2);
      else if (enc.drag) drawTrail(enc.pts, 0, 0);
      drawBallAt(enc.bx, enc.by);
    }
    if (showAway) placeButton(x + 2 * PX, snap(y + h - awayH - PX), 'away', enc.phase === 'aim' ? 'BACK AWAY' : 'WALK', w - 4 * PX);
  }

  function drawDex(footTop) {
    const x = PX;
    const y = 16 * PX;
    const w = snap(state.viewW - 2 * PX);
    const h = snap(Math.max(40 * PX, footTop - y - PX));
    drawPanel(x, y, w, h);
    const title = 'POKEDEX ' + caughtCount() + '/15';
    const titleLines = wrapLines(title, w - 4 * PX);
    for (let i = 0; i < titleLines.length; i++) {
      drawText(titleLines[i], x + 2 * PX, y + 2 * PX + i * 8 * PX, INK);
    }
    const btnH = buttonSize('OK').h;
    const by = snap(y + h - btnH - 2 * PX);
    const bw = snap((w - 8 * PX) / 3);
    const listTop = y + 2 * PX + titleLines.length * 8 * PX + PX;
    const rowH = 10 * PX;
    const rows = Math.max(1, Math.floor((by - PX - listTop) / rowH));
    const maxScroll = Math.max(0, D.species.length - rows);
    if (dexScroll > maxScroll) dexScroll = maxScroll;
    if (dexScroll < 0) dexScroll = 0;
    for (let i = 0; i < rows; i++) {
      const s = D.species[i + dexScroll];
      if (!s) break;
      const have = dex.indexOf(s.id) >= 0;
      drawText(have ? s.name : '???', x + 2 * PX, listTop + i * rowH, have ? INK : SHADE);
    }
    placeButton(x + 2 * PX, by, 'dexup', 'UP', bw);
    placeButton(x + 4 * PX + bw, by, 'dexdown', 'DN', bw);
    placeButton(x + 6 * PX + bw * 2, by, 'dexclose', 'OK', bw);
  }

  function drawTitle() {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, state.viewW, state.viewH);
    const foot = drawFooter();
    let y = 2 * PX;
    const a = 'POKEMON';
    const b = 'GO ISLAND';
    drawText(a, snap((state.viewW - textW(a)) / 2), y, PAPER);
    y += 10 * PX;
    drawText(b, snap((state.viewW - textW(b)) / 2), y, PAPER);
    y += 12 * PX;
    const pics = [];
    if (redPic) pics.push(redPic);
    if (spriteImg.bulbasaur) pics.push(spriteImg.bulbasaur);
    const need = 3 * 16 * PX;
    const gap = PX;
    let rowW = 0;
    let rowH = 0;
    for (let i = 0; i < pics.length; i++) {
      rowW += pics[i].width * PX + gap;
      rowH = Math.max(rowH, pics[i].height * PX);
    }
    ctx.imageSmoothingEnabled = false;
    if (pics.length && y + rowH + need < foot && rowW < state.viewW - PX) {
      let x = snap((state.viewW - rowW) / 2);
      for (let i = 0; i < pics.length; i++) {
        const im = pics[i];
        const w = im.width * PX;
        const h = im.height * PX;
        ctx.drawImage(im, 0, 0, im.width, im.height, x, y, w, h);
        x += w + gap;
      }
      y += rowH + 2 * PX;
    } else if (spriteImg.bulbasaur && y + spriteImg.bulbasaur.height * PX + need < foot) {
      const im = spriteImg.bulbasaur;
      const w = im.width * PX;
      const h = im.height * PX;
      ctx.drawImage(im, 0, 0, im.width, im.height, snap((state.viewW - w) / 2), y, w, h);
      y += h + 2 * PX;
    }
    if (!ready) {
      const label = bootError ? 'ASSET ERROR' : 'LOADING';
      drawText(label, snap((state.viewW - textW(label)) / 2), y, PAPER);
      return foot;
    }
    const startW = buttonSize('START').w;
    if (y + 16 * PX < foot) {
      placeButton(snap((state.viewW - startW) / 2), y, 'start', 'START');
      y += 16 * PX;
    }
    const soundLabel = IslandAudio.isMuted() ? 'SOUND OFF' : 'SOUND ON';
    const sw = buttonSize(soundLabel).w;
    if (y + 16 * PX < foot) {
      placeButton(snap((state.viewW - sw) / 2), y, 'sound', soundLabel);
      y += 16 * PX;
    }
    const battleW = buttonSize('BATTLE').w;
    if (y + 14 * PX < foot) placeButton(snap((state.viewW - battleW) / 2), y, 'battle', 'BATTLE');
    return foot;
  }

  function drawPixelUI() {
    ui.hits = [];
    ui.mon = null;
    if (state.mode !== 'throw') {
      ui.ballHome = null;
      ui.ballHit = null;
    }
    if (state.mode === 'title') {
      drawTitle();
      return;
    }
    drawHud();
    const foot = state.viewH;
    if (state.mode === 'dex') {
      drawDex(foot);
      return;
    }
    if (state.mode === 'throw') {
      drawThrow(foot);
      return;
    }
    if (state.mode === 'sign') drawSignBox();
    if (enc.phase === 'chip' && state.mode === 'explore') drawChip(foot);
    else if (state.mode === 'explore' && state.moved < 80 && enc.phase !== 'chip') {
      const msg = 'DRAG TO WALK';
      const tw = textW(msg);
      const x = snap((state.viewW - tw) / 2 - 2 * PX);
      const y = 16 * PX;
      drawPanel(x, y, tw + 4 * PX, 12 * PX);
      drawText(msg, x + 2 * PX, y + 2 * PX, INK);
    }
  }

  function activate(id) {
    if (id === 'start') { startGame(); return; }
    if (id === 'sound') {
      IslandAudio.toggle();
      IslandAudio.click();
      return;
    }
    if (id === 'battle') { window.location.href = '../'; return; }
    if (id === 'dex') {
      if (state.mode === 'sign') closeSign();
      if (state.mode === 'explore') openDex();
      return;
    }
    if (id === 'dexclose') { IslandAudio.click(); closeDex(); return; }
    if (id === 'dexup') { dexScroll = Math.max(0, dexScroll - 1); IslandAudio.click(); return; }
    if (id === 'dexdown') { dexScroll += 1; IslandAudio.click(); return; }
    if (id === 'away') {
      if (enc.phase === 'chip' || enc.phase === 'aim' || enc.phase === 'caught' || enc.phase === 'fled') {
        IslandAudio.click();
        endEncounter();
      }
      return;
    }
    if (id === 'catch' && enc.phase === 'chip') beginThrow();
  }

  function onThrowDown(e, x, y, id) {
    if (enc.phase === 'caught' || enc.phase === 'fled') {
      if (id === 'away') ui.press = 'away';
      else endEncounter();
      return;
    }
    if (id === 'away' && enc.phase === 'aim') {
      ui.press = 'away';
      return;
    }
    if (enc.phase !== 'aim' || !ui.ballHit) return;
    const hit = ui.ballHit;
    const cx = hit.x + hit.w / 2;
    const cy = hit.y + hit.h / 2;
    if (Math.hypot(x - cx, y - cy) > hit.w) return;
    enc.drag = true;
    enc.spin = 0;
    enc.note = '';
    enc.pts = [{ x: x, y: y, t: performance.now() }];
    enc.last = { x: x, y: y };
    enc.bx = x - BALL / 2;
    enc.by = y - BALL / 2;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function noteSpin(x, y) {
    const prev = enc.last;
    enc.last = { x: x, y: y };
    if (!prev || !ui.ballHome) return;
    const ox = ui.ballHome.x + BALL / 2;
    const oy = ui.ballHome.y + BALL / 2;
    const ax = prev.x - ox, ay = prev.y - oy;
    const bx = x - ox, by = y - oy;
    const minR = 6 * PX;
    if (ax * ax + ay * ay < minR * minR || bx * bx + by * by < minR * minR) return;
    enc.spin += Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    if (enc.spin > 6) enc.spin = 6;
    if (enc.spin < -6) enc.spin = -6;
  }

  function releaseThrow() {
    const pts = enc.pts;
    enc.drag = false;
    if (enc.phase !== 'aim' || !pts || pts.length < 2) {
      enc.spin = 0;
      return;
    }
    const b = pts[pts.length - 1];
    let i = pts.length - 1;
    while (i > 0 && b.t - pts[i - 1].t < 90) i--;
    const a = pts[i];
    const dt = Math.max(0.016, (b.t - a.t) / 1000);
    let vx = (b.x - a.x) / dt;
    let vy = (b.y - a.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed < 420 || vy > -60) {
      enc.spin = 0;
      enc.note = 'FLICK UP';
      return;
    }
    const maxS = 1600;
    if (speed > maxS) {
      vx *= maxS / speed;
      vy *= maxS / speed;
    }
    enc.vx = vx;
    enc.vy = vy;
    enc.curved = Math.abs(enc.spin) >= 0.85;
    if (!enc.curved) enc.spin = 0;
    enc.phase = 'flight';
    enc.flightT = 0;
    enc.trail = [{ x: snap(enc.bx), y: snap(enc.by) }];
    enc.note = '';
    IslandAudio.throwBall();
  }

  function stepThrow(dt) {
    if (state.mode !== 'throw') return;
    if (enc.phase === 'flight') {
      const curve = Math.max(-1, Math.min(1, enc.spin / 1.6));
      const px = -enc.vy;
      const py = enc.vx;
      const plen = Math.hypot(px, py) || 1;
      const accel = curve * 2200;
      enc.vx += (px / plen) * accel * dt;
      enc.vy += (py / plen) * accel * dt;
      enc.vy += 900 * dt;
      enc.bx += enc.vx * dt;
      enc.by += enc.vy * dt;
      enc.flightT += dt;
      const last = enc.trail[enc.trail.length - 1];
      const sx = snap(enc.bx);
      const sy = snap(enc.by);
      if (!last || Math.hypot(sx - last.x, sy - last.y) >= PX * 2) enc.trail.push({ x: sx, y: sy });
      if (enc.trail.length > 18) enc.trail.shift();
      const mon = ui.mon;
      const cx = enc.bx + BALL / 2;
      const cy = enc.by + BALL / 2;
      const home = ui.ballHome;
      const hand = home && Math.hypot(cx - (home.x + BALL / 2), cy - (home.y + BALL / 2)) < BALL;
      if (!hand && mon && cx >= mon.x && cx < mon.x + mon.w && cy >= mon.y && cy < mon.y + mon.h) {
        landBall();
        return;
      }
      if (enc.flightT > 1.8 || enc.by > state.viewH + 8 || enc.bx < -80 || enc.bx > state.viewW + 80 ||
          (enc.flightT > 0.45 && home && enc.vy > 0 && enc.by > home.y + BALL)) {
        missBall();
      }
    } else if (enc.phase === 'shake') {
      enc.shakeT += dt;
      if (enc.shakeT >= 0.34) {
        enc.shakeT = 0;
        enc.shakes--;
        if (enc.shakes <= 0) {
          if (enc.success) onCaught();
          else onBroke();
        }
      }
    } else if (enc.phase === 'caught' || enc.phase === 'fled') {
      enc.holdT += dt;
      if (enc.holdT > 1.7) endEncounter();
    }
  }

  function startEncounter(biomeName) {
    const mon = pickSpecies(biomeName);
    enc.phase = 'chip';
    enc.mon = mon;
    enc.tries = 0;
    enc.spin = 0;
    enc.curved = false;
    enc.success = false;
    enc.hideMon = false;
    enc.note = '';
    enc.stars = [];
    enc.drag = false;
    enc.ax = state.x;
    enc.ay = state.y;
    holdCam();
    IslandAudio.encounter();
  }

  function beginThrow() {
    enc.phase = 'aim';
    enc.tries = 0;
    enc.spin = 0;
    enc.curved = false;
    enc.drag = false;
    enc.hideMon = false;
    enc.note = '';
    enc.trail = [];
    enc.stars = [];
    state.mode = 'throw';
    stick.on = false;
    stick.dir = null;
    holdCam();
    IslandAudio.click();
  }

  function endEncounter() {
    enc.phase = 'idle';
    enc.mon = null;
    enc.drag = false;
    enc.hideMon = false;
    enc.stars = [];
    enc.note = '';
    state.mode = 'explore';
    state.cooldown = 4.4;
    state.steps = 0;
    stick.on = false;
    stick.dir = null;
    holdCam();
  }

  function catchChance(mon, curved) {
    const easy = mon.catch >= 200 ? 0.8 : mon.catch >= 150 ? 0.66 : 0.48;
    return Math.min(0.93, easy * (curved ? 1 : 0.86));
  }

  function landBall() {
    enc.phase = 'shake';
    enc.hideMon = true;
    enc.trail = [];
    const p = catchChance(enc.mon, enc.curved);
    enc.success = Math.random() < p;
    enc.shakes = enc.success ? 3 : (Math.random() < 0.5 ? 1 : 2);
    enc.shakeT = 0;
  }

  function missBall() {
    enc.trail = [];
    enc.tries++;
    enc.note = 'THE BALL MISSED!';
    enc.phase = 'aim';
    enc.spin = 0;
    enc.drag = false;
    maybeFlee();
  }

  function onBroke() {
    enc.hideMon = false;
    enc.tries++;
    IslandAudio.broke();
    enc.note = enc.mon.name + ' BROKE FREE!';
    enc.phase = 'aim';
    enc.spin = 0;
    maybeFlee();
  }

  function maybeFlee() {
    const flee = enc.tries >= 4 || (enc.tries >= 3 && Math.random() < 0.7);
    if (!flee) return;
    enc.phase = 'fled';
    enc.hideMon = false;
    enc.holdT = 0;
    enc.note = '';
    IslandAudio.fled();
  }

  function onCaught() {
    enc.phase = 'caught';
    enc.hideMon = false;
    enc.holdT = 0;
    if (dex.indexOf(enc.mon.id) < 0) dex.push(enc.mon.id);
    saveDex();
    IslandAudio.caught();
    burst();
  }

  function burst() {
    enc.stars = [];
    const m = ui.mon;
    if (!m) return;
    for (let i = 0; i < 12; i++) {
      enc.stars.push({
        x: snap(m.x + Math.random() * m.w),
        y: snap(m.y + Math.random() * m.h),
      });
    }
  }

  function openDex() {
    if (state.mode !== 'explore') return;
    IslandAudio.book();
    stick.on = false;
    stick.dir = null;
    holdCam();
    state.mode = 'dex';
    dexScroll = 0;
  }
  function closeDex() {
    if (state.mode !== 'dex') return;
    holdCam();
    state.mode = 'explore';
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clearSelection();
    if (bootError && !ready) {
      if (!state.viewW) resize();
      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, state.viewW, state.viewH);
      drawText('ASSET ERROR', 2 * PX, 2 * PX, PAPER);
    } else if (ready && waterFrames) {
      waterTick++;
      if (waterTick >= 20) {
        waterTick = 0;
        waterFrame = (waterFrame + 1) % waterFrames.length;
      }
      stepThrow(dt);
      if (state.mode === 'explore') update(dt);
      render();
    }
    requestAnimationFrame(frame);
  }

  function startGame() {
    if (!ready) return;
    IslandAudio.unlock();
    IslandAudio.startMusic();
    IslandAudio.click();
    state.mode = 'explore';
    resize();
    holdCam();
  }

  function blockBrowserGesture(e) {
    if (e.cancelable) e.preventDefault();
  }
  function clearSelection() {
    const sel = window.getSelection && window.getSelection();
    if (sel && sel.rangeCount) sel.removeAllRanges();
  }
  function wire() {
    canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
    canvas.addEventListener('pointermove', onPointerMove, { passive: false });
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    /* touch-action and user-select are not enough on iOS: a long-press still
       selects the canvas unless the touch sequence is cancelled. */
    const guards = ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'gestureend'];
    for (let i = 0; i < guards.length; i++) {
      document.addEventListener(guards[i], blockBrowserGesture, { passive: false, capture: true });
    }
    document.addEventListener('selectstart', blockBrowserGesture, true);
    document.addEventListener('dragstart', blockBrowserGesture, true);
    document.addEventListener('selectionchange', clearSelection);
    window.addEventListener('resize', resize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', resize);
      window.visualViewport.addEventListener('scroll', resize);
    }
  }

  // Four muted DMG shades. Every overworld pixel is one of these — no tint blend.
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

  function pixCanvas(data) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const g = c.getContext('2d');
    const im = g.createImageData(8, 8);
    im.data.set(data);
    g.putImageData(im, 0, 0);
    return c;
  }
  function sliceTile(canvas, tid) {
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 8;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    g.drawImage(canvas, (tid % 16) * 8, ((tid / 16) | 0) * 8, 8, 8, 0, 0, 8, 8);
    return c;
  }
  function tileData(c) {
    return c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 8, 8).data;
  }
  function rotCW(src) {
    const o = new Uint8ClampedArray(src.length);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const si = (y * 8 + x) * 4;
        const di = (x * 8 + (7 - y)) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    return o;
  }
  function rotCCW(src) {
    const o = new Uint8ClampedArray(src.length);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const si = (y * 8 + x) * 4;
        const di = ((7 - x) * 8 + y) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    return o;
  }
  function flipV(src) {
    const o = new Uint8ClampedArray(src.length);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const si = (y * 8 + x) * 4;
        const di = ((7 - y) * 8 + x) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    return o;
  }
  function darker(a, b) {
    const o = new Uint8ClampedArray(a.length);
    for (let i = 0; i < a.length; i += 4) {
      const sa = a[i] + a[i + 1] + a[i + 2];
      const sb = b[i] + b[i + 1] + b[i + 2];
      const use = sa <= sb ? a : b;
      o[i] = use[i]; o[i + 1] = use[i + 1]; o[i + 2] = use[i + 2]; o[i + 3] = 255;
    }
    return o;
  }
  function shiftPix(src, dir) {
    const o = new Uint8ClampedArray(src.length);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sx = (x - dir + 8) % 8;
        const si = (y * 8 + sx) * 4;
        const di = (y * 8 + x) * 4;
        o[di] = src[si]; o[di + 1] = src[si + 1]; o[di + 2] = src[si + 2]; o[di + 3] = src[si + 3];
      }
    }
    return o;
  }
  function buildShoreAndWater(ow) {
    const s = tileData(sliceTile(ow, 49));
    const n = flipV(s);
    const e = rotCCW(s);
    const w = rotCW(s);
    shore = {
      s: pixCanvas(s), n: pixCanvas(n), e: pixCanvas(e), w: pixCanvas(w),
      se: pixCanvas(darker(s, e)), sw: pixCanvas(darker(s, w)),
      ne: pixCanvas(darker(n, e)), nw: pixCanvas(darker(n, w)),
    };
    let cur = tileData(sliceTile(ow, 20));
    const frames = [pixCanvas(cur)];
    const seq = [1, 1, 1, -1, -1, -1, -1, 1];
    for (let i = 0; i < seq.length; i++) {
      cur = shiftPix(cur, seq[i]);
      frames.push(pixCanvas(cur));
    }
    waterFrames = frames.slice(0, 8);
    waterFrame = 0;
  }
  function keyedSprite(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    if (d[0] > 240 && d[1] > 240 && d[2] > 240 && d[3] > 240) {
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240) d[i + 3] = 0;
      }
      g.putImageData(im, 0, 0);
    }
    return c;
  }
  function silhouetteOf(src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(src, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 16) continue;
      d[i] = 8; d[i + 1] = 24; d[i + 2] = 32; d[i + 3] = 255;
      const p = i / 4;
      const x = p % c.width;
      const y = (p / c.width) | 0;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    g.putImageData(im, 0, 0);
    if (maxX < minX) return c;
    const out = document.createElement('canvas');
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    const og = out.getContext('2d', { willReadFrequently: true });
    og.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  async function boot() {
    buildMap();
    wire();
    resize();
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
      buildWalkFrames();
      redPic = paint(imgs[keys.length + 1], RED_PIC);
      ballCanvas = paint(imgs[keys.length + 2], RED_SPRITE);
      buildShoreAndWater(sheets.ow);
      const speciesImgs = imgs.slice(keys.length + 3);
      D.species.forEach(function (s, i) {
        spriteImg[s.id] = keyedSprite(speciesImgs[i]);
        spriteSil[s.id] = silhouetteOf(spriteImg[s.id]);
      });
      ready = true;
    } catch (err) {
      console.error(err);
      bootError = true;
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
