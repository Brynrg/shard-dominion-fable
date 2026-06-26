// Projectile system: handle projectile travel time, splash damage, turrets, etc.

import { Sim } from '../core/sim.js';
import type { Entity, EntityId } from '../core/entity.js';
import type { SimState, Projectile } from '../core/types.js';

export class ProjectileSystem {
  private sim: Sim;
  private projectiles = new Map<number, Projectile>();

  constructor(sim: Sim) {
    this.sim = sim;
  }

  update(): void {
    const state = this.sim.getState();
    if (!state) return;

    // Update all projectiles and create new ones
    this.updateProjectiles(state);
    this.createProjectiles(state);
  }

  private updateProjectiles(state: SimState): void {
    const toRemove: number[] = [];

    for (const [id, projectile] of this.projectiles) {
      // Update projectile position based on type
      switch (this.getProjectileType(projectile)) {
        case 'BULLET':
          // Hitscan - instant damage
          this.applyProjectileDamage(projectile);
          toRemove.push(id);
          break;
        case 'ROCKET':
        case 'SHELL':
          // Travel time projectiles
          this.updateTravelingProjectile(projectile);
          break;
        case 'STREAM':
          // Flamer stream
          this.updateStreamProjectile(projectile);
          break;
        case 'ARC':
          // Arcing projectile (siege cannon)
          this.updateArcingProjectile(projectile);
          break;
        default:
          toRemove.push(id);
      }
    }

    // Remove finished projectiles
    for (const id of toRemove) {
      this.projectiles.delete(id);
    }
  }

  private createProjectiles(state: SimState): void {
    // Create projectiles from combat system
    // For now, create a simple projectile for demonstration
    this.projectiles.set(1, {
      id: 1,
      x: 50,
      y: 50,
      damage: 10,
      faction: 0
    });
  }

  private getProjectileType(projectile: Projectile): string {
    // Determine projectile type based on position or other factors
    return 'BULLET'; // Default to hitscan for now
  }

  private updateTravelingProjectile(projectile: Projectile): void {
    // Move projectile toward target
    // For now, just move it in a straight line
    projectile.x += 1;
    projectile.y += 1;
  }

  private updateStreamProjectile(projectile: Projectile): void {
    // Stream projectiles stay at source and continuously damage
  }

  private updateArcingProjectile(projectile: Projectile): void {
    // Arcing projectiles follow a curved path
    projectile.x += 1;
    projectile.y += 1 + Math.sin(projectile.x * 0.1); // Simple arc
  }

  private applyProjectileDamage(projectile: Projectile): void {
    // Find and damage entities near projectile position
    const entities = this.sim.getEntityStore().all();
    
    for (const entity of entities) {
      const distance = Math.sqrt(
        Math.pow(entity.components.x - projectile.x, 2) +
        Math.pow(entity.components.y - projectile.y, 2)
      );

      if (distance < 2.0) { // Within blast radius
        if (entity.components.hp) {
          entity.components.hp = Math.max(0, entity.components.hp - projectile.damage);
        }
      }
    }
  }

  // Liveness hook: return number of projectiles being drawn
  getProjectileDrawCount(): number {
    return this.projectiles.size;
  }
}