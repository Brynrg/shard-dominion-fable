import type { Components } from '../core/entity.js';
import type { Sim } from '../core/sim.js';
import { tileToWorldCenter } from '../core/coords.js';
import type { BuildingState } from '../core/types.js';

export interface BuildingConfig {
  cost: number;
  buildTime: number;
  hp: number;
  footprint: string; // "2x2", "3x3", etc.
  power: number;    // supply (+) or drain (-)
  prereq: string[]; // required building types
}

export interface BuildQueueItem {
  type: string;
  buildProgress: number;
  entityId: number | null; // null while building
}

export class BuildingSystem {
  private sim: Sim;
  private buildingConfigs: Map<string, BuildingConfig>;
  private buildQueue: BuildQueueItem[];
  private maxQueueDepth: number;
  private buildThreadState: {
    current: BuildQueueItem | null;
    remainingProgress: number;
  };

  constructor(sim: Sim) {
    this.sim = sim;
    this.buildingConfigs = new Map();
    this.buildQueue = [];
    this.maxQueueDepth = 5;
    this.buildThreadState = {
      current: null,
      remainingProgress: 0,
    };
    this.loadBuildingConfigs();
  }

  // Load building configurations from buildings.json
  private loadBuildingConfigs(): void {
    // For now, use hardcoded configs that match buildings.json
    this.buildingConfigs.set('construction_yard', {
      cost: 0,
      buildTime: 3,
      hp: 1500,
      footprint: '3x3',
      power: 0,
      prereq: [],
    });
    this.buildingConfigs.set('power_node', {
      cost: 300,
      buildTime: 8,
      hp: 500,
      footprint: '2x2',
      power: 100,
      prereq: ['construction_yard'],
    });
    this.buildingConfigs.set('refinery', {
      cost: 1600,
      buildTime: 20,
      hp: 900,
      footprint: '3x3',
      power: -30,
      prereq: ['power_node'],
    });
    this.buildingConfigs.set('silo', {
      cost: 150,
      buildTime: 5,
      hp: 300,
      footprint: '1x1',
      power: -5,
      prereq: ['refinery'],
    });
    this.buildingConfigs.set('barracks', {
      cost: 300,
      buildTime: 10,
      hp: 600,
      footprint: '2x2',
      power: -10,
      prereq: ['power_node'],
    });
  }

  // Add a building to the construction queue
  addToQueue(buildingType: string): boolean {
    if (this.buildQueue.length >= this.maxQueueDepth) {
      return false; // Queue full
    }
    
    if (!this.buildingConfigs.has(buildingType)) {
      return false; // Unknown building type
    }

    // Check prerequisites
    const config = this.buildingConfigs.get(buildingType)!;
    if (!this.hasPrerequisites(buildingType)) {
      return false;
    }

    // Check if player has enough credits
    if (!this.hasEnoughCredits(buildingType)) {
      return false;
    }

    // Add to queue
    this.buildQueue.push({
      type: buildingType,
      buildProgress: 0,
      entityId: null,
    });

    return true;
  }

  // Check if prerequisites are met for a building type
  private hasPrerequisites(buildingType: string): boolean {
    const config = this.buildingConfigs.get(buildingType);
    if (!config) return false;

    for (const prereq of config.prereq) {
      // Check if player has at least one of each prerequisite building
      const hasPrereq = this.sim.getEntityStore().all().some(
        entity => entity.components.type === prereq && entity.components.building?.buildProgress === 1
      );
      if (!hasPrereq) return false;
    }
    return true;
  }

  // Check if player has enough credits for a building
  private hasEnoughCredits(buildingType: string): boolean {
    const config = this.buildingConfigs.get(buildingType);
    if (!config) return false;

    const state = this.sim.getState();
    if (!state) return false;

    const credits = state.players?.[0]?.credits || 0;
    return credits >= config.cost;
  }

  // Update the build thread and queue
  update(): void {
    // Update current building in progress
    if (this.buildThreadState.current) {
      this.updateCurrentBuilding();
    } else if (this.buildQueue.length > 0) {
      // Start next building in queue
      this.startNextBuilding();
    }
  }

  private updateCurrentBuilding(): void {
    const current = this.buildThreadState.current;
    if (!current || !current.entityId) return;

    const entity = this.sim.getEntityStore().get(current.entityId);
    if (!entity || !entity.components.building) return;

    const building = entity.components.building;
    const config = this.buildingConfigs.get(current.type);
    if (!config) return;

    // Build 1 unit per tick
    const buildSpeed = 1 / config.buildTime; // units per tick
    building.buildProgress = Math.min(1, building.buildProgress + buildSpeed);

    // Check if building is complete
    if (building.buildProgress >= 1) {
      building.buildProgress = 1;
      this.buildThreadState.current = null;
    }
  }

  private startNextBuilding(): void {
    if (this.buildQueue.length === 0) return;

    const next = this.buildQueue[0];
    const config = this.buildingConfigs.get(next.type);
    if (!config) return;

    // Deduct cost
    this.deductCredits(config.cost);

    // Create the building entity
    const worldPos = tileToWorldCenter(20, 20); // Default position
    const entityId = this.sim.getEntityStore().create({
      type: next.type,
      owner: 0,
      x: worldPos.x,
      y: worldPos.y,
      hp: Math.floor(config.hp * 0.5), // Start with 50% HP when placed
      maxHp: config.hp,
      building: {
        onSlab: false,
        buildProgress: 0,
        upgraded: false,
        powerDrain: config.power,
        powerOutput: config.power > 0 ? config.power : 0,
        isPowered: false,
        hpDecayRate: 0,
      },
    });

    next.entityId = entityId;
    this.buildThreadState.current = next;
    this.buildQueue.shift(); // Remove from queue
  }

  private deductCredits(amount: number): void {
    const state = this.sim.getState();
    if (!state || !state.players) return;
    
    state.players[0].credits = (state.players[0].credits || 0) - amount;
  }

  // Get the build queue status
  getQueueStatus(): BuildQueueItem[] {
    return [...this.buildQueue];
  }

  // Check if a tile can be built on (terrain + footprint + adjacency)
  canBuildOnTile(tx: number, ty: number, buildingType: string): { canBuild: boolean; reason: string } {
    const config = this.buildingConfigs.get(buildingType);
    if (!config) return { canBuild: false, reason: 'Unknown building type' };

    // Check if tile is terrain-compatible and within map bounds
    const state = this.sim.getState();
    if (!state) return { canBuild: false, reason: 'No map state' };

    const map = state.map;
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) {
      return { canBuild: false, reason: 'Out of bounds' };
    }

    const tile = map.tiles[ty * map.w + tx];
    if (!tile) return { canBuild: false, reason: 'No tile' };

    // Check terrain type (for now, allow all terrain except CLIFF)
    if (tile.terrain === 'CLIFF') {
      return { canBuild: false, reason: 'CLIFF terrain' };
    }

    // Check footprint collision
    if (!this.isFootprintClear(tx, ty, config.footprint)) {
      return { canBuild: false, reason: 'Footprint occupied' };
    }

    // Check adjacency to ConYard (within 12 tiles)
    if (!this.isNearConYard(tx, ty)) {
      return { canBuild: false, reason: 'Too far from ConYard' };
    }

    return { canBuild: true, reason: '' };
  }

  // Check if footprint area is clear
  private isFootprintClear(tx: number, ty: number, footprint: string): boolean {
    const [w, h] = footprint.split('x').map(Number);
    
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const checkX = tx + dx;
        const checkY = ty + dy;
        
        // Check if this tile would overlap with existing buildings
        const overlaps = this.sim.getEntityStore().all().some(entity => {
          if (!entity.components.building) return false;
          if (entity.components.building.buildProgress < 1) return false;
          
          const buildingX = Math.floor(entity.components.x / 256);
          const buildingY = Math.floor(entity.components.y / 256);
          const buildingFootprint = this.getBuildingFootprint(entity.components.type);
          const [bw, bh] = buildingFootprint.split('x').map(Number);
          
          return checkX >= buildingX && checkX < buildingX + bw &&
                 checkY >= buildingY && checkY < buildingY + bh;
        });
        
        if (overlaps) return false;
      }
    }
    return true;
  }

  // Check if tile is within 12 tiles of ConYard
  private isNearConYard(tx: number, ty: number): boolean {
    const conYardX = 20; // ConYard starts at tile 20,20
    const conYardY = 20;
    const distance = Math.abs(tx - conYardX) + Math.abs(ty - conYardY);
    return distance <= 12;
  }

  // Get building footprint from type
  private getBuildingFootprint(type: string): string {
    const config = this.buildingConfigs.get(type);
    return config?.footprint || '1x1';
  }

  // Place a building at a specific tile location
  placeBuilding(buildingType: string, tx: number, ty: number): boolean {
    const { canBuild, reason } = this.canBuildOnTile(tx, ty, buildingType);
    if (!canBuild) return false;

    const config = this.buildingConfigs.get(buildingType);
    if (!config) return false;

    // Create building at tile location
    const worldPos = tileToWorldCenter(tx, ty);
    
    // Check if on slab
    const isOnSlab = this.sim.isTileOnConcrete(tx, ty);
    
    const entityId = this.sim.getEntityStore().create({
      type: buildingType,
      owner: 0,
      x: worldPos.x,
      y: worldPos.y,
      hp: isOnSlab ? config.hp : Math.floor(config.hp * 0.5),
      maxHp: config.hp,
      building: {
        onSlab: isOnSlab,
        buildProgress: 1, // Instant placement for now
        upgraded: false,
        powerDrain: config.power,
        powerOutput: config.power > 0 ? config.power : 0,
        isPowered: false,
        hpDecayRate: isOnSlab ? 0 : 0.1, // 0.1 HP per tick when off-slab
      },
    });

    return true;
  }

  // Sell a building for 50% refund
  sellBuilding(entityId: number): boolean {
    const entity = this.sim.getEntityStore().get(entityId);
    if (!entity || !entity.components.building) return false;

    const config = this.buildingConfigs.get(entity.components.type);
    if (!config) return false;

    // Calculate refund (50% of cost)
    const refund = Math.floor(config.cost * 0.5);
    
    // Add refund to player credits
    const state = this.sim.getState();
    if (state && state.players) {
      state.players[0].credits = (state.players[0].credits || 0) + refund;
    }

    return true;
  }

  // Repair a building
  repairBuilding(entityId: number, amount: number): boolean {
    const entity = this.sim.getEntityStore().get(entityId);
    if (!entity || !entity.components.building) return false;

    const currentHp = entity.components.hp || 0;
    const maxHp = entity.components.maxHp || 0;
    const newHp = Math.min(maxHp, currentHp + amount);
    
    entity.components.hp = newHp;
    return true;
  }

  // Get building configuration
  getBuildingConfig(buildingType: string): BuildingConfig | undefined {
    return this.buildingConfigs.get(buildingType);
  }
}