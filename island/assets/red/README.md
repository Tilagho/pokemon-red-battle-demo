# Pokémon Red overworld graphics

The live island demo **loads this folder** for the overworld, the player, and the Poké Ball.

These PNGs are Nintendo intellectual property, copied from [pret/pokered](https://github.com/pret/pokered) `gfx/` on `master`. Tiago explicitly approved committing them into this public fan-demo repository.

The 2bpp sheets are grayscale. The page colors them at runtime (outdoor green for tiles, red / white / black for Red and the ball). Map cells are pret 32×32 blocks (4×4 tiles of 8×8), drawn at 2×. Red's overworld walk is the 16×16 frames in `sprites/red.png`.

The brother's Bulbasaur, Ivysaur, and Venusaur art stays separate (`assets/sprites/bulbasaur.png`, `ivysaur.png`, `venusaur.png`). Do not replace that grass line with anything from this folder. Wild encounter fronts stay PokeAPI Generation I (Yellow in this demo) plus that Bulbasaur.

## What the demo draws

| Use | File |
| --- | --- |
| Meadow, tall grass, path, town, water, waterfall, houses, flowers | `tiles/overworld.png` |
| Shore dock | `tiles/ship_port.png` |
| Forest and dark forest, plus forest trees | `tiles/forest.png` |
| Mountain, ruins, dojo yard, volcanic floor, rocks | `tiles/plateau.png` |
| Dirt and ice floor | `tiles/cavern.png` |
| Walk cycle | `sprites/red.png` |
| Title portrait | `player/red.png` |
| Poké Ball | `sprites/poke_ball.png` |

`tiles/pokecenter.png` and `tiles/reds_house.png` are loaded with the set. The island does not draw those interiors.

Dark woods, volcanic rock, ice, and waterfall spray are canvas tints on the sheets above. Gen 1 has no ice tileset.

## Tiles (`tiles/`)

From `gfx/tilesets/`:

- `overworld.png`
- `forest.png`
- `pokecenter.png`
- `reds_house.png`
- `plateau.png`
- `cavern.png`
- `ship_port.png`

## Player and overworld

| File here | pret/pokered source |
| --- | --- |
| `player/red.png` | `gfx/player/red.png` |
| `sprites/red.png` | `gfx/sprites/red.png` |
| `sprites/poke_ball.png` | `gfx/sprites/poke_ball.png` |
| `overworld/battle_transition.png` | `gfx/overworld/battle_transition.png` |

Sound is not vendored. [SFX.md](SFX.md) lists the pret Game Boy tone scripts. Browser playback stays on Web Audio or Kenney.

Unofficial fan project. Not affiliated with Nintendo, Game Freak, or The Pokémon Company.
