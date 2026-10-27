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
- An encounter does **not** freeze the walk, and it does **not** move the camera. Red stays where he is. A pixel chip — silhouette, **Back away**, and **Catch!** — sits in the lower band under him, above the disclaimer. Hold-to-path still works. Walking about three blocks away dismisses the chip, same as Back away. The Pokémon can show up again later under the same cooldown.
- **Catch!** opens the throw. Flick the Poké Ball upward at the Pokémon. Swirling around the ball before the flick puts spin on it and the ball curves, like Pokémon GO. A straight throw can still land, at a slightly lower catch rate than a curve that connects. Misses, break-outs, and catches use the same flee rules as before: three failures can send it running, and the fourth always does.
- After a catch or a flee, the throw closes and the overworld is free again.
- Every button, glyph, silhouette, and ball is drawn on the same 4× Game Boy grid as the map. There is no separate CSS overlay. The title screen wraps the full fan disclaimer. During play that same sentence scrolls on one grid line so the sea stays visible.
- The ocean cycles the original Red water tile: overworld tile `$14` scrolls one pixel every 20 frames, right for four steps and left for four, the same bob as `UpdateMovingBgTiles`. The coastline is that stair-step cliff lip (overworld tile 49) turned to meet every water edge, including corners.
- A catch plays a short success flourish and adds the species to the Pokédex (saved in this browser as `pogo-island-dex`). **DEX** opens it. **SOUND** / **SND** mutes the Kenney effects and the synthesized stingers (`pogo-island-mute`).
- **BATTLE** / **BTL** returns to the root battle demo.

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
| Shore lip | `tiles/overworld.png` tile 49 (stair-step cliff into the sea), rotated for the other edges. `tiles/ship_port.png` still loads with the Red set |
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
