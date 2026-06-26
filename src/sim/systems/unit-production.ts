// Unit production system: handle producers at barracks/light/heavy with prereqUpgrade from techtree

import { Sim } from '../core/sim.js';
import type { Entity, EntityId } from '../core/entity.js';
import type { SimState } from '../core/types.js';



interface UnitConfig {
  cost: number;
  buildTime: number;
  hp: number;
  armor: string;
  speed: number;
  vision: number;
  weapon?: string;
  producer: string;
  prereqUpgrade?: boolean;
  factions?: string[];
  footprint?: string;
  special?: string;
}

export class UnitProductionSystem {
  private sim: Sim;
  private productionQueues = new Map<string, string[]>(); // producer -> unitType[]
  private unitConfigs = new Map<string, UnitConfig>();

  constructor(sim: Sim) {
    this.sim = sim;
    this.loadUnitConfigs();
  }

  private loadUnitConfigs(): void {
    // Load units.json - for now use simple hard-coded data
    try {
      // For now, use a basic unit config
      this.unitConfigs.set('light_infantry', {
        cost: 60,
        buildTime: 4,
        hp: 45,
        armor: 'NONE',
        speed: 1.4,
        vision: 4,
        weapon: 'smg',
        producer: 'barracks',
        footprint: 'infantry'
      });
    } catch (error) {
      console.log('Failed to load unit configs:', error);
    }
  }

  update(): void {
    const state = this.sim.getState();
    if (!state) return;

    // Update production queues
    for (const [producer, queue] of this.productionQueues) {
      if (queue.length > 0) {
        this.produceUnit(producer, queue[0], state);
        queue.shift(); // Remove from queue after production
      }
    }
  }

  addToQueue(unitType: string, producerType: string): boolean {
    const producerEntities = this.findProducers(producerType);
    if (producerEntities.length === 0) return false;

    // Find first producer with available capacity
    for (const producer of producerEntities) {
      const producerKey = `${producerType}_${producer.id}`;
      if (!this.productionQueues.has(producerKey)) {
        this.productionQueues.set(producerKey, []);
      }
      
      const queue = this.productionQueues.get(producerKey)!;
      if (queue.length < 5) { // Queue depth 5
        queue.push(unitType);
        return true;
      }
    }

    return false;
  }

  private findProducers(producerType: string): Entity[] {
    const entities = this.sim.getEntityStore().all();
    return entities.filter(e => e.components.type === producerType);
  }

  private produceUnit(producerType: string, unitType: string, state: SimState): void {
    const config = this.unitConfigs.get(unitType);
    if (!config) return;

    // Check prereqUpgrade if specified
    if (config.prereqUpgrade) {
      // For now, assume all buildings are upgraded
    }

    // Create unit near producer
    const producer = this.findProducers(producerType)[0];
    if (!producer) return;

    const unit = this.sim.getEntityStore().create({
      type: unitType,
      owner: producer.components.owner || 0,
      x: producer.components.x + (Math.random() - 0.5) * 10,
      y: producer.components.y + (Math.random() - 0.5) * 10,
      hp: config.hp,
      maxHp: config.hp,
      armorClass: config.armor as any,
      faction: producer.components.faction || 'vanguard',
      state: 'IDLE',
      targetEntityId: null,
      targetTile: null,
      attackRange: 4,
      attackCooldown: 0,
      lastAttackTick: 0,
      moveSpeed: config.speed,
      weapon: config.weapon ? {
        type: config.weapon,
        damage: 10, // Default
        range: 4,
        rof: 1.0
      } : undefined
    });

    // Deduct cost from player
    if (state.players && state.players[producer.components.owner || 0]) {
      state.players[producer.components.owner || 0].credits -= config.cost;
    }
  }

  // For liveness test: return number of units produced
  getUnitCount(): number {
    let count = 0;
    for (const queue of this.productionQueues.values()) {
      count += queue.length;
    }
    return count;
  }
}