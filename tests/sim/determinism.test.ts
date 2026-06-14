// Determinism test: same seed + same commands => same state hash

import { describe, it, expect, vi } from 'vitest';
import { Sim } from '../../src/sim/index.js';
import type { Command } from '../../src/sim/core/types.js';

// Mock performance.now() for Node.js environment
global.performance = {
  now: vi.fn(() => Date.now()),
} as any;

describe('Sim determinism', () => {
  it('same seed produces same initial state', () => {
    const config1 = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };
    const config2 = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim1 = new Sim(config1);
    const sim2 = new Sim(config2);

    expect(sim1.getTick()).toBe(sim2.getTick());
    expect(sim1.getPRNGState()).toBe(sim2.getPRNGState());
  });

  it('same seed + same commands => same state hash', () => {
    const config = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const commands: Command[] = [
      { tick: 0, playerId: 0, type: 'spawn', args: ['unit', 0, 50, 50] },
      { tick: 0, playerId: 0, type: 'spawn', args: ['unit', 1, 60, 60] },
    ];

    const sim1 = new Sim(config);
    const sim2 = new Sim(config);

    commands.forEach((cmd) => sim1.enqueue(cmd));
    commands.forEach((cmd) => sim2.enqueue(cmd));

    // Run 10 ticks to populate state
    for (let i = 0; i < 10; i++) {
      sim1.tick();
      sim2.tick();
    }

    expect(sim1.getTick()).toBe(sim2.getTick());
    expect(sim1.getPRNGState()).toBe(sim2.getPRNGState());
    expect(sim1.hash()).toBe(sim2.hash());
  });

  it('different seed produces different state hash', () => {
    const config1 = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };
    const config2 = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 54321,
    };

    const sim1 = new Sim(config1);
    const sim2 = new Sim(config2);

    // Run 10 ticks to populate state
    for (let i = 0; i < 10; i++) {
      sim1.tick();
      sim2.tick();
    }

    expect(sim1.getTick()).toBe(sim2.getTick());
    expect(sim1.getPRNGState()).not.toBe(sim2.getPRNGState());
    expect(sim1.hash()).not.toBe(sim2.hash());
  });
});
