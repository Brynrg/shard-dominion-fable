// Main simulation class

import { PRNG } from './prng.js';
import { fnv1aHashString } from './hash.js';
import { EntityStore } from './entity-store.js';
import { CommandQueue } from './command-queue.js';
import { TickLoop } from './tick-loop.js';
import type { Command, SimConfig, SimState, TerrainTile, TerrainType } from './types.js';

export class Sim {
  private prng: PRNG;
  private entityStore: EntityStore;
  private commandQueue: CommandQueue;
  private tickLoop: TickLoop;
  private config: SimConfig;
  private state: SimState | null = null;

  constructor(config: SimConfig) {
    this.config = config;
    this.prng = new PRNG(config.seed);
    this.entityStore = new EntityStore();
    this.commandQueue = new CommandQueue();
    this.tickLoop = new TickLoop(config.tickRate);
    this.generateMap();
  }

  // Generate map with terrain and shard density
  private generateMap(): void {
    const { mapWidth, mapHeight } = this.config;
    const tiles: TerrainTile[] = [];

    // Simple terrain generation: mostly SAND, some ROCK, occasional DEEP_SAND
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const noise = this.prng.next() * 100;

        let type: TerrainType = 'SAND';
        if (noise < 15) {
          type = 'ROCK';
        } else if (noise < 20) {
          type = 'DEEP_SAND';
        } else if (noise < 25) {
          type = 'DUNE';
        }

        // Shard density: higher in SAND and DEEP_SAND
        let shardDensity = 0;
        if (type === 'SAND') {
          shardDensity = Math.floor(this.prng.next() * 1000);
        } else if (type === 'DEEP_SAND') {
          shardDensity = Math.floor(this.prng.next() * 1000) + 500;
        }

        tiles.push({ type, shardDensity });
      }
    }

    this.state = {
      entities: [],
      commands: [],
      tick: 0,
      rngState: this.getPRNGState(),
      hash: this.hashState(),
      map: this.state?.map ?? { 
        width: this.config.mapWidth, 
        height: this.config.mapHeight, 
        tiles: [] 
      },
    };
  }

  // Enqueue a command
  enqueue(command: Command): void {
    this.commandQueue.enqueue(command);
  }

  // Run one tick
  tick(): void {
    this.tickLoop.update();
    const tick = this.tickLoop.getTick();
    const commands = this.commandQueue.getCommandsUpTo(tick);

    // Process commands
    for (const command of commands) {
      this.processCommand(command);
    }

    // Update state
    this.state = {
      entities: this.entityStore.getAll(),
      commands: this.commandQueue.getAll(),
      tick,
      rngState: this.getPRNGState(),
      hash: this.hashState(),
      map: this.state?.map ?? {
        width: this.config.mapWidth,
        height: this.config.mapHeight,
        tiles: [],
      },
    };
  }

  // Process a command
  private processCommand(_command: Command): void {
    // TODO: Implement command processing
    // This will be filled in as we implement systems
  }

  // Get the current state
  getState(): SimState | null {
    return this.state;
  }

  // Get the current tick
  getTick(): number {
    return this.tickLoop.getTick();
  }

  // Get the PRNG
  getPRNG(): PRNG {
    return this.prng;
  }

  // Get the entity store
  getEntityStore(): EntityStore {
    return this.entityStore;
  }

  // Get the command queue
  getCommandQueue(): CommandQueue {
    return this.commandQueue;
  }

  // Get the tick loop
  getTickLoop(): TickLoop {
    return this.tickLoop;
  }

  // Get the config
  getConfig(): SimConfig {
    return this.config;
  }

  // Get the current tick loop
  getTickLoopState(): number {
    return this.tickLoop.getTick();
  }

  // Set the current tick loop
  setTickLoopState(tick: number): void {
    this.tickLoop.setTick(tick);
  }

  // Get the PRNG state
  getPRNGState(): number {
    return this.prng.getState();
  }

  // Set the PRNG state
  setPRNGState(state: number): void {
    this.prng.setState(state);
  }

  // Hash the current state for determinism
  hash(): string {
    if (!this.state) {
      return fnv1aHashString('empty');
    }

    const stateStr = JSON.stringify(this.state, (_key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });

    return fnv1aHashString(stateStr);
  }

  // Hash the current state for determinism
  private hashState(): string {
      if (!this.state) {
        return fnv1aHashString('empty');
      }

      const stateStr = JSON.stringify(this.state, (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      });

      return fnv1aHashString(stateStr);
    }

    // Serialize the state
    public serialize(): string {
      if (!this.state) {
        return JSON.stringify({
          entities: [],
          commands: [],
          tick: 0,
          rngState: this.getPRNGState(),
          hash: fnv1aHashString('empty'),
        });
      }

      return JSON.stringify(this.state, (_key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      });
    }

    // Deserialize the state
    static deserialize(data: string, config: SimConfig): Sim {
      const parsed = JSON.parse(data);
      const sim = new Sim(config);
      sim.state = parsed;
      sim.setPRNGState(parsed.rngState);
      sim.setTickLoopState(parsed.tick);
      return sim;
    }
}