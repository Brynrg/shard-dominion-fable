// Entity store: the entity shape enforcer

import type { Entity, EntityId, Components } from './entity.js';

export class EntityStore {
  private entities: Map<EntityId, Entity> = new Map();
  private nextId: EntityId = 0;

  // CORRECT: const id = store.create({ type:'harvester', owner:0, x:40*256, y:40*256, hp:700, maxHp:700, harvester:{state:'SEEK',load:0} });
  //          const e = store.get(id); e.components.x   // defined
  // WRONG (the round-2 bug): store.create({ id:1, components:{...} })  // double-nests
  // Invariant test (Slice 0): after the CORRECT call, store.get(id)!.components.x === 40*256.

  create(c: Components): EntityId {
    const id = this.nextId++;
    this.entities.set(id, { id, components: c });
    return id;
  }

  // Get an entity by ID
  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  // CORRECT: const e = store.get(id); e.components.x defined
  getComponents(id: EntityId): Components | undefined {
    const entity = this.entities.get(id);
    return entity?.components;
  }

  // Check if an entity exists
  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  // Update an entity's components
  update(id: EntityId, components: Partial<Components>): void {
    const entity = this.entities.get(id);
    if (entity) {
      this.entities.set(id, { ...entity, components: { ...entity.components, ...components } });
    }
  }

  // Delete an entity
  delete(id: EntityId): void {
    this.entities.delete(id);
  }

  // Get all entities
  all(): Entity[] {  // ascending id order (deterministic iteration)
    return Array.from(this.entities.values()).sort((a, b) => a.id - b.id);
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