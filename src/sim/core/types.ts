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