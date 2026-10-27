# Pokémon GO Island Demo

A small overworld catch-and-collect page in the spirit of a Gen 1 pixel game and Pokémon GO. Walk a tiny island, meet one wild Pokémon in the tall grass or another biome, and throw a Poké Ball. There are no battles, no HP, and no moves.

> Unofficial fan project. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.

The battle demo at the site root is separate. The live overworld loads Pokémon Red tiles, Red's walk sprite, and the Poké Ball from `island/assets/red/`.

## Run it

From the repository root:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/island/ on a computer, or http://&lt;your-lan-ip&gt;:8000/island/ on a phone on the same Wi-Fi. Serving over HTTP keeps the font and audio reliable. The root battle demo stays at http://localhost:8000/.

## Controls

- **Hold the ground** (or press and drag) on walkable land. Red pathfinds there and keeps walking if you let go. Drag while held to change the destination. Water, trees, rocks, and walls are blocked. There is no D-pad.
- The camera follows the player. From the town center to the coast, straight ahead, is **15 blocks**. Each block is 32×32 Red pixels drawn at integer **4×** (128px on screen). Red's 16×16 sprite is **64px** (16→64), nearest-neighbor, no blur. Walk speed is **384 px/s**, so that walk is **5 seconds**.
- Stepping through tall grass, forest, shore, and the other encounter biomes can start a wild encounter. It is not every step: a short warmup, then a per-tile roll, then a few seconds of quiet after each encounter.
- **Hold the Poké Ball**, watch the arc and the meter, then **release** to throw. A very short hold misses. A fuller hold is more likely to catch.
- Three failed throws can make the Pokémon flee; the fourth always does. **Back away** leaves without throwing.
- A catch plays a short success flourish and adds the species to the Pokédex (saved in this browser as `pogo-island-dex`). The HUD button opens the dex. **SOUND** mutes the Kenney effects and the synthesized stingers (`pogo-island-mute`).
- **BATTLE** returns to the root battle demo.

## Biome → type

One Gen 1 species per type. Bulbasaur uses the brother's sprite already in `assets/sprites/`. The other fronts are PokeAPI Generation I Red/Blue transparent sprites, cropped to the Pokémon.

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

The live demo loads this folder for the overworld. See `assets/red/README.md`.

| Biome | Sheet |
| --- | --- |
| Meadow, tall grass, path, town, water, waterfall | `tiles/overworld.png` |
| Shore | `tiles/ship_port.png` (dock) |
| Forest and dark forest | `tiles/forest.png` |
| Mountain, dojo yard, ruins, volcanic rock | `tiles/plateau.png` |
| Dirt and ice | `tiles/cavern.png` (Gen 1 has no ice tileset) |
| Trees, rocks, bushes, houses | Tile blocks inside overworld, forest, and plateau |
| Player walk | `sprites/red.png` (16×16 down / up / left, walk frames; right is flipped) |
| Title portrait | `player/red.png` (56×56 Red pic) |
| Poké Ball | `sprites/poke_ball.png` |

`tiles/pokecenter.png` and `tiles/reds_house.png` load with the Red set. Indoor rooms are not drawn on the island. Bulbasaur stays the brother's sprite. The other encounter fronts are PokeAPI Generation I Red/Blue.

The overworld uses only the four muted Game Boy greens (`#e0f8d0`, `#88c070`, `#346856`, `#081820`). Pixels stay on that grid: integer 4× scale, nearest-neighbor, no color multiply.

> Unofficial fan project. Pokémon Red graphics are Nintendo / Game Freak / The Pokémon Company intellectual property. Not affiliated with them.

## Asset credits

| Asset | Source | License |
| --- | --- | --- |
| Overworld tiles, Red walk, Red pic, Poké Ball | [pret/pokered](https://github.com/pret/pokered) `gfx/` in `assets/red/` | Nintendo IP. Fan demo only. Tiago approved committing these files |
| Footsteps, book, click | [Kenney 50 RPG sound effects](https://opengameart.org/content/50-rpg-sound-effects) in `assets/sfx/` | CC0 |
| Throw / catch / flee stingers | Original Web Audio in `js/audio.js` | Same terms as this project. No ROM audio |
| Bulbasaur | Brother's art, `assets/sprites/bulbasaur.png` (copy of the repo sprite; the original file is unchanged) | Used with permission for this fan demo |
| Other front sprites | [PokeAPI](https://pokeapi.co) Generation I Red/Blue transparent sprites | Pokémon artwork is property of Nintendo / Game Freak / The Pokémon Company. Fan demo only |
| Press Start 2P | Repo font, SIL Open Font License (`../../assets/fonts/OFL.txt`) | OFL |

Kenney tiles and the Tnypixels walk sheet remain in the repo. The live overworld does not draw them. The world is the four Game Boy shades at 4×, so it reads as Pokémon Red rather than a modern tileset.
