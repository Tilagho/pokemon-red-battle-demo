/* ============================================================
   ENGINE — pure battle math (no DOM). Gen 1 formulas, simplified.
   ============================================================ */

const STAGE_MULT = [2/8, 2/7, 2/6, 2/5, 2/4, 2/3, 1, 3/2, 2, 5/2, 3, 7/2, 4];
const stageMul = (s) => STAGE_MULT[s + 6];
const rand = (n) => Math.floor(Math.random() * n);           // 0..n-1
const randRange = (a, b) => a + rand(b - a + 1);              // a..b

function calcStat(base, dv, level, isHP) {
  const v = Math.floor(((base + dv) * 2 * level) / 100);
  return isHP ? v + level + 10 : v + 5;
}

function movesForLevel(sp, level) {
  let set = sp.learnset[0][1];
  for (const [min, moves] of sp.learnset) if (level >= min) set = moves;
  return set;
}

/** Create a battle-ready Pokémon. wild/enemy mons get random DVs. */
function createMon(speciesId, level, { randomDVs = false, isEnemy = false } = {}) {
  const sp = SPECIES[speciesId];
  const dv = () => (randomDVs ? rand(16) : 8);
  const stats = {};
  for (const k of ['atk', 'def', 'spd', 'spc']) stats[k] = calcStat(sp.base[k], dv(), level, false);
  const maxHp = calcStat(sp.base.hp, dv(), level, true);
  return {
    species: sp, name: sp.name, level, types: sp.types, isEnemy,
    maxHp, hp: maxHp, stats,
    stages: { atk: 0, def: 0, spd: 0, spc: 0, acc: 0, eva: 0 },
    status: null, sleepTurns: 0, seeded: false, charging: null,
    moves: movesForLevel(sp, level).map((id) => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp })),
  };
}

/** Name as the game prints it ("Enemy CHARMANDER" for the foe). */
const label = (mon) => (mon.isEnemy ? `Enemy ${mon.name}` : mon.name);

function typeMultiplier(moveType, defTypes) {
  return defTypes.reduce((m, t) => m * (TYPE_CHART[moveType][t] ?? 1), 1);
}

function effStat(mon, stat, ignoreStages) {
  let v = mon.stats[stat];
  if (!ignoreStages) v = Math.floor(v * stageMul(mon.stages[stat]));
  if (stat === 'atk' && mon.status === 'BRN' && !ignoreStages) v = Math.floor(v / 2);
  return Math.max(1, v);
}

/** Gen 1 damage formula. Returns { damage, crit, mult }. */
function calcDamage(att, def, move) {
  const mult = typeMultiplier(move.type, def.types);
  if (mult === 0) return { damage: 0, crit: false, mult };

  // Gen 1 crit: based on attacker's base Speed. High-crit moves x8.
  let critChance = att.species.base.spd / 2 / 256;
  if (move.highCrit) critChance = Math.min(255 / 256, critChance * 8);
  const crit = Math.random() < critChance;

  const special = SPECIAL_TYPES.has(move.type);
  const A = effStat(att, special ? 'spc' : 'atk', crit);
  const D = effStat(def, special ? 'spc' : 'def', crit);
  const lvl = crit ? att.level * 2 : att.level;

  let dmg = Math.floor(Math.floor((Math.floor((2 * lvl) / 5 + 2) * A * move.power) / D) / 50);
  dmg = Math.min(dmg, 997) + 2;
  if (att.types.includes(move.type)) dmg += Math.floor(dmg / 2);       // STAB
  dmg = Math.floor(dmg * mult);
  if (dmg > 1) dmg = Math.floor((dmg * randRange(217, 255)) / 255);    // random spread
  return { damage: Math.max(1, dmg), crit, mult };
}

function accuracyCheck(att, def, move) {
  if (move.acc == null) return true;
  const chance = (move.acc / 100) * stageMul(att.stages.acc) / stageMul(def.stages.eva);
  return Math.random() < chance;
}

/** Turn order: higher (modified) speed first, ties random. */
function goesFirst(a, b) {
  const sa = effStat(a, 'spd') / (a.status === 'PAR' ? 4 : 1);
  const sb = effStat(b, 'spd') / (b.status === 'PAR' ? 4 : 1);
  return sa === sb ? Math.random() < 0.5 : sa > sb;
}

/** Gen 1 escape formula. */
function canEscape(p, e, attempts) {
  const eq = Math.floor(effStat(e, 'spd') / 4) % 256;
  if (eq === 0) return true;
  const F = Math.floor((effStat(p, 'spd') * 32) / eq) + 30 * attempts;
  return F > 255 || rand(256) < F;
}

/** Simple enemy AI: random, weighted toward useful moves. */
function chooseEnemyMove(e, p) {
  const usable = e.moves.filter((m) => m.pp > 0);
  if (!usable.length) return { id: 'STRUGGLE', pp: 1, maxPp: 1 };
  const weights = usable.map((slot) => {
    const mv = MOVES[slot.id];
    if (mv.power) {
      const m = typeMultiplier(mv.type, p.types);
      return m > 1 ? 4 : m < 1 ? 0.6 : 1.5;
    }
    const ef = mv.effect;
    if (ef.kind === 'status') return p.status || (ef.status === 'PSN' && p.types.includes('POISON')) ? 0.05 : 1;
    if (ef.kind === 'leech') return p.seeded || p.types.includes('GRASS') ? 0.05 : 1;
    if (ef.kind === 'stat') {
      const who = ef.target === 'self' ? e : p;
      return Math.abs(who.stages[ef.stat]) >= 6 ? 0.05 : who.stages[ef.stat] === 0 ? 0.9 : 0.4;
    }
    return 1;
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < usable.length; i++) { r -= weights[i]; if (r <= 0) return usable[i]; }
  return usable[0];
}
