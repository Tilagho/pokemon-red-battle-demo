# Pokémon Red Remake: Battle Demo (fan project)

A playable demo with only the battle screen, built for phone browsers in the style of Pokémon Red.
It's plain HTML, CSS, and JS, with no build step and no frameworks.

> Unofficial fan project. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.

## Run it

```bash
python3 -m http.server 8000
# open http://localhost:8000 on your computer
# on a phone on the same Wi-Fi, open http://<your-computer-ip>:8000
```

You can also double-click `index.html`. It works from `file://`, but some browsers block the bundled font that way, so the http server is the safer option.
You can deploy the folder as-is to any static host (GitHub Pages, Netlify, Vercel, itch.io HTML upload).

## How to play

1. Tap **START**. The **SOUND** button toggles battle audio. During a fight the **ON / OFF** chip on the text box does the same thing. The choice is saved in this browser (`localStorage` key `prbd-sound`), and the first tap anywhere unlocks audio so iPhone Safari will actually play it.
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

Attack visuals are drawn on a low-resolution canvas (`#vfx`) and scaled up with nearest-neighbor, so they stay chunky pixels instead of smooth vectors. Each clip is about 0.4–1.1s. The hit frame starts the defender blink, the screen shake, and the HP drain together.

Every move in the demo has its own scene:

| Move | What you see |
| --- | --- |
| TACKLE | Lunging strike and a dust burst |
| SCRATCH / SLASH | Claw cuts (SLASH is a heavier cross-cut) |
| BODY SLAM | Dropping body and a shock ring |
| BITE | Fangs snapping shut |
| VINE WHIP | A vine cracking across the foe |
| RAZOR LEAF | Spinning leaves |
| SOLARBEAM | Sunlight gather, then a thick beam |
| LEECH SEED | Seeds that sprout on the target |
| SLEEP POWDER / POISONPOWDER | Drifting spores |
| EMBER / FLAMETHROWER | Fireballs, or a wide flame cone |
| BUBBLE / WATER GUN | Bubbles, or a jet and splash |
| GROWL / LEER / TAIL WHIP | Sound rings, a glare, a sweeping whip |
| SMOKESCREEN | Expanding smoke |
| GROWTH / WITHDRAW | Rising sparkles, or a closing shell |
| STRUGGLE | Wild cuts |

A move that is not in that list still gets a scene from its type and category (beam, leaves, flames, bubbles, powder, slam, and so on). Add a name to `MOVE_SCENE` in `js/fx.js` when you want a new move to look unique.

The battlers themselves are unchanged: the attacker lunges, leans, or hops, and the defender recoils and blinks. Crits flash the screen and throw spark stars. Misses sail wide and fade. HP bars still drain on the hit, turn green → yellow → red, and pulse while the player is in the red.

## Sound

All battle audio is synthesized in `js/audio.js` (square, triangle, saw, and a short noise buffer). Nothing is sampled from a Pokémon game.

- Menu select and cancel, plus a sound for each move (or a type fallback).
- Hit, super-effective, not-very-effective, miss, immune, and critical.
- A tick while HP drains, a faint cry, and a win or lose sting.
- A quiet low-HP beep while your bar is red. It stops on faint, victory, or mute.

Mute from the title screen or the battle text box. Reload the page and the setting is still there.

## Files

```
index.html                    screens and markup
css/style.css                 Red-style pixel UI, mobile layout, animations
js/data.js                    SPECIES, MOVES, TYPE_CHART, ENCOUNTERS  ← edit this to add content
js/engine.js                  battle math only (stats, damage, crits, accuracy, AI, run); no DOM
js/fx.js                      sprite poses + pixel attack canvas (MOVE_SCENE)
js/audio.js                   Web Audio SFX, mute, iOS unlock
js/main.js                    text box, menus, battle flow (turn order, statuses, fainting)
assets/sprites/bulbasaur.png  brother's art
assets/sprites/ivysaur.png    brother's art
assets/sprites/venusaur.png   brother's art
assets/sprites/charmander.png  fire line (already in the repo)
assets/sprites/charmeleon.png
assets/sprites/charizard.png
assets/sprites/squirtle.png    water line (already in the repo)
assets/sprites/wartortle.png
assets/sprites/blastoise.png
assets/fonts/PressStart2P-Regular.ttf      pixel font (SIL OFL, see OFL.txt)
tools/make_placeholders.py    regenerates the placeholder sprites (Python + Pillow)
```

## Asset licenses

New attack visuals and sound are original to this demo: procedural pixel drawing in `js/fx.js` and Web Audio synthesis in `js/audio.js`. No Nintendo ROM banks, effect sheets, or game audio were copied. They are bundled as code, so GitHub Pages does not depend on a third-party host.

| Asset | Source | License |
| --- | --- | --- |
| Attack VFX | Written for this demo (`js/fx.js`) | Same terms as this project; original code |
| Battle SFX | Written for this demo (`js/audio.js`) | Same terms as this project; original code, no samples |
| Press Start 2P | [codeman38 / google/fonts](https://fonts.google.com/specimen/Press+Start+2P) | SIL Open Font License (`assets/fonts/OFL.txt`) |
| Bulbasaur, Ivysaur, Venusaur | Brother's art, already in the repo | Used with permission for this fan demo |
| Fire and water sprites | Already in the repo; not replaced | Unchanged from the previous demo |

This is an unofficial fan project and is not affiliated with Nintendo, Game Freak, or The Pokémon Company.

### Adding a Pokémon

1. Put a 56×56 PNG in `assets/sprites/`. Use the same `#f8f8f8` white background as the current sprites, or a transparent one.
2. Add an entry to `SPECIES` in `js/data.js` with base stats, types, sprite path, and learnset.
3. Add any new moves to `MOVES`, and new types to `TYPE_CHART` and the `.tag.TYPE` CSS. Give a move its own attack scene by adding its name to `MOVE_SCENE` in `js/fx.js` (the pixel palettes are `COL` in that file). If you skip that, it still plays a type or category fallback.
4. Use it in `ENCOUNTERS`, or add it to the starter list in `renderStarters()` in `main.js`.

## Known gaps and next steps

- **No back sprites yet.** The player side shows the front sprite mirrored. Drop in `*_back.png` files and add a `backSprite` field.
- Charmander and Squirtle use **placeholder art**. Replace those PNGs with real art when it's ready.
- Only one Pokémon per side. There's no switching, no party, and no EXP or level-ups (the EXP message is cosmetic).
- The BAG is a stub. There's no catching.
- Not implemented: confusion, multi-hit or trapping moves, priority moves, or the Gen-1 1/256 miss glitch.
- Cries are short synthesized beeps keyed off each species, not recordings from the games.
- Attack scenes are code, not imported sprite sheets. A brand-new move uses the type fallback until you add it to `MOVE_SCENE`.
- Balance is tuned roughly. The rival is a few levels below you because FIRE ×2 against the grass line made an even-level fight nearly unwinnable for Bulbasaur.
