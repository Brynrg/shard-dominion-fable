// Test concrete slabs and power system

import { describe, it, expect, vi } from 'vitest';
import { Sim } from '../../src/sim/index.js';
import type { SimConfig } from '../../src/sim/core/types.js';

// Mock performance.now() for Node.js environment
vi.stubGlobal('performance', {
  now: () => Date.now(),
});

describe('Sim concrete slabs and power', () => {
  it('should add concrete slabs', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a 2x2 concrete slab
    sim.addConcreteSlab(10, 10, '2x2');

    // Check that the slab was added
    const buildings = sim.getState()?.buildings;
    expect(buildings).toBeDefined();
    expect(buildings?.length).toBe(1);
    expect(buildings?.[0].type).toBe('concrete_slab_2x2');
    expect(buildings?.[0].x).toBe(10);
    expect(buildings?.[0].y).toBe(10);
    expect(buildings?.[0].isSlabbed).toBe(true);
  });

  it('should add 3x3 concrete slab', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a 3x3 concrete slab
    sim.addConcreteSlab(20, 20, '3x3');

    // Check that the slab was added
    const buildings = sim.getState()?.buildings;
    expect(buildings).toBeDefined();
    expect(buildings?.length).toBe(1);
    expect(buildings?.[0].type).toBe('concrete_slab_3x3');
    expect(buildings?.[0].x).toBe(20);
    expect(buildings?.[0].y).toBe(20);
    expect(buildings?.[0].isSlabbed).toBe(true);
  });

  it('should check if a tile is on a concrete slab', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a 2x2 concrete slab
    sim.addConcreteSlab(10, 10, '2x2');

    // Check that tiles on the slab are detected
    expect(sim.isTileOnConcrete(10, 10)).toBe(true);
    expect(sim.isTileOnConcrete(11, 10)).toBe(true);
    expect(sim.isTileOnConcrete(10, 11)).toBe(true);
    expect(sim.isTileOnConcrete(11, 11)).toBe(true);

    // Check that tiles off the slab are not detected
    expect(sim.isTileOnConcrete(9, 10)).toBe(false);
    expect(sim.isTileOnConcrete(10, 9)).toBe(false);
    expect(sim.isTileOnConcrete(12, 10)).toBe(false);
    expect(sim.isTileOnConcrete(10, 12)).toBe(false);
  });

  it('should check if a tile is on a 3x3 concrete slab', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a 3x3 concrete slab
    sim.addConcreteSlab(20, 20, '3x3');

    // Check that tiles on the slab are detected
    expect(sim.isTileOnConcrete(20, 20)).toBe(true);
    expect(sim.isTileOnConcrete(21, 20)).toBe(true);
    expect(sim.isTileOnConcrete(22, 20)).toBe(true);
    expect(sim.isTileOnConcrete(20, 21)).toBe(true);
    expect(sim.isTileOnConcrete(21, 21)).toBe(true);
    expect(sim.isTileOnConcrete(22, 21)).toBe(true);
    expect(sim.isTileOnConcrete(20, 22)).toBe(true);
    expect(sim.isTileOnConcrete(21, 22)).toBe(true);
    expect(sim.isTileOnConcrete(22, 22)).toBe(true);

    // Check that tiles off the slab are not detected
    expect(sim.isTileOnConcrete(19, 20)).toBe(false);
    expect(sim.isTileOnConcrete(20, 19)).toBe(false);
    expect(sim.isTileOnConcrete(23, 20)).toBe(false);
    expect(sim.isTileOnConcrete(20, 23)).toBe(false);
  });

  it('should calculate power supply and demand', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a power node (supply)
    const powerNode = {
      entityId: 1,
      type: 'power_node',
      x: 10,
      y: 10,
      hp: 500,
      maxHp: 500,
      powerDrain: 0,
      powerOutput: 100,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 300,
    };
    sim.addBuilding(powerNode);

    // Add a refinery (demand)
    const refinery = {
      entityId: 2,
      type: 'refinery',
      x: 20,
      y: 20,
      hp: 900,
      maxHp: 900,
      powerDrain: 30,
      powerOutput: 0,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 1600,
    };
    sim.addBuilding(refinery);

    // Add a barracks (demand)
    const barracks = {
      entityId: 3,
      type: 'barracks',
      x: 30,
      y: 30,
      hp: 600,
      maxHp: 600,
      powerDrain: 10,
      powerOutput: 0,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 300,
    };
    sim.addBuilding(barracks);

    // Update power
    sim.updatePower();

    // Check that power is calculated correctly
    const power = sim.getState()?.power;
    expect(power).toBeDefined();
    expect(power?.supply).toBe(100);
    expect(power?.demand).toBe(40);
    expect(power?.deficit).toBe(0);
    expect(power?.productionMultiplier).toBe(1.0);
  });

  it('should calculate power deficit', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a power node (supply)
    const powerNode = {
      entityId: 1,
      type: 'power_node',
      x: 10,
      y: 10,
      hp: 500,
      maxHp: 500,
      powerDrain: 0,
      powerOutput: 100,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 300,
    };
    sim.addBuilding(powerNode);

    // Add a refinery (demand)
    const refinery = {
      entityId: 2,
      type: 'refinery',
      x: 20,
      y: 20,
      hp: 900,
      maxHp: 900,
      powerDrain: 150,
      powerOutput: 0,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 1600,
    };
    sim.addBuilding(refinery);

    // Update power
    sim.updatePower();

    // Check that power deficit is calculated correctly
    const power = sim.getState()?.power;
    expect(power).toBeDefined();
    expect(power?.supply).toBe(100);
    expect(power?.demand).toBe(150);
    expect(power?.deficit).toBe(50);
    expect(power?.productionMultiplier).toBe(0.4);
  });

  it('should get power deficit status', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a power node (supply)
    const powerNode = {
      entityId: 1,
      type: 'power_node',
      x: 10,
      y: 10,
      hp: 500,
      maxHp: 500,
      powerDrain: 0,
      powerOutput: 100,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 300,
    };
    sim.addBuilding(powerNode);

    // Add a refinery (demand)
    const refinery = {
      entityId: 2,
      type: 'refinery',
      x: 20,
      y: 20,
      hp: 900,
      maxHp: 900,
      powerDrain: 150,
      powerOutput: 0,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 1600,
    };
    sim.addBuilding(refinery);

    // Update power
    sim.updatePower();

    // Check that power deficit status is correct
    expect(sim.getPowerDeficit()).toBe(true);
  });

  it('should get power production multiplier', () => {
    const config: SimConfig = {
      tickRate: 20,
      mapWidth: 100,
      mapHeight: 100,
      seed: 12345,
    };

    const sim = new Sim(config);

    // Add a power node (supply)
    const powerNode = {
      entityId: 1,
      type: 'power_node',
      x: 10,
      y: 10,
      hp: 500,
      maxHp: 500,
      powerDrain: 0,
      powerOutput: 100,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 300,
    };
    sim.addBuilding(powerNode);

    // Add a refinery (demand)
    const refinery = {
      entityId: 2,
      type: 'refinery',
      x: 20,
      y: 20,
      hp: 900,
      maxHp: 900,
      powerDrain: 150,
      powerOutput: 0,
      isPowered: true,
      isSlabbed: false,
      buildProgress: 100,
      buildTime: 1,
      buildCost: 1600,
    };
    sim.addBuilding(refinery);

    // Update power
    sim.updatePower();

    // Check that power production multiplier is correct
    expect(sim.getPowerMultiplier()).toBe(0.4);
  });
});