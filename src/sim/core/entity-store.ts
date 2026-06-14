// Entity store: SoA component storage

import type { Entity, EntityId } from './types.js';

export class EntityStore {
  private entities: Map<EntityId, Entity> = new Map();
  private nextId: EntityId = 0;

  // Create a new entity
  create(components: Record<string, unknown> = {}): EntityId {
    const id = this.nextId++;
    this.entities.set(id, { id, components });
    return id;
  }

  // Get an entity by ID
  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  // Check if an entity exists
  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  // Update an entity's components
  update(id: EntityId, components: Partial<Record<string, unknown>>): void {
    const entity = this.entities.get(id);
    if (entity) {
      this.entities.set(id, { ...entity, components });
    }
  }

  // Delete an entity
  delete(id: EntityId): void {
    this.entities.delete(id);
  }

  // Get all entities
  getAll(): Entity[] {
    return Array.from(this.entities.values());
  }

  // Get all entity IDs
  getIds(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  // Clear all entities
  clear(): void {
    this.entities.clear();
    this.nextId = 0;
  }
}