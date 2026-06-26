// Core entity contracts (the anti-bug bedrock)

export type EntityId = number;
export type TilePt = { tx: number; ty: number };

export interface Components {
  type: string;          // 'harvester' | 'refinery' | 'combat_tank_v' | ...
  owner: number;         // player id; -1 = neutral
  x: number; y: number;  // WORLD units (see §3). NEVER tile or pixel here.
  facing?: number;       // 0..15 (16ths of a turn)
  hp?: number; maxHp?: number; armor?: string;   // 'NONE'|'LIGHT'|'MEDIUM'|'HEAVY'|'BUILDING'
  movable?:   { speed: number; path: TilePt[]; pathIdx: number; stuck: number };
  harvester?: { state: 'SEEK'|'HARVEST'|'RETURN'|'DOCK'; load: number;
                fieldTarget?: TilePt; refineryId?: EntityId };
  building?:  { onSlab: boolean; buildProgress: number; upgraded: boolean; powerDrain: number;
                powerOutput?: number; isPowered?: boolean; hpDecayRate?: number };
  producer?:  { queue: string[]; progress: number; rally?: TilePt };
  attacker?:  { weaponId: string; cooldown: number; targetId?: EntityId; stance: 'AGGRESSIVE'|'GUARD'|'HOLD' };
  vision?:    { range: number };
  [key: string]: unknown; // Index signature for compatibility
}

export interface Entity {
  id: EntityId;
  components: Components;
}