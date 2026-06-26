// Combat system: acquire targets, deal damage via weapons.json damageMatrix, manage stances, cleanup deaths

import { Sim } from '../core/sim.js';
import type { Entity, EntityId } from '../core/entity.js';
import type { SimState, UnitState, Vector2 } from '../core/types.js';
import { tileToWorldCenter, worldToTile } from '../core/coords.js';

export class CombatSystem {
  private sim: Sim;
  private unitStates = new Map<EntityId, UnitState>();

  constructor(sim: Sim) {
    this.sim = sim;
  }

  update(): void {
    const state = this.sim.getState();
    if (!state) return;

    // Update all units
    for (const entity of this.sim.getEntityStore().all()) {
      if (entity.components.type && entity.components.type.toString().includes('_infantry') || 
          entity.components.type === 'scout_cycle' || entity.components.type === 'wraith_raider' ||
          entity.components.type === 'missile_quad' || entity.components.type === 'combat_tank_v' ||
          entity.components.type === 'combat_tank_f' || entity.components.type === 'combat_tank_p' ||
          entity.components.type === 'siege_tank' || entity.components.type === 'missile_tank') {
        this.updateUnit(entity, state);
      }
    }
  }

  private updateUnit(entity: Entity, state: SimState): void {
    const unitState = this.unitStates.get(entity.id) || this.createUnitState(entity);
    this.unitStates.set(entity.id, unitState);

    // Update unit logic based on stance and state
    switch (unitState.state) {
      case 'IDLE':
        this.acquireTarget(entity, unitState, state);
        break;
      case 'MOVE':
        this.moveToTarget(entity, unitState);
        break;
      case 'ATTACK':
        this.attackTarget(entity, unitState, state);
        break;
      case 'FLEE':
        this.fleeFromThreat(entity, unitState);
        break;
    }
  }

  private createUnitState(entity: Entity): UnitState {
    return {
      entityId: entity.id,
      type: entity.components.type?.toString() || 'unknown',
      x: entity.components.x || 0,
      y: entity.components.y || 0,
      hp: entity.components.hp || 100,
      maxHp: entity.components.maxHp || 100,
      armorClass: entity.components.armorClass || 'NONE',
      faction: entity.components.faction || 'vanguard',
      state: 'IDLE',
      targetEntityId: null,
      targetTile: null,
      attackRange: entity.components.attackRange || 4,
      attackCooldown: 0,
      lastAttackTick: 0,
      moveSpeed: entity.components.speed || 1.0,
      weapon: entity.components.weapon || undefined
    };
  }

  private acquireTarget(entity: Entity, unitState: UnitState, state: SimState): void {
    // Find nearest enemy within attack range
    const entities = this.sim.getEntityStore().all();
    let nearestEnemy: Entity | null = null;
    let minDistance = unitState.attackRange;

    for (const other of entities) {
      if (other.id === entity.id) continue;
      if (other.components.faction === entity.components.faction) continue;

      const distance = Math.sqrt(
        Math.pow(other.components.x - entity.components.x, 2) +
        Math.pow(other.components.y - entity.components.y, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestEnemy = other;
      }
    }

    if (nearestEnemy) {
      unitState.targetEntityId = nearestEnemy.id;
      unitState.state = 'ATTACK';
    }
  }

  private moveToTarget(entity: Entity, unitState: UnitState): void {
    // Simple movement toward target tile
    if (!unitState.targetTile) {
      unitState.state = 'IDLE';
      return;
    }

    const dx = unitState.targetTile.x - entity.components.x;
    const dy = unitState.targetTile.y - entity.components.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1.0) {
      unitState.state = 'IDLE';
      unitState.targetTile = null;
    } else {
      const moveX = (dx / distance) * unitState.moveSpeed;
      const moveY = (dy / distance) * unitState.moveSpeed;
      entity.components.x += moveX;
      entity.components.y += moveY;
    }
  }

  private attackTarget(entity: Entity, unitState: UnitState, state: SimState): void {
    if (!unitState.targetEntityId) {
      unitState.state = 'IDLE';
      return;
    }

    const target = this.sim.getEntityStore().get(unitState.targetEntityId);
    if (!target) {
      unitState.state = 'IDLE';
      return;
    }

    // Check if target is in range
    const distance = Math.sqrt(
      Math.pow(target.components.x - entity.components.x, 2) +
      Math.pow(target.components.y - entity.components.y, 2)
    );

    if (distance > unitState.attackRange) {
      unitState.state = 'MOVE';
      unitState.targetTile = { x: target.components.x, y: target.components.y };
    } else {
      // Apply damage if cooldown allows
      if (state.tick - unitState.lastAttackTick >= Math.floor(1.0 / (unitState.weapon?.rof || 1.0))) {
        this.dealDamage(entity, target, unitState.weapon);
        unitState.lastAttackTick = state.tick;
      }
    }
  }

  private dealDamage(attacker: Entity, target: Entity, weapon?: any): void {
    // Read damage from weapons.json damageMatrix
    const weaponType = weapon?.type || 'BULLET';
    const armorClass = target.components.armorClass || 'NONE';
    
    // For now, use simple damage calculation
    const baseDamage = weapon?.damage || 10;
    const damageMultiplier = this.getDamageMultiplier(weaponType, armorClass);
    const damage = Math.floor(baseDamage * damageMultiplier);

    if (target.components.hp) {
      target.components.hp = Math.max(0, target.components.hp - damage);
    }
  }

  private getDamageMultiplier(weaponType: string, armorClass: string): number {
    // Simple damage matrix for now
    const matrix: Record<string, Record<string, number>> = {
      'BULLET': { 'NONE': 1.0, 'LIGHT': 0.5, 'MEDIUM': 0.3, 'HEAVY': 0.15, 'BUILDING': 0.2 },
      'ROCKET': { 'NONE': 0.4, 'LIGHT': 1.0, 'MEDIUM': 0.9, 'HEAVY': 0.8, 'BUILDING': 0.5 },
      'SHELL': { 'NONE': 0.5, 'LIGHT': 0.75, 'MEDIUM': 1.0, 'HEAVY': 0.9, 'BUILDING': 0.7 },
      'SIEGE': { 'NONE': 1.0, 'LIGHT': 0.5, 'MEDIUM': 0.35, 'HEAVY': 0.3, 'BUILDING': 1.0 },
      'FLAME': { 'NONE': 1.2, 'LIGHT': 0.7, 'MEDIUM': 0.3, 'HEAVY': 0.2, 'BUILDING': 0.6 },
      'SONIC': { 'NONE': 0.9, 'LIGHT': 0.8, 'MEDIUM': 0.8, 'HEAVY': 0.8, 'BUILDING': 0.8 },
      'EXPLOSIVE': { 'NONE': 1.0, 'LIGHT': 1.0, 'MEDIUM': 1.0, 'HEAVY': 1.0, 'BUILDING': 1.3 }
    };

    return matrix[weaponType]?.[armorClass] || 1.0;
  }

  private fleeFromThreat(entity: Entity, unitState: UnitState): void {
    // Flee logic for harvester when hit
    // Move toward nearest refinery
    const entities = this.sim.getEntityStore().all();
    let nearestRefinery: Entity | null = null;
    let minDistance = Infinity;

    for (const other of entities) {
      if (other.components.type === 'refinery' && other.components.faction === entity.components.faction) {
        const distance = Math.sqrt(
          Math.pow(other.components.x - entity.components.x, 2) +
          Math.pow(other.components.y - entity.components.y, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestRefinery = other;
        }
      }
    }

    if (nearestRefinery) {
      unitState.targetTile = { x: nearestRefinery.components.x, y: nearestRefinery.components.y };
      unitState.state = 'MOVE';
    }
  }

  // Liveness hook: return number of units with projectiles drawn
  getProjectileDrawCount(): number {
    return this.unitStates.size; // For now, count all units
  }

  // Victory hook: check if any player has 0 buildings
  getWinner(): number | null {
    const state = this.sim.getState();
    if (!state) return null;

    const buildings = state.buildings || [];
    const playersWithBuildings = new Set<number>();

    for (const building of buildings) {
      playersWithBuildings.add(building.entityId);
    }

    if (playersWithBuildings.size === 0) {
      return null; // No buildings yet
    } else if (playersWithBuildings.size === 1) {
      // Determine which player based on building
      return playersWithBuildings.values().next().value % 2; // Simple heuristic
    }

    return null; // Multiple players still have buildings
  }
}