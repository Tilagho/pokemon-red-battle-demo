/* Pokémon GO Island Demo — roster, biomes, and Gen-1 catch rates.
   Wild fronts are PokeAPI Gen-I Red/Blue transparent sprites.
   Bulbasaur is the brother's art already in the repo. */
const ISLAND_DATA = {
  // 8×8 Red tiles at integer 4×. A 32×32 block is 128px. Red's 16×16 sprite is 64px (16→64).
  // 15 blocks × 128px / 384px/s = 5 seconds.
  TILE: 128,
  MAP: 37,
  CENTER: 18,
  COAST: 15,
  SPEED: 384,

  species: [
    { id: 'bulbasaur', name: 'BULBASAUR', type: 'GRASS',    catch: 45,  sprite: 'assets/sprites/bulbasaur.png', anim: { w: 37, h: 38, n: 12 } },
    { id: 'charmander', name: 'CHARMANDER', type: 'FIRE',   catch: 45,  sprite: 'assets/sprites/charmander.png', anim: { w: 41, h: 42, n: 12 } },
    { id: 'squirtle',  name: 'SQUIRTLE',  type: 'WATER',    catch: 45,  sprite: 'assets/sprites/squirtle.png', anim: { w: 39, h: 43, n: 8 } },
    { id: 'pikachu',   name: 'PIKACHU',   type: 'ELECTRIC', catch: 190, sprite: 'assets/sprites/pikachu.png', anim: { w: 50, h: 46, n: 12 } },
    { id: 'eevee',     name: 'EEVEE',     type: 'NORMAL',   catch: 45,  sprite: 'assets/sprites/eevee.png', anim: { w: 46, h: 47, n: 12 } },
    { id: 'jynx',      name: 'JYNX',      type: 'ICE',      catch: 45,  sprite: 'assets/sprites/jynx.png', anim: { w: 63, h: 60, n: 12 } },
    { id: 'machop',    name: 'MACHOP',    type: 'FIGHTING', catch: 180, sprite: 'assets/sprites/machop.png', anim: { w: 50, h: 50, n: 11 } },
    { id: 'ekans',     name: 'EKANS',     type: 'POISON',   catch: 255, sprite: 'assets/sprites/ekans.png', anim: { w: 59, h: 45, n: 12 } },
    { id: 'diglett',   name: 'DIGLETT',   type: 'GROUND',   catch: 255, sprite: 'assets/sprites/diglett.png', anim: { w: 38, h: 31, n: 10 } },
    { id: 'pidgey',    name: 'PIDGEY',    type: 'FLYING',   catch: 255, sprite: 'assets/sprites/pidgey.png', anim: { w: 42, h: 48, n: 12 } },
    { id: 'abra',      name: 'ABRA',      type: 'PSYCHIC',  catch: 200, sprite: 'assets/sprites/abra.png', anim: { w: 62, h: 53, n: 12 } },
    { id: 'caterpie',  name: 'CATERPIE',  type: 'BUG',      catch: 255, sprite: 'assets/sprites/caterpie.png', anim: { w: 36, h: 37, n: 12 } },
    { id: 'geodude',   name: 'GEODUDE',   type: 'ROCK',     catch: 255, sprite: 'assets/sprites/geodude.png', anim: { w: 61, h: 45, n: 12 } },
    { id: 'gastly',    name: 'GASTLY',    type: 'GHOST',    catch: 190, sprite: 'assets/sprites/gastly.png', anim: { w: 67, h: 75, n: 12 } },
    { id: 'dratini',   name: 'DRATINI',   type: 'DRAGON',   catch: 45,  sprite: 'assets/sprites/dratini.png', anim: { w: 44, h: 51, n: 12 } },
  ],

  /* Weighted spawns. Primary biome is listed first in island/README.md. */
  spawns: {
    meadow:    [['pidgey', 40], ['eevee', 25], ['pikachu', 20], ['bulbasaur', 15]],
    tall:      [['bulbasaur', 35], ['caterpie', 30], ['ekans', 20], ['pidgey', 15]],
    forest:    [['caterpie', 40], ['ekans', 35], ['bulbasaur', 15], ['pidgey', 10]],
    dark:      [['gastly', 55], ['ekans', 30], ['abra', 10], ['caterpie', 5]],
    shore:     [['squirtle', 72], ['dratini', 8], ['pidgey', 20]],
    waterfall: [['dratini', 50], ['squirtle', 40], ['pidgey', 10]],
    mountain:  [['geodude', 45], ['jynx', 25], ['machop', 20], ['charmander', 10]],
    ice:       [['jynx', 80], ['geodude', 20]],
    volcanic:  [['charmander', 70], ['geodude', 30]],
    dirt:      [['diglett', 75], ['geodude', 15], ['ekans', 10]],
    dojo:      [['machop', 85], ['geodude', 15]],
    ruins:     [['abra', 70], ['gastly', 30]],
    town:      [['pikachu', 45], ['eevee', 45], ['pidgey', 10]],
  },

  /* Chance per step after a short warmup. Paths and water never roll. */
  rates: {
    tall: 0.5, meadow: 0.16, forest: 0.34, dark: 0.3,
    shore: 0.28, waterfall: 0.36, mountain: 0.32, ice: 0.38,
    volcanic: 0.36, dirt: 0.38, dojo: 0.42, ruins: 0.32, town: 0.12,
  },
};
