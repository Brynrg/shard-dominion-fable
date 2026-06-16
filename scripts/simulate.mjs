#!/usr/bin/env node
// scripts/simulate.mjs — headless CLI for the simulation
//
// Usage: npm run simulate -- --seed <seed> --ticks <ticks> [--scenario <scenario>]
//
// This runs the simulation headlessly and outputs the state hash for
// determinism verification.

import { Sim } from '../src/sim/index.js';
import { fnv1aHashString } from '../src/sim/core/hash.js';

const args = process.argv.slice(2);
const seed = parseInt(flag('--seed') || '12345', 10);
const ticks = parseInt(flag('--ticks') || '100', 10);
const scenario = flag('--scenario') || null;

if (isNaN(seed) || isNaN(ticks)) {
  fail('Usage: npm run simulate -- --seed <seed> --ticks <ticks> [--scenario <scenario>]');
}

console.log(`Running simulation: seed=${seed}, ticks=${ticks}${scenario ? `, scenario=${scenario}` : ''}`);

const config = {
  tickRate: 20,
  mapWidth: 100,
  mapHeight: 100,
  seed,
};

const sim = new Sim(config);

// Add some initial entities based on scenario
if (scenario === 'test') {
  sim.getEntityStore().create({
    id: 1,
    components: {
      type: 'player',
      x: 50,
      y: 50,
      hp: 100,
      maxHp: 100,
    },
  });
  sim.getEntityStore().create({
    id: 2,
    components: {
      type: 'enemy',
      x: 30,
      y: 30,
      hp: 50,
      maxHp: 50,
    },
  });
  sim.enqueue({
    tick: 0,
    playerId: 1,
    type: 'move',
    args: [60, 60],
  });
}

// Run the simulation
for (let i = 0; i < ticks; i++) {
  sim.tick();
}

// Output the state hash for determinism verification
const state = sim.getState();
if (state) {
  const stateStr = JSON.stringify(state, (_key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
  const hash = fnv1aHashString(stateStr);
  console.log(`\nState hash: ${hash}`);
  console.log(`Tick: ${sim.getTick()}`);
  console.log(`Entities: ${state.entities.length}`);
  console.log(`Commands: ${state.commands.length}`);
}

function flag(name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

function fail(msg) {
  process.stderr.write(`\n✗ ${msg}\n\n`);
  process.exit(1);
}