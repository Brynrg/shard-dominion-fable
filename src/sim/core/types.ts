// Core types for the simulation

export type PlayerId = number;
export type EntityId = number;
export type Tick = number;
export type TerrainType = 'ROCK' | 'SAND' | 'DEEP_SAND' | 'DUNE' | 'CLIFF';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Command {
  tick: Tick;
  playerId: PlayerId;
  type: string;
  args: unknown[];
}

export interface SimConfig {
  tickRate: number; // ticks per second
  mapWidth: number;
  mapHeight: number;
  seed: number;
  terrainType?: TerrainType; // Default terrain type for map
}

export interface SimState {
  tick: Tick;
  seed: number; 
  rngState: number;
  hash: string;
  map: { 
    w: number; 
    h: number; 
    tiles: Tile[]   // FLAT array, length w*h, index = ty*w + tx
  };
  players: PlayerState[];                           // index = player id
  projectiles: Projectile[];
  entities: Entity[];                                // All entities in the store
  commands: Command[];                               // All commands processed
  // Economy state
  economy?: {
    credits: number;
    storage: number;
    harvesters: { entityId: EntityId; state: HarvesterState }[];
    refineries: { entityId: EntityId; credits: number }[];
  };
  // Power state
  power?: {
    supply: number;
    demand: number;
    deficit: number;
    productionMultiplier: number;
  };
  // Building state
  buildings?: BuildingState[];
  // Unit state  
  units?: UnitState[];
}

export interface Entity {
  id: EntityId;
  components: Record<string, unknown>;
}

export interface Tile { 
  terrain: string; // TerrainType;
  shard: number;   // 0-1000 per tile
  explored: boolean[]; /* per player */
  shardDensity?: number; // for harvester system
}

export interface PlayerState {
  faction: string;
  credits: number;
  storageCap: number;
  powerSupply: number;
  powerDemand: number;
}

// Economy types
export interface EconomyState {
  credits: number;
  storage: number;
  maxStorage: number;
  harvesters: HarvesterState[];
  refineries: RefineryState[];
}

export interface HarvesterState {
  entityId: EntityId;
  state: 'SEEK' | 'HARVEST' | 'RETURN' | 'DOCK';
  load: number;
  targetTile?: Vector2 | null;
  targetRefinery?: EntityId | null;
  lastHarvestTick?: number;
}

export interface RefineryState {
  entityId: EntityId;
  credits: number;
  maxCredits: number;
  dockedHarvester: EntityId | null;
}

// Base building types
export interface BuildingState {
  entityId: EntityId;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  powerDrain: number;
  powerOutput: number;
  isPowered: boolean;
  isSlabbed: boolean;
  buildProgress: number;
  buildTime: number;
  buildCost: number;
}

// Power types
export interface PowerState {
  supply: number;
  demand: number;
  deficit: number;
  productionMultiplier: number;
}

// Unit types
export interface UnitState {
  entityId: EntityId;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  armorClass: 'NONE' | 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'BUILDING';
  faction: string;
  state: 'IDLE' | 'MOVE' | 'ATTACK' | 'FLEE' | 'HARVEST';
  targetEntityId: EntityId | null;
  targetTile: Vector2 | null;
  attackRange: number;
  attackCooldown: number;
  lastAttackTick: number;
  moveSpeed: number;
  weapon?: {
    type: string;
    damage: number;
    range: number;
    rof: number;
    projectile?: string;
    antiAir?: boolean;
  };
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  damage: number;
  faction: number;
}

// Damage matrix
export interface DamageMatrix {
  [weaponType: string]: {
    [armorClass: string]: number;
  };
}