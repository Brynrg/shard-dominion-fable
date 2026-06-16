// Serialization test: serialize/deserialize state produces identical state

import { describe, it, expect } from 'vitest';
import { Sim } from '../../src/sim/index.js';
import type { SimConfig } from '../../src/sim/core/types.js';

// Mock performance.now() for Node.js environment
global.performance = {
  now: () => Date.now(),
} as any;

describe('Sim serialization', () => {
  it('serialize/deserialize produces identical state', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim1 = new Sim(config);
    const sim2 = new Sim(config);

    // Add some entities to sim1
    sim1.getEntityStore().create({
      id: 1,
      components: {
        type: 'player',
        x: 50,
        y: 50,
        hp: 100,
        maxHp: 100,
      },
    });

    sim1.getEntityStore().create({
      id: 2,
      components: {
        type: 'enemy',
        x: 30,
        y: 30,
        hp: 50,
        maxHp: 50,
      },
    });

    // Add a command to sim1
    sim1.enqueue({
      tick: 0,
      playerId: 1,
      type: 'move',
      args: [60, 60],
    });

    // Run 10 ticks on sim1
    for (let i = 0; i < 10; i++) {
      sim1.tick();
    }

    // Serialize sim1
    const serialized = sim1.serialize();

    // Deserialize into sim2
    const deserialized = Sim.deserialize(serialized, config);

    // Run 10 ticks on sim2
    for (let i = 0; i < 10; i++) {
      deserialized.tick();
    }

    // Compare states
    const state1 = sim1.getState();
    const state2 = deserialized.getState();

    expect(state1).not.toBeNull();
    expect(state2).not.toBeNull();

    expect(state1?.tick).toBe(state2?.tick);
    expect(state1?.rngState).toBe(state2?.rngState);
    expect(state1?.hash).toBe(state2?.hash);
    expect(state1?.entities.length).toBe(state2?.entities.length);
    expect(state1?.commands.length).toBe(state2?.commands.length);
  });

  it('serialize/deserialize produces identical hash', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 54321,
    };

    const sim1 = new Sim(config);
    const sim2 = new Sim(config);

    // Run 10 ticks on sim1
    for (let i = 0; i < 10; i++) {
      sim1.tick();
    }

    // Serialize sim1
    const serialized = sim1.serialize();

    // Deserialize into sim2
    const deserialized = Sim.deserialize(serialized, config);

    // Run 10 ticks on sim2
    for (let i = 0; i < 10; i++) {
      deserialized.tick();
    }

    // Compare hashes
    expect(sim1.hash()).toBe(deserialized.hash());
  });
});