// Main simulation class

import { PRNG } from './prng.js';
import { fnv1aHashString } from './hash.js';
import { EntityStore } from './entity-store.js';
import { CommandQueue } from './command-queue.js';
import { TickLoop } from './tick-loop.js';
import { tileToWorldCenter } from './coords.js';
import { HarvesterSystem } from '../systems/harvester.js';
import { BuildingSystem } from '../systems/building.js';
import { loadTerrainConfigSync } from '../loaders/terrain-loader.js';
import type { Command, SimConfig, SimState, BuildingState, UnitState } from './types.js';
import type { Components, TilePt } from './entity.js';

export class Sim {
  private prng: PRNG;
  private entityStore: EntityStore;
  private commandQueue: CommandQueue;
  private tickLoop: TickLoop;
  private config: SimConfig;
  private state: SimState | null = null;
  private harvesterSystem: HarvesterSystem;
  private buildingSystem: BuildingSystem;
  private terrainConfig: any;

  constructor(config: SimConfig) {
    this.config = config;
    this.prng = new PRNG(config.seed);
    this.entityStore = new EntityStore();
    this.commandQueue = new CommandQueue();
    this.tickLoop = new TickLoop(config.tickRate);
    // Load terrain config and initialize systems
    this.terrainConfig = loadTerrainConfigSync();
    this.harvesterSystem = new HarvesterSystem(this, this.terrainConfig);
    this.buildingSystem = new BuildingSystem(this);
    this.generateMap();
  }

  // Generate map with terrain and shard density
    private generateMap(): void {
      const { mapWidth, mapHeight } = this.config;
      const tiles: any[] = [];  // Use any for now

      // Simple terrain generation: mostly SAND, some ROCK, occasional DEEP_SAND
      for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
          const noise = this.prng.next() * 100;

          let type: string = 'SAND';
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

          tiles.push({ terrain: type, shard: shardDensity, explored: [false, false] });
        }
      }

      // assign into state.map.tiles directly (the round-1 discard bug was writing tiles[] and dropping it)
      if (!this.state) {
        this.state = {
          entities: [],
          commands: [],
          tick: 0,
          rngState: this.getPRNGState(),
          hash: this.hashState(),
          map: {
            w: this.config.mapWidth,
            h: this.config.mapHeight,
            tiles: tiles,
          },
          players: [],
          projectiles: [],
        };
      } else {
        this.state.map = {
          w: this.config.mapWidth,
          h: this.config.mapHeight,
          tiles: tiles,
        };
      }
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

    // Update economy
    this.updateEconomy();

    // Update power
    this.updatePower();

    // Update buildings
    this.buildingSystem.update();

    // Update combat
    this.updateCombat();

    // Update state
    this.state = {
      entities: this.entityStore.all(),
      commands: this.commandQueue.getAll(),
      tick,
      rngState: this.getPRNGState(),
      seed: this.config.seed,
      hash: this.hashState(),
      map: this.state?.map ?? {
        w: this.config.mapWidth,
        h: this.config.mapHeight,
        tiles: [],
      },
      players: [],
      projectiles: [],
    };
  }

  // Process a command
  private processCommand(command: Command): void {
    switch (command.type) {
      case 'move': {
        // Handle move command: args = [entityId, tx, ty] for move to tile
        if (command.args.length >= 3) {
          const entityId = command.args[0] as EntityId;
          const tx = command.args[1] as number;
          const ty = command.args[2] as number;
          
          // For now, just set the target position for pathfinding
          const entity = this.entityStore.get(entityId);
          if (entity) {
            // Convert tile position to world position (simple for now)
            const worldPos = tileToWorldCenter(tx, ty);
            
            // Set entity component for target position (used in rendering)
            if (!entity.components.path) {
              entity.components.path = [];
            }
            
            // Add target to path
            entity.components.path.push({ x: worldPos.x, y: worldPos.y });
            if (entity.components.path.length > 1) {
              entity.components.path.shift(); // Keep only one target for now
            }
          }
        }
        break;
      }
      case 'stop': {
        // Handle stop command: args = [entityId]
        if (command.args.length >= 1) {
          const entityId = command.args[0] as EntityId;
          const entity = this.entityStore.get(entityId);
          if (entity) {
            // Clear the path
            entity.components.path = [];
          }
        }
        break;
      }
      case 'attack': {
        // Handle attack command: args = [entityId, targetId]
        if (command.args.length >= 2) {
          const entityId = command.args[0] as EntityId;
          const targetId = command.args[1] as EntityId;
          const entity = this.entityStore.get(entityId);
          if (entity) {
            // Set target entity for attack
            entity.components.targetId = targetId;
          }
        }
        break;
      }
      case 'harvest': {
        // Handle harvest command: args = [entityId, fieldTarget]
        if (command.args.length >= 2) {
          const entityId = command.args[0] as EntityId;
          const fieldTarget = { x: command.args[0] as number, y: command.args[1] as number };
          const entity = this.entityStore.get(entityId);
          if (entity) {
            // Set harvester state to SEEK and field target
            const harvesterState = this.state?.economy?.harvesters.find(
              (h) => h.entityId === entityId
            );
            if (harvesterState) {
              harvesterState.targetTile = fieldTarget;
              harvesterState.state = 'SEEK';
            }
          }
        }
        break;
      }
      case 'return': {
        const entity = this.entityStore.get(command.playerId);
        if (entity) {
          const harvesterState = this.state?.economy?.harvesters.find(
            (h) => h.entityId === command.playerId
          );
          if (harvesterState) {
            harvesterState.state = 'RETURN';
          }
        }
        break;
      }
      default:
        break;
    }
  }

  // Update economy state
  private updateEconomy(): void {
    if (!this.state?.economy) return;

    const economy = this.state.economy;

    // Update harvester FSM
    for (const harvester of economy.harvesters) {
      const entity = this.entityStore.get(harvester.entityId);
      if (!entity) continue;

      const x = entity.components.x as number;
      const y = entity.components.y as number;

      switch (harvester.state) {
        case 'SEEK': {
          // Find nearest tile with shard density > 0
          if (!harvester.targetTile) {
            // Find nearest tile with shard density
            let nearestTile: TilePt | null = null;
            let nearestDist = Infinity;

            const map = this.state?.map;
            if (map) {
              for (let ty = 0; ty < map.height; ty++) {
                for (let tx = 0; tx < map.w; tx++) {
                  const tile = map.tiles[ty * map.w + tx];
                  if (tile && tile.shardDensity > 0) {
                    const dist = Math.abs(x - tx) + Math.abs(y - ty);
                    if (dist < nearestDist) {
                      nearestDist = dist;
                      nearestTile = { x: tx, y: ty };
                    }
                  }
                }
              }
            }

            if (nearestTile) {
              harvester.targetTile = nearestTile;
            } else {
              // No more shards, return to refinery
              harvester.state = 'RETURN';
            }
          } else {
            // Move to target tile
            const target = harvester.targetTile;
            if (target) {
              const dist = Math.abs(x - target.x) + Math.abs(y - target.y);
              if (dist <= 1) {
                // Arrived at tile, start harvesting
                harvester.state = 'HARVEST';
                harvester.lastHarvestTick = this.tickLoop.getTick();
              } else {
                // Move towards target
                const dx = target.x - x;
                const dy = target.y - y;
                if (Math.abs(dx) > Math.abs(dy)) {
                  entity.components.x = x + Math.sign(dx);
                } else {
                  entity.components.y = y + Math.sign(dy);
                }
              }
            }
          }
          break;
        }

        case 'HARVEST': {
          // Extract shards
          const map = this.state?.map;
          if (map) {
            const tileIndex = y * map.w + x;
            const tile = map.tiles[tileIndex];
            if (tile && tile.shardDensity > 0) {
              // Extract 25 density per tick
              const extractAmount = 25;
              tile.shardDensity = Math.max(0, tile.shardDensity - extractAmount);
              harvester.credits = Math.min(
                harvester.capacity,
                harvester.credits + extractAmount
              );
            }

            // Check if tile is depleted
            if (tile && tile.shardDensity === 0) {
              harvester.state = 'RETURN';
            }
          }
          break;
        }

        case 'RETURN': {
          // Find nearest refinery
          if (!harvester.targetRefinery) {
            let nearestRefinery: EntityId | null = null;
            let nearestDist = Infinity;

            for (const refinery of economy.refineries) {
              const refineryEntity = this.entityStore.get(refinery.entityId);
              if (refineryEntity) {
                const rx = refineryEntity.components.x as number;
                const ry = refineryEntity.components.y as number;
                const dist = Math.abs(x - rx) + Math.abs(y - ry);
                if (dist < nearestDist) {
                  nearestDist = dist;
                  nearestRefinery = refinery.entityId;
                }
              }
            }

            if (nearestRefinery) {
              harvester.targetRefinery = nearestRefinery;
            } else {
              // No refinery, go back to SEEK
              harvester.state = 'SEEK';
            }
          } else {
            // Move to refinery
            const refineryEntity = this.entityStore.get(harvester.targetRefinery);
            if (refineryEntity) {
              const rx = refineryEntity.components.x as number;
              const ry = refineryEntity.components.y as number;
              const dist = Math.abs(x - rx) + Math.abs(y - ry);

              if (dist <= 1) {
                // Arrived at refinery, dock
                harvester.state = 'DOCK';
              } else {
                // Move towards refinery
                const dx = rx - x;
                const dy = ry - y;
                if (Math.abs(dx) > Math.abs(dy)) {
                  entity.components.x = x + Math.sign(dx);
                } else {
                  entity.components.y = y + Math.sign(dy);
                }
              }
            }
          }
          break;
        }

        case 'DOCK': {
          // Unload credits to refinery
          const refinery = economy.refineries.find(
            (r) => r.entityId === harvester.targetRefinery
          );
          if (refinery) {
            // Unload 100 cr per tick
            const unloadAmount = Math.min(harvester.credits, 100);
            harvester.credits -= unloadAmount;
            refinery.credits = Math.min(refinery.maxCredits, refinery.credits + unloadAmount);

            // Check if harvester is empty
            if (harvester.credits === 0) {
              harvester.state = 'SEEK';
              harvester.targetRefinery = null;
            }
          }
          break;
        }
      }
    }

    // Update storage (refinery storage)
    for (const refinery of economy.refineries) {
      const refineryEntity = this.entityStore.get(refinery.entityId);
      if (refineryEntity) {
        // Check if harvester is docked
        const dockedHarvester = economy.harvesters.find(
          (h) => h.targetRefinery === refinery.entityId && h.state === 'DOCK'
        );

        if (dockedHarvester) {
          // Unload 100 cr per tick
          const unloadAmount = Math.min(dockedHarvester.credits, 100);
          dockedHarvester.credits -= unloadAmount;
          refinery.credits = Math.min(refinery.maxCredits, refinery.credits + unloadAmount);
        }
      }
    }

    // Update credits (from refinery storage)
    economy.credits = economy.refineries.reduce(
      (sum, r) => sum + r.credits,
      0
    );

    // Update storage (total refinery storage)
    economy.storage = economy.refineries.reduce(
      (sum, r) => sum + r.credits,
      0
    );
  }

  // Update power state
  private updatePower(): void {
    if (!this.state?.power || !this.state?.buildings) return;

    const power = this.state.power;
    const buildings = this.state.buildings;

    // Calculate power supply and demand
    let supply = 0;
    let demand = 0;

    for (const building of buildings) {
      if (building.isPowered) {
        supply += building.powerOutput;
      }
      demand += building.powerDrain;
    }

    power.supply = supply;
    power.demand = demand;
    power.deficit = Math.max(0, demand - supply);

    // Calculate production multiplier
    if (supply >= demand) {
      power.productionMultiplier = 1.0;
    } else {
      power.productionMultiplier = 0.4;
    }
  }

  // Get power deficit status
  getPowerDeficit(): boolean {
    const deficit = this.state?.power?.deficit;
    return deficit !== undefined && deficit > 0;
  }

  // Get power production multiplier
  getPowerMultiplier(): number {
    return this.state?.power?.productionMultiplier ?? 1.0;
  }

  // Check if a unit can damage another unit
  private canUnitDamage(attacker: UnitState, target: UnitState): boolean {
    // Check if attacker has a weapon
    if (!attacker.weapon) return false;

    // Check if target has armor
    if (!target.armorClass) return true;

    // Check if weapon can damage armor
    const damageMatrix = this.getDamageMatrix();
    const weaponType = attacker.weapon.type;
    const armorClass = target.armorClass;

    return damageMatrix[weaponType]?.[armorClass] !== undefined;
  }

  // Get damage matrix
  private getDamageMatrix(): Record<string, Record<string, number>> {
    return {
      BULLET: { NONE: 1.0, LIGHT: 0.5, MEDIUM: 0.3, HEAVY: 0.15, BUILDING: 0.2 },
      ROCKET: { NONE: 0.4, LIGHT: 1.0, MEDIUM: 0.9, HEAVY: 0.8, BUILDING: 0.5 },
      SHELL: { NONE: 0.5, LIGHT: 0.75, MEDIUM: 1.0, HEAVY: 0.9, BUILDING: 0.7 },
      SIEGE: { NONE: 1.0, LIGHT: 0.5, MEDIUM: 0.35, HEAVY: 0.3, BUILDING: 1.0 },
      FLAME: { NONE: 1.2, LIGHT: 0.7, MEDIUM: 0.3, HEAVY: 0.2, BUILDING: 0.6 },
      SONIC: { NONE: 0.9, LIGHT: 0.8, MEDIUM: 0.8, HEAVY: 0.8, BUILDING: 0.8 },
      EXPLOSIVE: { NONE: 1.0, LIGHT: 1.0, MEDIUM: 1.0, HEAVY: 1.0, BUILDING: 1.3 },
    };
  }

  // Update combat state
  private updateCombat(): void {
    if (!this.state?.units || !this.state?.projectiles) return;

    const units = this.state.units;
    const projectiles = this.state.projectiles;
    const tick = this.tickLoop.getTick();

    // Update projectiles
    for (const projectile of projectiles) {
      if (projectile.targetEntityId) {
        const target = this.entityStore.get(projectile.targetEntityId);
        if (target) {
          projectile.x = target.components.x as number;
          projectile.y = target.components.y as number;
        }
      }

      // Move projectile
      if (projectile.targetTile) {
        const target = projectile.targetTile;
        const dx = target.x - projectile.x;
        const dy = target.y - projectile.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= projectile.speed) {
          // Hit target
          this.applyDamage(projectile);
          this.removeProjectile(projectile.entityId);
        } else {
          projectile.x += (dx / dist) * projectile.speed;
          projectile.y += (dy / dist) * projectile.speed;
        }
      } else {
        // No target, remove projectile
        this.removeProjectile(projectile.entityId);
      }
    }

    // Update units
    for (const unit of units) {
      const entity = this.entityStore.get(unit.entityId);
      if (!entity) continue;

      const x = entity.components.x as number;
      const y = entity.components.y as number;

      // Update attack cooldown
      if (unit.attackCooldown > 0) {
        unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
      }

      // State machine
      switch (unit.state) {
        case 'IDLE': {
          // Find nearest enemy with target priority
          let nearestThreat: EntityId | null = null;
          let nearestThreatDist = Infinity;
          let nearestAllyAttacker: EntityId | null = null;
          let nearestAllyAttackerDist = Infinity;
          let nearestEnemy: EntityId | null = null;
          let nearestEnemyDist = Infinity;

          for (const other of units) {
            if (other.entityId === unit.entityId) continue;
            if (other.faction === unit.faction) continue;

            const otherEntity = this.entityStore.get(other.entityId);
            if (otherEntity) {
              const otherX = otherEntity.components.x as number;
              const otherY = otherEntity.components.y as number;
              const dist = Math.abs(x - otherX) + Math.abs(y - otherY);

              // Check if this enemy can damage us
              const canDamage = this.canUnitDamage(unit, other);

              if (canDamage && dist < nearestThreatDist) {
                nearestThreatDist = dist;
                nearestThreat = other.entityId;
              } else if (!canDamage && dist < nearestAllyAttackerDist) {
                nearestAllyAttackerDist = dist;
                nearestAllyAttacker = other.entityId;
              } else if (dist < nearestEnemyDist) {
                nearestEnemyDist = dist;
                nearestEnemy = other.entityId;
              }
            }
          }

          // Target priority: nearest threat > nearest ally attacker > nearest enemy
          if (nearestThreat && nearestThreatDist <= unit.attackRange) {
            unit.state = 'ATTACK';
            unit.targetEntityId = nearestThreat;
          } else if (nearestThreat && nearestThreatDist <= 20) {
            unit.state = 'MOVE';
            unit.targetTile = { x: x, y: y };
          } else if (nearestAllyAttacker && nearestAllyAttackerDist <= unit.attackRange) {
            unit.state = 'ATTACK';
            unit.targetEntityId = nearestAllyAttacker;
          } else if (nearestAllyAttacker && nearestAllyAttackerDist <= 20) {
            unit.state = 'MOVE';
            unit.targetTile = { x: x, y: y };
          } else if (nearestEnemy && nearestEnemyDist <= unit.attackRange) {
            unit.state = 'ATTACK';
            unit.targetEntityId = nearestEnemy;
          } else if (nearestEnemy) {
            unit.state = 'MOVE';
            unit.targetTile = { x: x, y: y };
          }
          break;
        }

        case 'MOVE': {
          // Check for enemies along the path
          let nearestEnemy: EntityId | null = null;
          let nearestEnemyDist = Infinity;

          for (const other of units) {
            if (other.entityId === unit.entityId) continue;
            if (other.faction === unit.faction) continue;

            const otherEntity = this.entityStore.get(other.entityId);
            if (otherEntity) {
              const otherX = otherEntity.components.x as number;
              const otherY = otherEntity.components.y as number;
              const dist = Math.abs(x - otherX) + Math.abs(y - otherY);

              if (dist < nearestEnemyDist) {
                nearestEnemyDist = dist;
                nearestEnemy = other.entityId;
              }
            }
          }

          // If an enemy is in range, attack it
          if (nearestEnemy && nearestEnemyDist <= unit.attackRange) {
            unit.state = 'ATTACK';
            unit.targetEntityId = nearestEnemy;
          } else if (unit.targetTile) {
            const target = unit.targetTile;
            const dx = target.x - x;
            const dy = target.y - y;
            const dist = Math.abs(dx) + Math.abs(dy);

            if (dist <= unit.moveSpeed) {
              unit.state = 'IDLE';
              unit.targetTile = null;
            } else {
              if (Math.abs(dx) > Math.abs(dy)) {
                entity.components.x = x + Math.sign(dx);
              } else {
                entity.components.y = y + Math.sign(dy);
              }
            }
          }
          break;
        }

        case 'ATTACK': {
          if (unit.targetEntityId) {
            const target = this.entityStore.get(unit.targetEntityId);
            if (target) {
              const targetX = target.components.x as number;
              const targetY = target.components.y as number;
              const dist = Math.abs(x - targetX) + Math.abs(y - targetY);

              if (dist <= unit.attackRange && unit.attackCooldown === 0) {
                // Fire weapon
                this.fireProjectile(unit);
                unit.attackCooldown = unit.attackCooldown;
                unit.lastAttackTick = tick;
              } else if (dist > unit.attackRange) {
                unit.state = 'MOVE';
                unit.targetTile = { x: targetX, y: targetY };
              }
            } else {
              unit.state = 'IDLE';
              unit.targetEntityId = null;
            }
          }
          break;
        }

        case 'FLEE': {
          // Flee from nearest enemy
          let nearestEnemy: EntityId | null = null;
          let nearestDist = Infinity;

          for (const other of units) {
            if (other.entityId === unit.entityId) continue;
            if (other.faction === unit.faction) continue;

            const otherEntity = this.entityStore.get(other.entityId);
            if (otherEntity) {
              const otherX = otherEntity.components.x as number;
              const otherY = otherEntity.components.y as number;
              const dist = Math.abs(x - otherX) + Math.abs(y - otherY);

              if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = other.entityId;
              }
            }
          }

          if (nearestEnemy && nearestDist < 10) {
            // Move away from enemy
            if (nearestEnemy) {
              const target = this.entityStore.get(nearestEnemy);
              if (target) {
                const targetX = target.components.x as number;
                const targetY = target.components.y as number;
                unit.targetTile = {
                  x: x + (x - targetX),
                  y: y + (y - targetY),
                };
              }
            }
          } else {
            unit.state = 'IDLE';
            unit.targetEntityId = null;
          }
          break;
        }

        case 'HARVEST': {
          // Harvester logic is handled in updateEconomy
          break;
        }
      }
    }
  }

  // Fire a projectile from a unit
  private fireProjectile(unit: UnitState): void {
    if (!this.state?.projectiles) return;

    const projectile: ProjectileState = {
      entityId: unit.entityId,
      type: 'projectile',
      x: unit.x,
      y: unit.y,
      targetEntityId: unit.targetEntityId,
      targetTile: null,
      speed: 5,
      damage: 10,
      damageType: 'BULLET',
      travelTime: 0,
      travelDistance: 0,
      friendlyFire: false,
    };

    this.addProjectile(projectile);
  }

  // Apply damage to a target
  private applyDamage(projectile: ProjectileState): void {
    if (!projectile.targetEntityId) return;

    const target = this.entityStore.get(projectile.entityId);
    if (!target) return;

    // Apply damage to entity components
    const currentHp = target.components.hp as number;
    const newHp = Math.max(0, currentHp - projectile.damage);
    target.components.hp = newHp;

    // Check if target is destroyed
    if (newHp === 0) {
      // Remove unit
      this.removeUnit(projectile.entityId);
    }
  }

  // Add a building
  addBuilding(building: BuildingState): void {
    if (!this.state?.buildings) {
      this.state = {
        ...this.state!,
        buildings: [],
      };
    }
    if (this.state && this.state.buildings) {
      this.state.buildings.push(building);
    }
  }

  // Remove a building
  removeBuilding(entityId: EntityId): void {
    if (!this.state?.buildings) return;
    this.state.buildings = this.state.buildings.filter(
      (b) => b.entityId !== entityId
    );
  }

  // Get a building by entity ID
  getBuilding(entityId: EntityId): BuildingState | undefined {
    return this.state?.buildings?.find((b) => b.entityId === entityId);
  }

  // Add a concrete slab
  addConcreteSlab(x: number, y: number, size: '2x2' | '3x3'): void {
    if (!this.state?.buildings) {
      this.state = {
        ...this.state!,
        buildings: [],
      };
    }
    if (this.state && this.state.buildings) {
      const slab: BuildingState = {
        entityId: Date.now() + Math.random(),
        type: size === '2x2' ? 'concrete_slab_2x2' : 'concrete_slab_3x3',
        x,
        y,
        hp: 0,
        maxHp: 0,
        powerDrain: 0,
        powerOutput: 0,
        isPowered: true,
        isSlabbed: true,
        buildProgress: 100,
        buildTime: 1,
        buildCost: size === '2x2' ? 20 : 40,
      };
      this.state.buildings.push(slab);
    }
  }

  // Check if a tile is on a concrete slab
  isTileOnConcrete(x: number, y: number): boolean {
    if (!this.state?.buildings) return false;
    for (const building of this.state.buildings) {
      if (building.isSlabbed) {
        if (building.type === 'concrete_slab_2x2') {
          if (x >= building.x && x < building.x + 2 && y >= building.y && y < building.y + 2) {
            return true;
          }
        } else if (building.type === 'concrete_slab_3x3') {
          if (x >= building.x && x < building.x + 3 && y >= building.y && y < building.y + 3) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Add a unit
  addUnit(unit: UnitState): void {
    if (!this.state?.units) {
      this.state = {
        ...this.state!,
        units: [],
      };
    }
    if (this.state && this.state.units) {
      this.state.units.push(unit);
    }
  }

  // Remove a unit
  removeUnit(entityId: EntityId): void {
    if (!this.state?.units) return;
    this.state.units = this.state.units.filter((u) => u.entityId !== entityId);
  }

  // Get a unit by entity ID
  getUnit(entityId: EntityId): UnitState | undefined {
    return this.state?.units?.find((u) => u.entityId === entityId);
  }

  // Add a projectile
  addProjectile(projectile: ProjectileState): void {
    if (!this.state?.projectiles) {
      this.state = {
        ...this.state!,
        projectiles: [],
      };
    }
    if (this.state && this.state.projectiles) {
      this.state.projectiles.push(projectile);
    }
  }

  // Remove a projectile
  removeProjectile(entityId: EntityId): void {
    if (!this.state?.projectiles) return;
    this.state.projectiles = this.state.projectiles.filter(
      (p) => p.entityId !== entityId
    );
  }

  // Get a projectile by entity ID
  getProjectile(entityId: EntityId): ProjectileState | undefined {
    return this.state?.projectiles?.find((p) => p.entityId === entityId);
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

  // Get the building system
  getBuildingSystem(): BuildingSystem {
    return this.buildingSystem;
  }

  // Get the terrain config
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
  public hash(): string {
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