// Sim facade: new Sim(seed, mapData, config) / sim.enqueue(cmd) / sim.tick() / sim.hash() / sim.serialize() / Sim.deserialize()

import { Sim } from './core/sim.js';
import type { Command, SimConfig, SimState } from './core/types.js';

export { Sim };
export type { Command, SimConfig, SimState };