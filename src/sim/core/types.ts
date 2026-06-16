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
  entities: Entity[];
  commands: Command[];
  tick: Tick;
  rngState: number;
  hash: string;
  map?: MapData;
  economy?: EconomyState;
  buildings?: BuildingState[];
  power?: PowerState;
  units?: UnitState[];
  projectiles?: ProjectileState[];
}

export interface Entity {
  id: EntityId;
  components: Record<string, unknown>;
}

export interface MapData {
  width: number;
  height: number;
  tiles: TerrainTile[];
}

export interface TerrainTile {
  type: TerrainType;
  shardDensity: number; // 0-1000 per tile
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
  targetTile: Vector2 | null;
  targetRefinery: EntityId | null;
  credits: number;
  capacity: number;
  lastHarvestTick: number;
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

// Combat types
export interface ProjectileState {
  entityId: EntityId;
  type: string;
  x: number;
  y: number;
  targetEntityId: EntityId | null;
  targetTile: Vector2 | null;
  speed: number;
  damage: number;
  damageType: 'BULLET' | 'ROCKET' | 'SHELL' | 'SIEGE' | 'FLAME' | 'SONIC' | 'EXPLOSIVE';
  travelTime: number;
  travelDistance: number;
  friendlyFire: boolean;
}

// Damage matrix
export interface DamageMatrix {
  [weaponType: string]: {
    [armorClass: string]: number;
  };
}