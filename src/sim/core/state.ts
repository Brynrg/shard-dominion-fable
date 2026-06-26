// The state tree (src/sim/core/state.ts)

export interface SimState {
  tick: number; 
  seed: number; 
  rngState: number;
  map: { 
    w: number; 
    h: number; 
    tiles: Tile[]   // FLAT array, length w*h, index = ty*w + tx
  };
  players: PlayerState[];                           // index = player id
  projectiles: Projectile[];
  // NOTE: harvesters/refineries/units/buildings are NOT separate arrays.
  // They are entities in the store. The store is the single source of truth.
  // economy.credits/power live on PlayerState, computed from entities each tick.
}

export interface Tile { 
  terrain: string; // TerrainType;
  shard: number;   // 0-1000 per tile
  explored: boolean[] /* per player */; 
}

export interface PlayerState { 
  faction: string; 
  credits: number; 
  storageCap: number;
  powerSupply: number; 
  powerDemand: number; 
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  damage: number;
  faction: number;
}

// sim.getState(): SimState  returns the live object (render reads it; never mutates it).
// generateMap() MUST assign into state.map.tiles directly (the round-1 discard bug
// was writing tiles[] and dropping it). One map path only — delete the tiles:[]
// per-tick fallback.