import type { Components } from '../core/entity.js';
import type { Sim } from '../core/sim.js';
import type { TerrainConfig } from '../loaders/terrain-loader.js';

export interface HarvesterState {
  state: 'SEEK' | 'HARVEST' | 'RETURN' | 'DOCK';
  load: number;
  fieldTarget?: { tx: number; ty: number };
  refineryId?: number;
}

// Convert tile coordinates to world coordinates
function tileToWorldCenter(tx: number, ty: number) {
  return { x: (tx << 8) + 128, y: (ty << 8) + 128 };
}

// Convert world coordinates to tile coordinates
function worldToTile(x: number, y: number) {
  return { tx: x >> 8, ty: y >> 8 };
}

export class HarvesterSystem {
  private sim: Sim;
  private terrainConfig: TerrainConfig;

  constructor(sim: Sim, terrainConfig: TerrainConfig) {
    this.sim = sim;
    this.terrainConfig = terrainConfig;
  }

  // Update a single harvester's state machine
  updateHarvester(harvesterId: number, harvesterState: HarvesterState, entityComponents: Components): void {
    const { state, load, fieldTarget, refineryId } = harvesterState;
    const { harvesterCapacity, harvestRatePerSec, unloadPerSec } = this.terrainConfig.economyConstants;

    switch (state) {
      case 'SEEK': {
        // Find nearest tile with shard density > 0
        if (!fieldTarget) {
          // Find nearest tile with shard density
          const entity = this.sim.getEntityStore().get(harvesterId);
          if (!entity) break;

          const currentTile = worldToTile(entityComponents.x, entityComponents.y);
          const state = this.sim.getState();
          
          if (!state) break;
          const map = state.map;

          let nearestTile: { tx: number; ty: number } | null = null;
          let nearestDist = Infinity;

          for (let ty = 0; ty < map.h; ty++) {
            for (let tx = 0; tx < map.w; tx++) {
              const tile = map.tiles[ty * map.w + tx];
              if (tile && tile.shard > 0) {
                const dist = Math.abs(currentTile.tx - tx) + Math.abs(currentTile.ty - ty);
                if (dist < nearestDist) {
                  nearestDist = dist;
                  nearestTile = { tx, ty };
                }
              }
            }
          }

          if (nearestTile) {
            harvesterState.fieldTarget = nearestTile;
          } else {
            // No more shards, return to refinery
            harvesterState.state = 'RETURN';
          }
        } else {
          // Move to target tile
          const entity = this.sim.getEntityStore().get(harvesterId);
          if (!entity) break;

          const targetWorld = tileToWorldCenter(fieldTarget.tx, fieldTarget.ty);
          const dx = targetWorld.x - entityComponents.x;
          const dy = targetWorld.y - entityComponents.y;
          const dist = Math.abs(dx) + Math.abs(dy);

          if (dist <= 256) { // Within 1 tile
            // Arrived at tile, start harvesting
            harvesterState.state = 'HARVEST';
          } else {
            // Move towards target
            if (Math.abs(dx) > Math.abs(dy)) {
              entityComponents.x += Math.sign(dx);
            } else {
              entityComponents.y += Math.sign(dy);
            }
          }
        }
        break;
      }

      case 'HARVEST': {
        // Extract shards
        const entity = this.sim.getEntityStore().get(harvesterId);
        if (!entity) break;

        const currentTile = worldToTile(entityComponents.x, entityComponents.y);
        const state = this.sim.getState();
        
        if (!state) break;
        const map = state.map;

        const tileIndex = currentTile.ty * map.w + currentTile.tx;
        const tile = map.tiles[tileIndex];
        if (tile && tile.shard > 0) {
          // Extract shards
          const extractAmount = harvestRatePerSec; // per tick, assuming 20Hz = 50ms per tick
          tile.shard = Math.max(0, tile.shard - extractAmount);
          harvesterState.load = Math.min(harvesterCapacity, harvesterState.load + extractAmount);
        }

        // Check if tile is depleted or load is full
        if (!tile || tile.shard === 0 || harvesterState.load >= harvesterCapacity) {
          harvesterState.state = 'RETURN';
          harvesterState.fieldTarget = undefined;
        }
        break;
      }

      case 'RETURN': {
        // Find nearest refinery
        if (!refineryId) {
          // Find nearest refinery for player 0
          const state = this.sim.getState();
          if (!state) break;

          const entity = this.sim.getEntityStore().get(harvesterId);
          if (!entity) break;

          // Find all refineries for player 0
          let nearestRefinery: number | null = null;
          let nearestDist = Infinity;

          for (const otherEntity of this.sim.getEntityStore().all()) {
            if (otherEntity.components.type === 'refinery' && 
                otherEntity.components.owner === 0) {
              const rx = otherEntity.components.x as number;
              const ry = otherEntity.components.y as number;
              const dist = Math.abs(entityComponents.x - rx) + Math.abs(entityComponents.y - ry);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestRefinery = otherEntity.id;
              }
            }
          }

          if (nearestRefinery) {
            harvesterState.refineryId = nearestRefinery;
          } else {
            // No refinery, go back to SEEK
            harvesterState.state = 'SEEK';
          }
        } else {
          // Move to refinery
          const refinery = this.sim.getEntityStore().get(refineryId);
          if (!refinery) break;

          const dx = refinery.components.x - entityComponents.x;
          const dy = refinery.components.y - entityComponents.y;
          const dist = Math.abs(dx) + Math.abs(dy);

          if (dist <= 256) { // Within 1 tile
            // Arrived at refinery, dock
            harvesterState.state = 'DOCK';
          } else {
            // Move towards refinery
            if (Math.abs(dx) > Math.abs(dy)) {
              entityComponents.x += Math.sign(dx);
            } else {
              entityComponents.y += Math.sign(dy);
            }
          }
        }
        break;
      }

      case 'DOCK': {
        // Unload credits to refinery
        if (!refineryId) break;

        const refinery = this.sim.getEntityStore().get(refineryId);
        if (!refinery || refinery.components.type !== 'refinery') break;

        const factoryBuilding = refinery.components.building;
        if (!factoryBuilding) break;

        // Get the refinery's storage from components
        let refineryStorage = 0;
        if (factoryBuilding.hasOwnProperty('credits')) {
          refineryStorage = (factoryBuilding as any).credits || 0;
        }

        const maxCredits = this.terrainConfig.economyConstants.refineryStorage;
        
        // Unload load per tick
        const unloadAmount = Math.min(harvesterState.load, unloadPerSec);
        harvesterState.load = Math.max(0, harvesterState.load - unloadAmount);

        // Update refinery storage
        refineryStorage = Math.min(maxCredits, refineryStorage + unloadAmount);
        (factoryBuilding as any).credits = refineryStorage;

        // Check if harvester is empty
        if (harvesterState.load === 0) {
          harvesterState.state = 'SEEK';
          harvesterState.refineryId = undefined;
          harvesterState.fieldTarget = undefined;
        }
        break;
      }
    }
  }

  // Get total credits from all refineries
  getTotalCredits(): number {
    let totalCredits = 0;
    
    for (const entity of this.sim.getEntityStore().all()) {
      if (entity.components.type === 'refinery' && entity.components.building) {
        const building = entity.components.building as any;
        if (building.hasOwnProperty('credits')) {
          totalCredits += building.credits || 0;
        }
      }
    }
    
    return totalCredits;
  }

  // Get total storage (sum of all refinery storage)
  getTotalStorage(): number {
    return this.getTotalCredits(); // Same as credits for now
  }

  // Get storage capacity (refinery storage * number of refineries)
  getStorageCapacity(): number {
    const refineryCount = this.sim.getEntityStore().all().filter(
      e => e.components.type === 'refinery'
    ).length;
    return refineryCount * this.terrainConfig.economyConstants.refineryStorage;
  }
}