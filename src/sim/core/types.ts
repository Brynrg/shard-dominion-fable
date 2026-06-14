// Core types for the simulation

export type PlayerId = number;
export type EntityId = number;
export type Tick = number;

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
}

export interface SimState {
  entities: Entity[];
  commands: Command[];
  tick: Tick;
  rngState: number;
  hash: string;
}

export interface Entity {
  id: EntityId;
  components: Record<string, unknown>;
}