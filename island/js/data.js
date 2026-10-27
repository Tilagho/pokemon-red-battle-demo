/* Pokémon GO Island Demo — roster, biomes, and Gen-1 catch rates.
   Sprites for the 14 non-Bulbasaur species are PokeAPI Gen-I Yellow
   transparent fronts. Bulbasaur is the brother's art already in the repo. */
const ISLAND_DATA = {
  // One cell is a 32×32 Red block drawn at 2× (64px). 15 cells at 192px/s is 5 seconds.
  // The player sprite is the 16×16 Red walk cycle at that same 2× scale.
  TILE: 64,
  MAP: 37,
  CENTER: 18,
  COAST: 15,
  SPEED: 192,

  species: [
    { id: 'bulbasaur', name: 'BULBASAUR', type: 'GRASS',    catch: 45,  sprite: 'assets/sprites/bulbasaur.png' },
    { id: 'charmander', name: 'CHARMANDER', type: 'FIRE',   catch: 45,  sprite: 'assets/sprites/charmander.png' },
    { id: 'squirtle',  name: 'SQUIRTLE',  type: 'WATER',    catch: 45,  sprite: 'assets/sprites/squirtle.png' },
    { id: 'pikachu',   name: 'PIKACHU',   type: 'ELECTRIC', catch: 190, sprite: 'assets/sprites/pikachu.png' },
    { id: 'eevee',     name: 'EEVEE',     type: 'NORMAL',   catch: 45,  sprite: 'assets/sprites/eevee.png' },
    { id: 'jynx',      name: 'JYNX',      type: 'ICE',      catch: 45,  sprite: 'assets/sprites/jynx.png' },
    { id: 'machop',    name: 'MACHOP',    type: 'FIGHTING', catch: 180, sprite: 'assets/sprites/machop.png' },
    { id: 'ekans',     name: 'EKANS',     type: 'POISON',   catch: 255, sprite: 'assets/sprites/ekans.png' },
    { id: 'diglett',   name: 'DIGLETT',   type: 'GROUND',   catch: 255, sprite: 'assets/sprites/diglett.png' },
    { id: 'pidgey',    name: 'PIDGEY',    type: 'FLYING',   catch: 255, sprite: 'assets/sprites/pidgey.png' },
    { id: 'abra',      name: 'ABRA',      type: 'PSYCHIC',  catch: 200, sprite: 'assets/sprites/abra.png' },
    { id: 'caterpie',  name: 'CATERPIE',  type: 'BUG',      catch: 255, sprite: 'assets/sprites/caterpie.png' },
    { id: 'geodude',   name: 'GEODUDE',   type: 'ROCK',     catch: 255, sprite: 'assets/sprites/geodude.png' },
    { id: 'gastly',    name: 'GASTLY',    type: 'GHOST',    catch: 190, sprite: 'assets/sprites/gastly.png' },
    { id: 'dratini',   name: 'DRATINI',   type: 'DRAGON',   catch: 45,  sprite: 'assets/sprites/dratini.png' },
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
