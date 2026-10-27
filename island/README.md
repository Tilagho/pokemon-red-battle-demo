# Pokémon GO Island Demo

A small overworld catch-and-collect page in the spirit of a Gen 1 pixel game and Pokémon GO. Walk a tiny island, meet one wild Pokémon in the tall grass or another biome, and throw a Poké Ball. There are no battles, no HP, and no moves.

> Unofficial fan project. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.

The battle demo at the site root is separate. This page does not load anything from `island/assets/red/` (that folder, if present, is reserved and unused).

## Run it

From the repository root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/island/ on a computer, or http://&lt;your-lan-ip&gt;:8000/island/ on a phone on the same Wi-Fi. Serving over HTTP keeps the font and audio reliable. The root battle demo stays at http://localhost:8000/.

## Controls

- **Hold the ground** (or press and drag) on walkable land. Red pathfinds there and keeps walking if you let go. Drag while held to change the destination. Water, trees, rocks, and walls are blocked. There is no D-pad.
- The camera follows the player. From the town center to the coast, straight ahead, is **15 tiles**. Walk speed is **3 tiles/second** (192 px/s on 64px tiles), so that walk is **5 seconds**.
- Stepping through tall grass, forest, shore, and the other encounter biomes can start a wild encounter. It is not every step: a short warmup, then a per-tile roll, then a few seconds of quiet after each encounter.
- **Hold the Poké Ball**, watch the arc and the meter, then **release** to throw. A very short hold misses. A fuller hold is more likely to catch.
- Three failed throws can make the Pokémon flee; the fourth always does. **Back away** leaves without throwing.
- A catch plays a short success flourish and adds the species to the Pokédex (saved in this browser as `pogo-island-dex`). The HUD button opens the dex. **SOUND** mutes Kenney effects and the synthesized stingers (`pogo-island-mute`).
- **BATTLE** returns to the root battle demo.

## Biome → type

One Gen 1 species per type. Bulbasaur uses the brother's sprite already in `assets/sprites/`. The other fronts are PokeAPI Generation I Yellow transparent sprites, cropped to the Pokémon.

| Biome | Where | Who shows up |
| --- | --- | --- |
| Tall grass | South of town | **Bulbasaur** (Grass), Caterpie (Bug), Ekans (Poison), Pidgey |
| Meadow | Open green | **Pidgey** (Flying), Eevee (Normal), Pikachu (Electric), Bulbasaur |
| Forest | Southwest woods | **Caterpie** (Bug), Ekans (Poison), Bulbasaur, Pidgey |
| Dark forest | Deeper southwest | **Gastly** (Ghost), Ekans, rare Abra |
| Shore | Beach ring | **Squirtle** (Water), rare Dratini, Pidgey |
| Waterfall | East falls | **Dratini** (Dragon), Squirtle |
| Mountain | North rocks | **Geodude** (Rock), Jynx, Machop, Charmander |
| Ice | North cave pocket | **Jynx** (Ice), Geodude |
| Volcanic | Northeast rock | **Charmander** (Fire), Geodude |
| Dirt | West digs | **Diglett** (Ground), Geodude, Ekans |
| Dojo | West of town | **Machop** (Fighting), Geodude |
| Ruins | Northwest | **Abra** (Psychic, rare), Gastly |
| Town | Plaza | **Pikachu** (Electric), **Eevee** (Normal), Pidgey |
| Path | The crossroad | No encounters |
| Water | Sea and the falls | Blocked |

Paths are the north–south and east–west roads through town, except a strip of tall grass just south of the plaza.

## `assets/red/`

If `island/assets/red/` exists, it is reserved for later internal use. The live demo does not reference it.

## Asset credits

| Asset | Source | License |
| --- | --- | --- |
| Overworld tiles | [Kenney RPG pack base set](https://opengameart.org/content/rpg-pack-base-set) in `assets/tiles/kenney-rpg/` (PNG tiles + `RPGpack_sheet.png`) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Footsteps, book, click | [Kenney 50 RPG sound effects](https://opengameart.org/content/50-rpg-sound-effects) in `assets/sfx/` | CC0 |
| Throw / catch / flee stingers | Original Web Audio in `js/audio.js` | Same terms as this project. No ROM audio |
| Player walk | [Tnypixels top-down walk & idle](https://tnypixels.itch.io/top-down-rpg-character-sprite-walk-idle-animation), CC0. `assets/player/character-sprites.aseprite` is the pack file; `walk.png` is a 4×4 sheet exported from it (rows: down, left, right, up; 4 walk frames) | CC0 |
| Bulbasaur | Brother's art, `assets/sprites/bulbasaur.png` (copy of the repo sprite; the original file is unchanged) | Used with permission for this fan demo |
| Other front sprites | [PokeAPI](https://pokeapi.co) Generation I Yellow transparent sprites | Pokémon artwork is property of Nintendo / Game Freak / The Pokémon Company. Fan demo only |
| Poké Ball icon | PokeAPI `items/poke-ball` | Same fan-demo note |
| Press Start 2P | Repo font, SIL Open Font License (`../../assets/fonts/OFL.txt`) | OFL |

Kenney credit is not required by CC0. It is noted here anyway: Kenney.nl.

Biome tints (dark woods, volcanic rock, ice, waterfall spray) are drawn over Kenney floors in the canvas. They are not a second tileset.
