# Pokémon Red Remake: Battle Demo (fan project)

A playable demo with only the battle screen, built for phone browsers in the style of Pokémon Red.
It's plain HTML, CSS, and JS, with no build step and no frameworks.

> Unofficial fan project. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.

## Run it

```bash
cd pokemon-red-remake
python3 -m http.server 8000
# open http://localhost:8000 on your computer
# on a phone on the same Wi-Fi, open http://<your-computer-ip>:8000
```

You can also double-click `index.html`. It works from `file://`, but some browsers block the bundled font that way, so the http server is the safer option.
You can deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel, itch.io HTML upload).

## How to play

1. Tap **START**. The **SOUND** button toggles the chiptune bleeps.
2. Pick your Pokémon: **BULBASAUR** (Lv 12), **IVYSAUR** (Lv 22), or **VENUSAUR** (Lv 36).
3. Pick a battle:
   - **RIVAL BLUE**: a trainer battle against a FIRE Charmander (hard). You can't run.
   - **WILD SQUIRTLE**: WATER type, an easy win for the grass line.
   - **WILD MIRROR**: the same species as yours.
4. **FIGHT** lists your 4 moves with type and PP. **PKMN** shows your stats and stat stages. **ITEM** says "coming soon." **RUN** uses the Gen-1 escape formula and is blocked in trainer battles.
5. Tap the text box or the battle field to skip ahead. Messages also advance on their own.

## Mechanics (simplified Gen 1)

- Stats come from the Gen-1 formula. Your mon has DVs of 8, and the foe gets random DVs.
- Damage uses the Gen-1 formula: level, power, Attack/Defense (or Special for FIRE/WATER/GRASS moves), **STAB ×1.5**, type multiplier, and a random 217–255/255 roll.
- Type chart for NORMAL, FIRE, WATER, GRASS, and POISON. Dual types multiply, so a Grass move against Bulbasaur does ×0.25.
- Crits follow Gen 1: the chance depends on base Speed, RAZOR LEAF and SLASH crit 8× more often, and crits double the level and ignore stat stages.
- Accuracy and misses, with accuracy and evasion stages.
- Stat stages from −6 to +6: GROWL, LEER, TAIL WHIP, SMOKESCREEN, GROWTH, WITHDRAW, BUBBLE's speed drop.
- Status conditions:
  - Sleep (SLEEP POWDER, 1–7 turns, and waking up uses the turn).
  - Poison (POISONPOWDER, 1/16 per turn; POISON types are immune).
  - Burn (EMBER/FLAMETHROWER 10%; halves Attack; FIRE types are immune).
  - Paralysis (BODY SLAM 30%; 25% chance to be fully paralyzed and Speed ÷4; NORMAL types are immune).
- LEECH SEED drains 1/16 of HP per turn and heals the other side. GRASS types are immune.
- SOLARBEAM is a two-turn move ("took in sunlight!").
- PP is tracked. When all PP is gone you use STRUGGLE, which has recoil.
- The enemy AI picks moves at random, weighted toward super-effective attacks, and avoids moves that would do nothing.

## Animations

- Battle intro: the foe slides in, and your mon pops out of the ball on "Go!"
- The attacker lunges and type-colored pixel particles fly across (leaves, embers, bubbles).
- The defender blinks Gen-1 style. The screen shakes on super-effective hits and flashes white on crits.
- Powder moves sprinkle down on the target. Stat changes flicker bright or dark. A "Z" floats up when a mon falls asleep.
- HP bars drain smoothly and turn green, yellow, then red.
- A fainted mon slides down out of view.
- Text crawls in letter by letter with a blinking ▼.

## Files

```
index.html                    screens and markup
css/style.css                 Red-style pixel UI, mobile layout, animations
js/data.js                    SPECIES, MOVES, TYPE_CHART, ENCOUNTERS  ← edit this to add content
js/engine.js                  battle math only (stats, damage, crits, accuracy, AI, run); no DOM
js/fx.js                      sprite animations, particles, Web Audio SFX
js/main.js                    text box, menus, battle flow (turn order, statuses, fainting)
assets/sprites/bulbasaur.png  ← brother's art (56×56)
assets/sprites/ivysaur.png    ← brother's art
assets/sprites/venusaur.png   ← brother's art
assets/sprites/charmander_placeholder.png  PLACEHOLDER (generated)
assets/sprites/squirtle_placeholder.png    PLACEHOLDER (generated)
assets/fonts/PressStart2P-Regular.ttf      pixel font (SIL OFL, see OFL.txt)
tools/make_placeholders.py    regenerates the placeholder sprites (Python + Pillow)
```

### Adding a Pokémon

1. Put a 56×56 PNG in `assets/sprites/`. Use the same `#f8f8f8` white background as the current sprites, or a transparent one.
2. Add an entry to `SPECIES` in `js/data.js` with base stats, types, sprite path, and learnset.
3. Add any new moves to `MOVES`, and new types to `TYPE_CHART`, `TYPE_COLORS`, and the `.tag.TYPE` CSS.
4. Use it in `ENCOUNTERS`, or add it to the starter list in `renderStarters()` in `main.js`.

## Known gaps and next steps

- **No back sprites yet.** The player side shows the front sprite mirrored. Drop in `*_back.png` files and add a `backSprite` field.
- Charmander and Squirtle use **placeholder art**. Replace those PNGs with real art when it's ready.
- Only one Pokémon per side. There's no switching, no party, and no EXP or level-ups (the EXP message is cosmetic).
- The BAG is a stub. There's no catching.
- Not implemented: confusion, multi-hit or trapping moves, priority moves, or the Gen-1 1/256 miss glitch.
- Sound is simple synthesized beeps, not real cries or music.
- Balance is tuned roughly. The rival is a few levels below you because FIRE ×2 against the grass line made an even-level fight nearly unwinnable for Bulbasaur.
