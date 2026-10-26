/* ============================================================
   DATA — species, moves, type chart.
   Edit this file to add Pokémon / moves. Numbers follow Gen 1
   (Red/Blue) where possible.
   ============================================================ */

// Gen 1 type chart (only the types used in this demo). Missing = 1x.
const TYPE_CHART = {
  NORMAL: {},
  FIRE:   { FIRE: 0.5, WATER: 0.5, GRASS: 2 },
  WATER:  { FIRE: 2, WATER: 0.5, GRASS: 0.5 },
  GRASS:  { FIRE: 0.5, WATER: 2, GRASS: 0.5, POISON: 0.5 },
  POISON: { GRASS: 2, POISON: 0.5 },
};

// Gen 1: Fire/Water/Grass/... are "special"; Normal/Poison are "physical".
const SPECIAL_TYPES = new Set(['FIRE', 'WATER', 'GRASS']);

// Colors used for move particles & type labels.
const TYPE_COLORS = {
  NORMAL: ['#f8f8f8', '#b8b8a8'],
  FIRE:   ['#f88830', '#f8d030', '#e03020'],
  WATER:  ['#68b0f8', '#d0f0ff', '#3878d8'],
  GRASS:  ['#58c858', '#a8e878', '#2f8f3f'],
  POISON: ['#a050c0', '#d090e8'],
};

/*  Move fields:
    type, power (0 = status), acc (null = never misses), pp
    highCrit   – Razor Leaf / Slash style crit boost
    charge     – two-turn move (Solar Beam) with charge text
    effect     – status effect for status moves
    secondary  – { chance, ... } side effect for damaging moves
*/
const MOVES = {
  TACKLE:       { name: 'TACKLE',       type: 'NORMAL', power: 35, acc: 95,  pp: 35 },
  SCRATCH:      { name: 'SCRATCH',      type: 'NORMAL', power: 40, acc: 100, pp: 35 },
  SLASH:        { name: 'SLASH',        type: 'NORMAL', power: 70, acc: 100, pp: 20, highCrit: true },
  'BODY SLAM':  { name: 'BODY SLAM',    type: 'NORMAL', power: 85, acc: 100, pp: 15, secondary: { chance: 0.3, status: 'PAR' } },
  BITE:         { name: 'BITE',         type: 'NORMAL', power: 60, acc: 100, pp: 25 },
  GROWL:        { name: 'GROWL',        type: 'NORMAL', power: 0, acc: 100, pp: 40, effect: { kind: 'stat', stat: 'atk', delta: -1, target: 'foe' } },
  LEER:         { name: 'LEER',         type: 'NORMAL', power: 0, acc: 100, pp: 30, effect: { kind: 'stat', stat: 'def', delta: -1, target: 'foe' } },
  'TAIL WHIP':  { name: 'TAIL WHIP',    type: 'NORMAL', power: 0, acc: 100, pp: 30, effect: { kind: 'stat', stat: 'def', delta: -1, target: 'foe' } },
  SMOKESCREEN:  { name: 'SMOKESCREEN',  type: 'NORMAL', power: 0, acc: 100, pp: 20, effect: { kind: 'stat', stat: 'acc', delta: -1, target: 'foe' } },
  GROWTH:       { name: 'GROWTH',       type: 'NORMAL', power: 0, acc: null, pp: 40, effect: { kind: 'stat', stat: 'spc', delta: 1, target: 'self' } },
  WITHDRAW:     { name: 'WITHDRAW',     type: 'WATER',  power: 0, acc: null, pp: 40, effect: { kind: 'stat', stat: 'def', delta: 1, target: 'self' } },
  'VINE WHIP':  { name: 'VINE WHIP',    type: 'GRASS',  power: 35, acc: 100, pp: 10 },
  'RAZOR LEAF': { name: 'RAZOR LEAF',   type: 'GRASS',  power: 55, acc: 95,  pp: 25, highCrit: true },
  'SOLARBEAM':  { name: 'SOLARBEAM',    type: 'GRASS',  power: 120, acc: 100, pp: 10, charge: 'took in sunlight!' },
  'LEECH SEED': { name: 'LEECH SEED',   type: 'GRASS',  power: 0, acc: 90,  pp: 10, effect: { kind: 'leech' } },
  'SLEEP POWDER': { name: 'SLEEP POWDER', type: 'GRASS', power: 0, acc: 75, pp: 15, effect: { kind: 'status', status: 'SLP' } },
  POISONPOWDER: { name: 'POISONPOWDER', type: 'POISON', power: 0, acc: 75,  pp: 35, effect: { kind: 'status', status: 'PSN' } },
  EMBER:        { name: 'EMBER',        type: 'FIRE',   power: 40, acc: 100, pp: 25, secondary: { chance: 0.1, status: 'BRN' } },
  FLAMETHROWER: { name: 'FLAMETHROWER', type: 'FIRE',   power: 95, acc: 100, pp: 15, secondary: { chance: 0.1, status: 'BRN' } },
  BUBBLE:       { name: 'BUBBLE',       type: 'WATER',  power: 20, acc: 100, pp: 30, secondary: { chance: 0.33, stat: 'spd', delta: -1 } },
  'WATER GUN':  { name: 'WATER GUN',    type: 'WATER',  power: 40, acc: 100, pp: 25 },
  STRUGGLE:     { name: 'STRUGGLE',     type: 'NORMAL', power: 50, acc: 100, pp: 1, recoil: 0.5 },
};

/*  Species. base = Gen 1 base stats (hp, atk, def, spd, spc).
    sprite = front sprite (player side is mirrored until back sprites exist).
    learnset = [minLevel, [4 moves]] — highest matching entry is used.  */
const SPECIES = {
  BULBASAUR: {
    name: 'BULBASAUR', types: ['GRASS', 'POISON'], sprite: 'assets/sprites/bulbasaur.png',
    base: { hp: 45, atk: 49, def: 49, spd: 45, spc: 65 }, baseExp: 64, cry: 520,
    learnset: [[1, ['TACKLE', 'GROWL', 'LEECH SEED', 'VINE WHIP']]],
    demoLevel: 12, art: 'brother',
  },
  IVYSAUR: {
    name: 'IVYSAUR', types: ['GRASS', 'POISON'], sprite: 'assets/sprites/ivysaur.png',
    base: { hp: 60, atk: 62, def: 63, spd: 60, spc: 80 }, baseExp: 141, cry: 420,
    learnset: [[1, ['RAZOR LEAF', 'VINE WHIP', 'POISONPOWDER', 'TACKLE']]],
    demoLevel: 22, art: 'brother',
  },
  VENUSAUR: {
    name: 'VENUSAUR', types: ['GRASS', 'POISON'], sprite: 'assets/sprites/venusaur.png',
    base: { hp: 80, atk: 82, def: 83, spd: 80, spc: 100 }, baseExp: 208, cry: 300,
    learnset: [[1, ['RAZOR LEAF', 'SOLARBEAM', 'SLEEP POWDER', 'BODY SLAM']]],  // BODY SLAM = TM08
    demoLevel: 36, art: 'brother',
  },
  CHARMANDER: {
    name: 'CHARMANDER', types: ['FIRE'], sprite: 'assets/sprites/charmander.png',
    base: { hp: 39, atk: 52, def: 43, spd: 65, spc: 50 }, baseExp: 65, cry: 640,
    learnset: [
      [1,  ['SCRATCH', 'GROWL', 'EMBER', 'LEER']],
      [20, ['EMBER', 'SCRATCH', 'LEER', 'SMOKESCREEN']],
      [30, ['FLAMETHROWER', 'SLASH', 'LEER', 'SMOKESCREEN']],
    ],
    art: 'gen1',
  },
  CHARMELEON: {
    name: 'CHARMELEON', types: ['FIRE'], sprite: 'assets/sprites/charmeleon.png',
    base: { hp: 58, atk: 64, def: 58, spd: 80, spc: 65 }, baseExp: 142, cry: 480,
    learnset: [
      [1,  ['EMBER', 'SCRATCH', 'LEER', 'SMOKESCREEN']],
      [30, ['FLAMETHROWER', 'SLASH', 'LEER', 'SMOKESCREEN']],
    ],
    art: 'gen1',
  },
  CHARIZARD: {
    name: 'CHARIZARD', types: ['FIRE'], sprite: 'assets/sprites/charizard.png',
    base: { hp: 78, atk: 84, def: 78, spd: 100, spc: 85 }, baseExp: 209, cry: 280,
    learnset: [[1, ['FLAMETHROWER', 'SLASH', 'LEER', 'SMOKESCREEN']]],
    art: 'gen1',
  },
  SQUIRTLE: {
    name: 'SQUIRTLE', types: ['WATER'], sprite: 'assets/sprites/squirtle.png',
    base: { hp: 44, atk: 48, def: 65, spd: 43, spc: 50 }, baseExp: 66, cry: 580,
    learnset: [
      [1,  ['TACKLE', 'TAIL WHIP', 'BUBBLE', 'WATER GUN']],
      [20, ['WATER GUN', 'BITE', 'WITHDRAW', 'TAIL WHIP']],
    ],
    art: 'gen1',
  },
  WARTORTLE: {
    name: 'WARTORTLE', types: ['WATER'], sprite: 'assets/sprites/wartortle.png',
    base: { hp: 59, atk: 63, def: 80, spd: 58, spc: 65 }, baseExp: 143, cry: 460,
    learnset: [[1, ['WATER GUN', 'BITE', 'WITHDRAW', 'TAIL WHIP']]],
    art: 'gen1',
  },
  BLASTOISE: {
    name: 'BLASTOISE', types: ['WATER'], sprite: 'assets/sprites/blastoise.png',
    base: { hp: 79, atk: 83, def: 100, spd: 78, spc: 85 }, baseExp: 210, cry: 260,
    learnset: [[1, ['WATER GUN', 'BITE', 'WITHDRAW', 'BODY SLAM']]],
    art: 'gen1',
  },
};

// Encounters offered on the opponent-select screen.
// levelFor(L) = foe level given your Pokémon's level (default: same level).
// The rival is tuned a bit lower: FIRE hits the grass line 2x, so an even
// fight is near-impossible for BULBASAUR (balance-simulated: ~40-60% win w/ good play).
const ENCOUNTERS = [
  { id: 'rival',  label: 'RIVAL BLUE',     sub: 'Trainer · Charmander (hard)', species: 'CHARMANDER', trainer: 'BLUE',
    levelFor: (L) => L - (L <= 15 ? 3 : 1) },
  { id: 'charmeleon', label: 'RIVAL BLUE', sub: 'Trainer · Charmeleon (hard)', species: 'CHARMELEON', trainer: 'BLUE',
    levelFor: (L) => Math.max(16, L - 1) },
  { id: 'charizard', label: 'RIVAL BLUE',  sub: 'Trainer · Charizard (hard)', species: 'CHARIZARD', trainer: 'BLUE',
    levelFor: (L) => Math.max(36, L) },
  { id: 'squirt', label: 'WILD SQUIRTLE',  sub: 'Wild · Water (easy)',   species: 'SQUIRTLE' },
  { id: 'wartortle', label: 'WILD WARTORTLE', sub: 'Wild · Water', species: 'WARTORTLE',
    levelFor: (L) => Math.max(16, L) },
  { id: 'blastoise', label: 'WILD BLASTOISE', sub: 'Wild · Water', species: 'BLASTOISE',
    levelFor: (L) => Math.max(36, L) },
  { id: 'mirror', label: 'WILD MIRROR',    sub: 'Wild · same species',   species: null },
];

const PLAYER_NAME = 'RED';
const STAT_NAMES = { atk: 'ATTACK', def: 'DEFENSE', spd: 'SPEED', spc: 'SPECIAL', acc: 'ACCURACY', eva: 'EVADE' };
