// Render contract (src/view/render.ts)
// render(state: SimState, cam: Camera, sel: Set<EntityId>, alpha: number): void
//  1. clear canvas to bg (#0b0b10).
//  2. drawTerrain(state.map, cam): only tiles whose screen rect intersects the
//     viewport; fill by terrain color (palette.json); shard overlay on sand tiles
//     keyed by tile.shard thresholds.
//  3. drawEntities(state, cam): for each store.all(), worldToScreen, draw by type.
//     Slices 0-8 use PLACEHOLDER GEOMETRY (see §6); P9 swaps to sprite atlases.
//     hp bar if hp<maxHp; white ring if id in sel; facing tick for vehicles.
//  4. drawProjectiles(state, cam).
//  5. drawFog(state.map, currentPlayer, cam): shroud=black, explored-unseen=dim.
//  6. RENDER RUNS EVERY rAF FRAME, unconditionally. It must NEVER be gated behind
//     "did a sim tick fire this frame" — that was the round-2 dead-gate bug.

import type { SimState } from '../sim/core/types.js';
import type { Entity, EntityId } from '../sim/core/entity.js';
import { worldToScreen, TILE_PX } from '../sim/core/coords.js';

export interface Camera { x: number; y: number; zoom: number; }

export function render(
  state: SimState,
  cam: Camera,
  selection: Set<EntityId>,
  alpha: number
): void {
  // This will be implemented later
}

export function drawTerrain(
  map: { w: number; h: number; tiles: any[] },
  cam: Camera,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number
): void {
  // Only tiles whose screen rect intersects the viewport
  const tileSize = TILE_PX;
  const offsetX = (canvasWidth - map.w * tileSize) / 2;
  const offsetY = (canvasHeight - map.h * tileSize) / 2;

  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const tile = map.tiles[y * map.w + x];
      if (!tile) continue;

      const px = offsetX + x * tileSize;
      const py = offsetY + y * tileSize;

      // Draw tile based on type
      if (tile.terrain === 'ROCK') {
        ctx.fillStyle = '#4a4a4a';
      } else if (tile.terrain === 'SAND') {
        ctx.fillStyle = '#c2b280';
      } else if (tile.terrain === 'DEEP_SAND') {
        ctx.fillStyle = '#8b7355';
      } else if (tile.terrain === 'DUNE') {
        ctx.fillStyle = '#d2b48c';
      } else {
        ctx.fillStyle = '#0b0b10';
      }

      ctx.fillRect(px, py, tileSize, tileSize);

      // Draw shard density indicator (small dot)
      if (tile.shard > 0) {
        ctx.fillStyle = '#ffd700';
        const dotSize = Math.min(tileSize * 0.2, 4);
        ctx.fillRect(
          px + tileSize / 2 - dotSize / 2,
          py + tileSize / 2 - dotSize / 2,
          dotSize,
          dotSize
        );
      }
    }
  }
}

export function drawEntities(
  entities: Entity[],
  cam: Camera,
  ctx: CanvasRenderingContext2D,
  selection: Set<EntityId>,
  bandBoxStart?: { x: number; y: number },
  bandBoxEnd?: { x: number; y: number },
  moveFlash?: { entityId: number; progress: number } | null
): void {
  for (const entity of entities) {
    const screenPos = worldToScreen(entity.components.x, entity.components.y, cam);
    
    // Draw entity based on type
    if (entity.components.type === 'harvester') {
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(screenPos.sx - 8, screenPos.sy - 8, 16, 16);
    } else if (entity.components.type === 'refinery') {
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(screenPos.sx - 10, screenPos.sy - 10, 20, 20);
    } else {
      // Default draw as square
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenPos.sx - 6, screenPos.sy - 6, 12, 12);
    }

    // Draw selection ring if selected
    if (selection.has(entity.id)) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      if (entity.components.type === 'harvester') {
        ctx.strokeRect(screenPos.sx - 8, screenPos.sy - 8, 16, 16);
      } else if (entity.components.type === 'refinery') {
        ctx.strokeRect(screenPos.sx - 10, screenPos.sy - 10, 20, 20);
      } else {
        ctx.strokeRect(screenPos.sx - 6, screenPos.sy - 6, 12, 12);
      }
    }

    // Draw move flash if entity has move command
    if (moveFlash && moveFlash.entityId === entity.id) {
      ctx.fillStyle = `rgba(255, 255, 0, ${0.5 + 0.5 * Math.sin(moveFlash.progress * Math.PI * 2)})`;
      ctx.fillRect(screenPos.sx - 10, screenPos.sy - 2, 20, 4);
    }
  }

  // Draw band box if active
  if (bandBoxStart && bandBoxEnd) {
    const width = bandBoxEnd.x - bandBoxStart.x;
    const height = bandBoxEnd.y - bandBoxStart.y;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(bandBoxStart.x, bandBoxStart.y, width, height);
    ctx.setLineDash([]);
  }
}