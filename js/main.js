/* ============================================================
   MAIN — screens, menus, text box, and the battle flow.
   ============================================================ */

/* ---------------- Text box with Red-style letter crawl ---------------- */
const Text = {
  speed: 18,          // ms per character
  autoMs: 1100,       // auto-advance delay after a message finishes (tap to skip)
  _tap: null,
  tap() { if (this._tap) this._tap(); },
  /** Show a message. hold=true leaves it on screen and returns immediately after the crawl. */
  async say(msg, { hold = false, auto = true } = {}) {
    const el = $('text'), nx = $('next');
    const id = (this._id = (this._id || 0) + 1);   // newer messages cancel older crawls
    nx.classList.remove('on'); el.textContent = '';
    let skip = false; this._tap = () => { skip = true; };
    for (let i = 1; i <= msg.length; i++) {
      if (this._id !== id) return;
      if (skip) { el.textContent = msg; break; }
      el.textContent = msg.slice(0, i);
      if (msg[i - 1] !== ' ') await wait(this.speed);
    }
    this._tap = null;
    if (hold) return;
    nx.classList.add('on');
    await new Promise((res) => {
      const t = auto ? setTimeout(res, this.autoMs) : null;
      this._tap = () => { clearTimeout(t); res(); };
    });
    this._tap = null; nx.classList.remove('on');
  },
};

/* ---------------- Screens & menus ---------------- */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
}
function hideMenus() { document.querySelectorAll('.menu').forEach((m) => (m.hidden = true)); }

let pending = null;
/** Show a menu and resolve with the data-act of the tapped button. */
function choose(menuId) {
  hideMenus(); $(menuId).hidden = false;
  return new Promise((res) => (pending = { res, menuId }));
}
document.querySelector('.controls').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !pending || !btn.closest('#' + pending.menuId)) return;
  if (btn.dataset.act === 'back') SFX.cancel();
  else SFX.select();
  const { res } = pending; pending = null; hideMenus(); res(btn.dataset.act);
});
['textbox', 'field'].forEach((id) => $(id).addEventListener('pointerdown', (e) => {
  if (e.target.closest('#btn-sound-fab')) return;
  Text.tap();
}));

/** Integer sprite scale so pixels stay crisp (2x–4x). */
function computeScale() {
  const f = $('field').getBoundingClientRect();
  if (!f.width) return;
  const s = Math.max(2, Math.min(4, Math.floor(Math.min(f.width * 0.46, f.height * 0.5) / 56)));
  document.documentElement.style.setProperty('--s', s);
}
window.addEventListener('resize', () => { computeScale(); FX.prepare(); });

/* ---------------- Title / select screens ---------------- */
let chosenStarter = 'BULBASAUR';
let chosenEncounter = ENCOUNTERS[0];

const typeTags = (types) => types.map((t) => `<span class="tag ${t}">${t}</span>`).join('');

function renderStarters() {
  $('starter-list').innerHTML = ['BULBASAUR', 'IVYSAUR', 'VENUSAUR'].map((id) => {
    const sp = SPECIES[id];
    return `<button class="pbtn pick" data-id="${id}">
      <img class="sprite" src="${sp.sprite}" alt="${sp.name}">
      <span class="info"><span class="nm">${sp.name}</span>
      <span>${typeTags(sp.types)}</span><span class="sub">Lv ${sp.demoLevel} · ${movesForLevel(sp, sp.demoLevel).join(', ')}</span></span>
    </button>`;
  }).join('');
}
function renderOpponents() {
  $('opponent-list').innerHTML = ENCOUNTERS.map((enc) => {
    const sp = SPECIES[enc.species || chosenStarter];
    const name = enc.id === 'mirror' ? `WILD ${sp.name}` : enc.label;
    return `<button class="pbtn pick" data-id="${enc.id}">
      <img class="sprite" src="${sp.sprite}" alt="${sp.name}">
      <span class="info"><span class="nm">${name}</span>
      <span>${typeTags(sp.types)}${sp.art === 'gen1' ? '<span class="tag ph">GEN1 SPRITE</span>' : sp.art === 'placeholder' ? '<span class="tag ph">PLACEHOLDER ART</span>' : ''}</span>
      <span class="sub">${enc.sub} · Lv ${enc.levelFor ? enc.levelFor(SPECIES[chosenStarter].demoLevel) : SPECIES[chosenStarter].demoLevel}</span></span>
    </button>`;
  }).join('');
}

function onSoundToggle(e) {
  e.stopPropagation();
  SFX.unlock();
  SFX.toggle();
  syncLowHp();
}
$('btn-start').addEventListener('click', () => { SFX.unlock(); SFX.select(); renderStarters(); showScreen('starter'); });
$('btn-sound').addEventListener('click', onSoundToggle);
$('btn-sound-fab').addEventListener('pointerdown', (e) => e.stopPropagation());
$('btn-sound-fab').addEventListener('click', onSoundToggle);
$('starter-list').addEventListener('click', (e) => {
  const b = e.target.closest('.pick'); if (!b) return;
  chosenStarter = b.dataset.id; SFX.cry(SPECIES[chosenStarter].cry); renderOpponents(); showScreen('opponent');
});
$('btn-back-starter').addEventListener('click', () => { SFX.unlock(); SFX.cancel(); showScreen('starter'); });
$('opponent-list').addEventListener('click', (e) => {
  const b = e.target.closest('.pick'); if (!b) return;
  SFX.select(); chosenEncounter = ENCOUNTERS.find((x) => x.id === b.dataset.id); startBattle();
});

/* ---------------- HUD ---------------- */
let P, E, B;   // player mon, enemy mon, battle state

function bindMon(mon, side) {
  mon.side = side;
  mon.anim = $(`${side}-anim`); mon.img = $(`${side}-sprite`);
  mon.shownHp = mon.hp;
}
function updateHud(mon) {
  const s = mon.side;
  $(`${s}-name`).textContent = mon.name;
  $(`${s}-lv`).textContent = `:L${mon.level}`;
  const st = $(`${s}-status`); st.textContent = mon.status || ''; st.className = `status ${mon.status || ''}`;
  const pct = mon.shownHp / mon.maxHp;
  const fill = $(`${s}-hp`);
  fill.style.width = `${Math.max(0, pct * 100)}%`;
  fill.className = 'hp-fill' + (pct <= 0.2 ? ' low' : pct <= 0.5 ? ' mid' : '');
  if (s === 'player') {
    $('player-hpnum').textContent = `${String(Math.ceil(mon.shownHp)).padStart(3, ' ')}/${String(mon.maxHp).padStart(3, ' ')}`;
    syncLowHp();
  }
}
/** Quiet beep while the player's bar is in the red. */
function syncLowHp() {
  if (!P || !B || B.over || P.hp <= 0 || P.shownHp / P.maxHp > 0.2) SFX.stopLowHp();
  else SFX.startLowHp();
}
/** Drain/fill the HP bar gradually, Gen 1 style. */
function animateHp(mon, to) {
  const from = mon.shownHp, dur = Math.min(1000, 250 + Math.abs(from - to) * 25);
  const draining = to < from - 0.01;
  let nextTick = 0;
  return new Promise((res) => {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      mon.shownHp = Math.round(from + (to - from) * k);
      updateHud(mon);
      if (draining && t >= nextTick) { SFX.damageTick(); nextTick = t + 70; }
      k < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}
async function damage(mon, amt) { mon.hp = Math.max(0, mon.hp - amt); await animateHp(mon, mon.hp); }
async function heal(mon, amt) { SFX.heal(); mon.hp = Math.min(mon.maxHp, mon.hp + amt); await animateHp(mon, mon.hp); }

/* ---------------- Battle flow ---------------- */
async function startBattle() {
  showScreen('battle'); hideMenus(); computeScale(); FX.prepare(); SFX.stopLowHp();
  const lvl = SPECIES[chosenStarter].demoLevel;
  P = createMon(chosenStarter, lvl);
  const foeLvl = chosenEncounter.levelFor ? chosenEncounter.levelFor(lvl) : lvl;
  E = createMon(chosenEncounter.species || chosenStarter, foeLvl, { randomDVs: true, isEnemy: true });
  B = { trainer: chosenEncounter.trainer || null, runAttempts: 0, over: false };
  bindMon(P, 'player'); bindMon(E, 'enemy');

  for (const m of [P, E]) {
    m.img.getAnimations().forEach((a) => a.cancel());
    m.img.src = m.species.sprite; m.img.alt = m.name;
    updateHud(m); $(`${m.side}-hud`).classList.add('hidden');
  }
  P.anim.classList.add('hidden-mon');
  $('text').textContent = '';

  await FX.slideIn(E.anim, true);
  if (B.trainer) {
    await Text.say(`${B.trainer} wants\nto fight!`);
    await Text.say(`${B.trainer} sent\nout ${E.name}!`);
  } else {
    SFX.cry(E.species.cry);
    await Text.say(`Wild ${E.name}\nappeared!`);
  }
  $('enemy-hud').classList.remove('hidden');

  Text.say(`Go! ${P.name}!`, { hold: true });
  await wait(400);
  P.anim.classList.remove('hidden-mon'); SFX.cry(P.species.cry);
  await FX.popOut(P.anim);
  $('player-hud').classList.remove('hidden');
  await wait(400);

  while (!B.over) {
    const action = P.charging ? { type: 'move', moveId: P.charging, slot: null } : await playerChoice();
    if (action) await runRound(action);
  }
  const act = await choose('menu-end');
  if (act === 'rematch') startBattle(); else { renderStarters(); showScreen('starter'); }
}

async function playerChoice() {
  Text.say(`What will\n${P.name} do?`, { hold: true });
  const act = await choose('menu-main');

  if (act === 'fight') {
    if (P.moves.every((m) => m.pp === 0)) {
      await Text.say(`${P.name} has no\nmoves left!`);
      return { type: 'move', moveId: 'STRUGGLE', slot: null };
    }
    renderMoves();
    Text.say('Choose a move.', { hold: true });
    const m = await choose('menu-moves');
    if (m === 'back') return null;
    const slot = P.moves[+m.split(':')[1]];
    if (slot.pp === 0) { await Text.say('No PP left for\nthis move!'); return null; }
    return { type: 'move', moveId: slot.id, slot };
  }
  if (act === 'pkmn') { await showSummary(); return null; }
  if (act === 'item') { await Text.say('BAG is coming\nsoon!'); await Text.say(`OAK: ${PLAYER_NAME}! This\nisn't the time yet!`); return null; }
  if (act === 'run') return { type: 'run' };
  return null;
}

function renderMoves() {
  $('move-grid').innerHTML = P.moves.map((slot, i) => {
    const mv = MOVES[slot.id];
    return `<button class="pbtn move-btn${slot.pp ? '' : ' nopp'}" data-act="move:${i}">
      <span>${mv.name}</span>
      <span class="meta"><span class="tag ${mv.type}">${mv.type}</span><span>PP ${slot.pp}/${slot.maxPp}</span></span>
    </button>`;
  }).join('');
}

async function runRound(action) {
  hideMenus();
  if (action.type === 'run') {
    if (B.trainer) { await Text.say("No running from a\ntrainer battle!"); return; }
    if (canEscape(P, E, B.runAttempts++)) {
      SFX.escape(); await Text.say('Got away safely!'); B.over = true;
      await FX.play(P.anim, [{ transform: 'translateX(0)' }, { transform: 'translateX(-120vw)' }], { duration: 500, easing: 'steps(10,end)', fill: 'forwards' });
      P.anim.getAnimations().forEach((a) => a.cancel()); P.anim.classList.add('hidden-mon');
      return endBattle('run');
    }
    await Text.say("Can't escape!");
    const eSlot = E.charging ? null : chooseEnemyMove(E, P);
    await useMove(E, P, eSlot, E.charging || eSlot.id);
    if (await checkFaint()) return;
    return residuals();
  }

  const eSlot = E.charging ? null : chooseEnemyMove(E, P);
  const eMove = E.charging || eSlot.id;
  const turns = goesFirst(P, E)
    ? [[P, E, action.slot, action.moveId], [E, P, eSlot, eMove]]
    : [[E, P, eSlot, eMove], [P, E, action.slot, action.moveId]];
  for (const [a, d, slot, id] of turns) {
    if (a.hp <= 0 || d.hp <= 0) continue;
    await useMove(a, d, slot, id);
    if (await checkFaint()) return;
  }
  await residuals();
}

async function useMove(a, d, slot, id) {
  const mv = MOVES[id];
  const releasing = a.charging === id;

  // Sleep check (Gen 1: waking up uses the turn)
  if (a.status === 'SLP') {
    a.sleepTurns--;
    if (a.sleepTurns > 0) {
      SFX.sleep();
      FX.floatText(a.anim, 'Z');
      await Text.say(`${label(a)}\nis fast asleep!`);
      return;
    }
    a.status = null; updateHud(a);
    await Text.say(`${label(a)}\nwoke up!`); return;
  }
  if (a.status === 'PAR' && Math.random() < 0.25) {
    a.charging = null;
    SFX.paralyze();
    await FX.zap(a.anim);
    await Text.say(`${label(a)}'s\nfully paralyzed!`);
    return;
  }
  if (slot && !releasing) slot.pp = Math.max(0, slot.pp - 1);

  // Two-turn moves (SOLARBEAM)
  if (mv.charge && !releasing) {
    await Text.say(`${label(a)}\nused ${mv.name}!`);
    a.charging = id;
    await FX.playMove(a.anim, a.anim, mv, { charge: true });
    await Text.say(`${label(a)}\n${mv.charge}`);
    return;
  }
  a.charging = null;

  await Text.say(`${label(a)}\nused ${mv.name}!`);
  if (!accuracyCheck(a, d, mv)) {
    await FX.playMove(a.anim, d.anim, mv, { miss: true, onImpact() { SFX.miss(); } });
    await Text.say(`${label(a)}'s\nattack missed!`);
    return;
  }

  if (mv.power) return damagingMove(a, d, mv);
  return statusMove(a, d, mv);
}

async function damagingMove(a, d, mv) {
  const r = calcDamage(a, d, mv);
  let hpDone = Promise.resolve();
  await FX.playMove(a.anim, d.anim, mv, {
    immune: r.mult === 0,
    heavy: r.mult > 1 || r.crit || mv.power >= 80,
    crit: r.crit,
    onImpact() {
      if (r.mult === 0) { SFX.immune(); return; }
      if (r.crit) FX.flash(2);
      SFX.strike(r.mult, r.crit);
      FX.hit(d.anim, { strong: r.mult > 1 || r.crit });
      hpDone = damage(d, r.damage);
    },
  });
  await hpDone;

  if (r.mult === 0) { await Text.say(`It doesn't affect\n${label(d)}!`); return; }
  if (r.crit) await Text.say('Critical hit!');
  if (r.mult > 1) await Text.say("It's super\neffective!");
  else if (r.mult < 1) await Text.say("It's not very\neffective...");

  if (mv.recoil && a.hp > 0) {
    await Text.say(`${label(a)}'s\nhit with recoil!`);
    SFX.strike(1, false);
    FX.hit(a.anim);
    await damage(a, Math.max(1, Math.floor(r.damage * mv.recoil)));
  }

  // Secondary effects (burn, paralysis, speed drop)
  const sec = mv.secondary;
  if (sec && d.hp > 0 && Math.random() < sec.chance) {
    const immune = { BRN: 'FIRE', PAR: 'NORMAL' }[sec.status];   // Gen 1 immunities
    if (sec.status && !d.status && !d.types.includes(immune)) {
      d.status = sec.status; updateHud(d);
      if (sec.status === 'BRN') { SFX.statusTick('BRN'); await FX.sprinkle(d.anim, 'FIRE'); }
      else { SFX.paralyze(); await FX.zap(d.anim); }
      await Text.say(sec.status === 'BRN' ? `${label(d)}\nwas burned!` : `${label(d)}'s\nparalyzed!`);
    } else if (sec.stat && d.stages[sec.stat] > -6) {
      d.stages[sec.stat] += sec.delta; SFX.stat(false); await FX.stat(d.img, false);
      await Text.say(`${label(d)}'s\n${STAT_NAMES[sec.stat]} fell!`);
    }
  }
}

async function statusMove(a, d, mv) {
  const ef = mv.effect;
  const self = ef.kind === 'stat' && ef.target === 'self';
  await FX.playMove(a.anim, self ? a.anim : d.anim, mv);

  if (ef.kind === 'stat') {
    const t = ef.target === 'self' ? a : d;
    const cur = t.stages[ef.stat], nv = Math.max(-6, Math.min(6, cur + ef.delta));
    if (nv === cur) { await Text.say('Nothing happened!'); return; }
    t.stages[ef.stat] = nv;
    const up = ef.delta > 0;
    await FX.stat(t.img, up);
    await Text.say(`${label(t)}'s\n${STAT_NAMES[ef.stat]} ${up ? 'rose' : 'fell'}!`);
    return;
  }

  if (ef.kind === 'leech') {
    if (d.types.includes('GRASS')) { await Text.say(`It doesn't affect\n${label(d)}!`); return; }
    if (d.seeded) { await Text.say('But it failed!'); return; }
    d.seeded = true;
    await Text.say(`${label(d)}\nwas seeded!`);
    return;
  }

  if (ef.kind === 'status') {
    if (ef.status === 'PSN' && d.types.includes('POISON')) { await Text.say(`It doesn't affect\n${label(d)}!`); return; }
    if (d.status) { await Text.say('But it failed!'); return; }
    d.status = ef.status; updateHud(d);
    if (ef.status === 'SLP') {
      d.sleepTurns = randRange(1, 7); d.charging = null;
      SFX.sleep();
      FX.floatText(d.anim, 'Z');
      await Text.say(`${label(d)}\nfell asleep!`);
    } else {
      await Text.say(`${label(d)}\nwas poisoned!`);
    }
  }
}

/** End-of-round damage: poison, burn, Leech Seed. */
async function residuals() {
  for (const m of [P, E]) {
    if (m.hp <= 0 || B.over) continue;
    if (m.status === 'PSN' || m.status === 'BRN') {
      const said = Text.say(`${label(m)}'s\nhurt by ${m.status === 'PSN' ? 'poison' : 'the burn'}!`);
      SFX.statusTick(m.status);
      await FX.sprinkle(m.anim, m.status === 'BRN' ? 'FIRE' : 'POISON');
      await damage(m, Math.max(1, Math.floor(m.maxHp / 16)));
      await said;
      if (await checkFaint()) return;
    }
    if (m.seeded && m.hp > 0) {
      const other = m === P ? E : P;
      const amt = Math.min(m.hp, Math.max(1, Math.floor(m.maxHp / 16)));
      const said = Text.say(`LEECH SEED saps\n${label(m)}!`);
      SFX.statusTick('SEED');
      await FX.sprinkle(m.anim, 'GRASS');
      await damage(m, amt);
      if (other.hp > 0) await heal(other, amt);
      await said;
      if (await checkFaint()) return;
    }
  }
}

/** Returns true when the battle is over. */
async function checkFaint() {
  if (E.hp <= 0 || P.hp <= 0) SFX.stopLowHp();
  if (E.hp <= 0) {
    SFX.faint(E.species.cry); await FX.faint(E.img);
    $('enemy-hud').classList.add('hidden');
    await Text.say(`Enemy ${E.name}\nfainted!`);
    const exp = Math.floor((E.species.baseExp * E.level) / 7 * (B.trainer ? 1.5 : 1));
    await Text.say(`${P.name} gained\n${exp} EXP. Points!`);
    if (B.trainer) {
      await Text.say(`${PLAYER_NAME} defeated\n${B.trainer}!`);
      await Text.say(`${B.trainer}: WHAT?\nUnbelievable!`);
    }
    B.over = true; endBattle('win'); return true;
  }
  if (P.hp <= 0) {
    SFX.faint(P.species.cry); await FX.faint(P.img);
    $('player-hud').classList.add('hidden');
    await Text.say(`${P.name}\nfainted!`);
    await Text.say(`${PLAYER_NAME} is out of\nuseable POKéMON!`);
    await Text.say(`${PLAYER_NAME} blacked\nout!`);
    B.over = true; endBattle('lose'); return true;
  }
  return false;
}

function endBattle(result) {
  B.over = true;
  SFX.stopLowHp();
  if (result === 'win') SFX.win(); else if (result === 'lose') SFX.lose();
  const msg = { win: 'You won!', lose: 'Out of luck...', run: 'Escaped!' }[result];
  Text.say(`${msg}\nPlay again?`, { hold: true });
}

/* ---------------- PKMN summary ---------------- */
function showSummary() {
  const st = (k) => {
    const s = P.stages[k];
    return `${P.stats[k]}${s ? ` (${s > 0 ? '+' : ''}${s})` : ''}`;
  };
  $('sum-title').textContent = `${P.name} :L${P.level}`;
  $('sum-sprite').src = P.species.sprite;
  $('sum-body').innerHTML = `
    <div class="row"><span>TYPE</span><span>${typeTags(P.types)}</span></div>
    <div class="row"><span>HP</span><span>${P.hp}/${P.maxHp}</span></div>
    <div class="row"><span>STATUS</span><span>${P.status || 'OK'}${P.seeded ? ' +SEED' : ''}</span></div>
    <div class="row"><span>ATTACK</span><span>${st('atk')}</span></div>
    <div class="row"><span>DEFENSE</span><span>${st('def')}</span></div>
    <div class="row"><span>SPEED</span><span>${st('spd')}</span></div>
    <div class="row"><span>SPECIAL</span><span>${st('spc')}</span></div>
    ${P.moves.map((m) => `<div class="row"><span>${m.id}</span><span>${m.pp}/${m.maxPp}</span></div>`).join('')}
    <p style="font-size:8px;opacity:.7;line-height:1.7">Only one POKéMON in your party for this demo.</p>`;
  $('summary').hidden = false;
  return new Promise((res) => {
    $('sum-close').onclick = () => { SFX.cancel(); $('summary').hidden = true; res(); };
  });
}

/* First tap unlocks audio (required by iPhone Safari). Mute sticks across visits. */
SFX.load();
SFX.refreshLabels();
window.addEventListener('pointerdown', () => { SFX.unlock(); syncLowHp(); }, { passive: true });
window.addEventListener('touchstart', () => { SFX.unlock(); syncLowHp(); }, { passive: true });
window.addEventListener('keydown', () => { SFX.unlock(); syncLowHp(); });
