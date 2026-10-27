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

- **Drag the ground** anywhere on the walkable overworld. The press is the origin of an invisible joystick; the drag picks an 8-direction, and Red walks that way at **384 px/s** until you let go. A small dead zone keeps a tap from stepping. Letting go stops him immediately. Water, trees, rocks, walls, and signs block the way. There is no D-pad and no pathfinding.
- The camera follows the player. From the town center to the coast, straight ahead, is **15 blocks**. Each block is 32×32 Red pixels drawn at integer **4×** (128px on screen). Red's 16×16 sprite is **64px** (16→64), nearest-neighbor, no blur. That coast walk is **5 seconds**.
- Town buildings use Pallet and Viridian exteriors from the pret overworld blockset: Red's house, the Fighting Dojo, the Pokémon Center, and the Pokémon Mart. Each has a signpost. Walk up to it and tap the sign, or face it and tap, to open a text box drawn with the Red border tiles (`$79`–`$7e`).
- Stepping through tall grass, forest, shore, and the other encounter biomes can start a wild encounter. It is not every step: a short warmup, then a per-tile roll, then a few seconds of quiet after each encounter.
- An encounter does **not** move Red or the camera. His world position and screen position stay on the same pixels when the chip opens and when it closes. The chip — silhouette, **Back away**, and **Catch!** — is a Red text box in the lower band under him. Dragging still walks. Walking about three blocks away dismisses the chip, same as Back away. The Pokémon can show up again later under the same cooldown.
- **Catch!** opens the throw. A pixel ring around the wild Pokémon shrinks and swells. A tighter ring (it turns black) is the better catch window. The Poké Ball is 32×32 Game Boy pixels, twice the old 16×16, so it is easy to grab. Flick it upward. Swirl before the flick and the ball takes a wide curve, then still lands — spin is a trick, not a miss. Only a tiny twitch (too short) or a violent swipe (too long) misses. A straight throw homes in on a smaller arc. Curve and a tight ring both raise the catch rate. Misses, break-outs, and catches use the same flee rules as before: three failures can send it running, and the fourth always does.
- After a catch or a flee, the throw closes and the overworld is free again.
- Every button, glyph, silhouette, and ball is drawn on the same 4× Game Boy grid as the map. There is no separate CSS overlay. The title screen wraps the full fan disclaimer. The play screen does not.
- The ocean cycles the original Red water tile: overworld tile `$14` scrolls one pixel every 20 frames, right for four steps and left for four, the same bob as `UpdateMovingBgTiles`. The coastline is that stair-step cliff lip (overworld tile 49) turned to meet every water edge, including corners.
- A catch plays the Red catch jingle and adds the species to the Pokédex (saved in this browser as `pogo-island-dex`). **DEX** opens it. **PAUSE** in the upper right freezes the island and opens the settings menu: volume, monochrome or Pokémon Red Color graphics, save, and return to the home menu. Volume and graphics are written to `pogo-island-save` immediately. **SAVE** also stores the party, the caught list, and Red's position, then shows a short text box. The first tap unlocks audio, including on iOS.
- The title is a Red-style landing: **POKEMON ISLAND**, Red's portrait, and a menu box along the bottom. With no save it shows **NEW GAME**. After a visit or a save, **CONTINUE** is added and restores the saved position and party. Sound and graphics live in the pause menu, not on the title. There is no battle entry on the island. The root battle demo stays a separate page. The play HUD is **DEX**, the caught count, and **PAUSE**.

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
| Trees, rocks, bushes | Tile blocks inside overworld, forest, and plateau |
| Houses, center, mart, dojo, signs | Overworld blockset blocks from Pallet Town and Viridian City, plus sign tiles 70, 71, 86, 87 |
| Player walk | `sprites/red.png` (16×16 down / up / left, walk frames; right is flipped) |
| Title portrait | `player/red.png` (56×56 Red pic) |
| Poké Ball | `sprites/poke_ball.png` |

`tiles/pokecenter.png` and `tiles/reds_house.png` load with the Red set. Indoor rooms are not drawn on the island. Bulbasaur stays the brother's sprite. The other encounter fronts are PokeAPI Generation I Red/Blue.

The overworld starts in the four Pokémon Red DMG grays (`#f8f8f8`, `#a8a8a8`, `#585858`, `#080808`): white, light gray, dark gray, and black. **PAUSE → GFX COLOR** switches to a Game Boy Color Red set: green fields, tan paths, red roofs, blue water, and a red hat and Poké Ball, with wild sprites quantized to GBC's 5-bit color. Text boxes stay the black-and-white `$79`–`$7e` border and the pret font in both modes. Pixels stay on that grid: integer 4× scale, nearest-neighbor, no color multiply.

> Unofficial fan project. Pokémon Red graphics are Nintendo / Game Freak / The Pokémon Company intellectual property. Not affiliated with them.

## Asset credits

| Asset | Source | License |
| --- | --- | --- |
| Overworld tiles, Red walk, Red pic, Poké Ball | [pret/pokered](https://github.com/pret/pokered) `gfx/` in `assets/red/` | Nintendo IP. Fan demo only. Tiago approved committing these files |
| Pallet Town theme, UI chirp, throw, shake, catch, flee, bump | [pret/pokered](https://github.com/pret/pokered) `audio/music/pallettown.asm` and `audio/sfx/` (`press_ab`, `ball_toss`, `ball_poof`, `caught_mon`, `run`, `collision`), played by the Game Boy model in `js/audio.js` | Nintendo IP. Fan demo only. No ROM samples |
| Text box border | pret `gfx/font/font_extra.png` tiles `$79`–`$7e` | Nintendo IP. Fan demo only |
| Dialogue font | pret `gfx/font/font.png` in `assets/red/font/`, charmap `$80` up | Nintendo IP. Fan demo only |
| Bulbasaur | Brother's art, `assets/sprites/bulbasaur.png` (copy of the repo sprite; the original file is unchanged) | Used with permission for this fan demo |
| Other front sprites | [PokeAPI](https://pokeapi.co) Generation I Red/Blue transparent sprites | Pokémon artwork is property of Nintendo / Game Freak / The Pokémon Company. Fan demo only |
| Press Start 2P | Repo font, SIL Open Font License (`../../assets/fonts/OFL.txt`) | OFL |

Kenney tiles and the Tnypixels walk sheet remain in the repo. The live overworld does not draw them. The world is the four Red grayscale shades at 4×, so it reads as the original DMG screen rather than a green-tinted or modern tileset.
