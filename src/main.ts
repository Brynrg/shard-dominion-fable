// Entry point. Wires the canvas, the game loop, the timer, and the HUD.
//
// This file ships a tiny demo (click N targets as fast as you can) so the
// template deploys to a playable state on day one. REPLACE the gameplay
// section below with your game.

import { SpeedrunTimer } from "speedrungames-sdk/timer";
import { createHUD } from "speedrungames-sdk/hud";
import { createStorage } from "speedrungames-sdk/storage";
import { Sim } from "./sim/index.js";
import { tileToWorldCenter } from "./sim/core/coords.js";
import { drawTerrain, drawEntities } from "./view/render.js";
import type { Camera } from "./view/render.js";
import "./styles.css";

// Must match game.manifest.json#slug. `pnpm new:game` substitutes this.
const SLUG: string = "shard-dominion-fable";
const UNSET_SLUG = "__SLUG__";

// eslint-disable-next-line no-undef
const root = document.getElementById("app");
if (!root) throw new Error("#app element missing in index.html");

// eslint-disable-next-line no-undef
const canvas = document.createElement("canvas");
canvas.className = "game-canvas";
// Set canvas size
canvas.width = 800;
canvas.height = 600;
root.appendChild(canvas);

const hud = createHUD(root);
const timer = new SpeedrunTimer();
const storage = createStorage(SLUG === UNSET_SLUG ? "template-demo" : SLUG);

const pb = storage.getPB();
hud.setPB(pb?.ms ?? null);
hud.setStatus("Click anywhere to start");

timer.subscribe((ms, state) => hud.setTime(ms, state));

// ─── Gameplay (replace this section) ───────────────────────────────────────

// Sim config: 20Hz tick, 100x100 map, seed for determinism
const SIM_CONFIG = {
  tickRate: 20,
  mapWidth: 100,
  mapHeight: 100,
  seed: 12345,
};

// Camera for rendering
const camera: Camera = { x: 0, y: 0, zoom: 1 };
const selection = new Set<number>();

// Create the sim
const sim = new Sim(SIM_CONFIG);
sim.getTickLoop().start();

// Add entities to the sim
const refPos = tileToWorldCenter(20, 20);
const ref = sim.getEntityStore().create({
  type: 'refinery',
  owner: 0,
  x: refPos.x,
  y: refPos.y,
  hp: 900,
  maxHp: 900,
  building: { onSlab: true, buildProgress: 1, upgraded: false, powerDrain: 30 }
});

const hvPos = tileToWorldCenter(40, 40);
const hv = sim.getEntityStore().create({
  type: 'harvester',
  owner: 0,
  x: hvPos.x,
  y: hvPos.y,
  hp: 700,
  maxHp: 700,
  harvester: { state: 'SEEK', load: 0, refineryId: ref }
});

// sim.enqueue({tick:1,playerId:0,type:'move',args:{ids:[hv],tx:30,ty:30}});  // temporary, proves motion
sim.enqueue({ tick: 1, playerId: 0, type: 'move', args: [hv, 30, 30] });  // temporary, proves motion

// Render loop: update sim and draw
let lastTime = 0;
const tickInterval = 1000 / SIM_CONFIG.tickRate;

// Selection state
let isBandBoxing = false;
let bandBoxStart = { x: 0, y: 0 };
let bandBoxEnd = { x: 0, y: 0 };
let moveFlash: { entityId: number; progress: number } | null = null;

function worldToScreen(x: number, y: number, cam: Camera) {
  const TILE_PX = 32;
  return { 
    sx: (x / 256 * TILE_PX - cam.x) * cam.zoom,
    sy: (y / 256 * TILE_PX - cam.y) * cam.zoom
  };
}

function screenToWorld(sx: number, sy: number, cam: Camera) {
  const TILE_PX = 32;
  return { 
    tx: Math.floor((sx / cam.x + sx) * 256 / TILE_PX),
    ty: Math.floor((sy / cam.y + sy) * 256 / TILE_PX)
  };
}

function handleCanvasClick(event: Event, isRightClick: boolean = false) {
  const canvas = event.target as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  if (event.shiftKey) {
    // Queue command for selected units
    const tx = Math.floor(clickX / 32);
    const ty = Math.floor(clickY / 32);
    
    for (const entityId of selection) {
      sim.enqueue({ tick: 1, playerId: 0, type: 'move', args: [entityId, tx, ty] });
    }
  } else if (isRightClick) {
    // Right click: classify and enqueue command
    const tx = Math.floor(clickX / 32);
    const ty = Math.floor(clickY / 32);
    
    if (selection.size > 0) {
      // Enqueue move command for selected units
      for (const entityId of selection) {
        sim.enqueue({ tick: 1, playerId: 0, type: 'move', args: [entityId, tx, ty] });
      }
      // Set move flash for one of the units
      if (selection.size > 0) {
        moveFlash = { entityId: Array.from(selection)[0], progress: 0 };
      }
    }
  } else {
    // Left click: selection
    if (event.detail === 1) {
      // Single click - select/deselect unit
      const hoveredEntity = findEntityAtScreenPos(clickX, clickY);
      if (hoveredEntity !== null) {
        if (selection.has(hoveredEntity)) {
          selection.delete(hoveredEntity);
        } else {
          selection.add(hoveredEntity);
        }
      } else {
        // Click on empty space - start band box
        isBandBoxing = true;
        bandBoxStart = { x: clickX, y: clickY };
        bandBoxEnd = { x: clickX, y: clickY };
      }
    } else if (event.detail === 2) {
      // Double click - select same type
      const hoveredEntity = findEntityAtScreenPos(clickX, clickY);
      if (hoveredEntity !== null) {
        const entityType = sim.getEntityStore().get(hoveredEntity)?.components.type;
        if (entityType) {
          // Clear selection and select all units of same type
          selection.clear();
          for (const entity of sim.getEntityStore().all()) {
            if (entity.components.type === entityType) {
              selection.add(entity.id);
            }
          }
        }
      }
    }
  }
}

function findEntityAtScreenPos(sx: number, sy: number): number | null {
  for (const entity of sim.getEntityStore().all()) {
    const screenPos = worldToScreen(entity.components.x, entity.components.y, camera);
    const entitySize = 16; // harvester/refinery size
    if (Math.abs(screenPos.sx - sx) < entitySize && Math.abs(screenPos.sy - sy) < entitySize) {
      return entity.id;
    }
  }
  return null;
}

function gameLoop(timestamp: number) {
  const elapsed = timestamp - (lastTime || 0);

  // Update sim tick
  if (elapsed >= tickInterval) {
    sim.tick();
    lastTime = timestamp;
    
    // Update move flash
    if (moveFlash) {
      moveFlash.progress += 0.1;
      if (moveFlash.progress >= 1) {
        moveFlash = null;
      }
    }
  }

  // Get sim state
  const state = sim.getState();
  if (state) {
    // Draw sim state using render contract
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Clear canvas
      ctx.fillStyle = "#0b0b10";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw terrain using the contract
      drawTerrain(state.map, camera, ctx, canvas.width, canvas.height);

      // Draw entities using the contract
      drawEntities(sim.getEntityStore().all(), camera, ctx, selection, isBandBoxing ? bandBoxStart : undefined, isBandBoxing ? bandBoxEnd : undefined, moveFlash || undefined);
    }
  }

  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Add event listeners for input
if (canvas) {
  canvas.addEventListener('click', (e) => handleCanvasClick(e));
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Left mouse button
      const rect = canvas.getBoundingClientRect();
      bandBoxStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      bandBoxEnd = { x: bandBoxStart.x, y: bandBoxStart.y };
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isBandBoxing) {
      const rect = canvas.getBoundingClientRect();
      bandBoxEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0 && isBandBoxing) {
      // Finish band box selection
      const entitiesInBandBox = findEntitiesInBandBox(
        Math.min(bandBoxStart.x, bandBoxEnd.x),
        Math.min(bandBoxStart.y, bandBoxEnd.y),
        Math.max(bandBoxStart.x, bandBoxEnd.x),
        Math.max(bandBoxStart.y, bandBoxEnd.y)
      );
      
      // Add entities to selection (don't clear first)
      for (const entityId of entitiesInBandBox) {
        selection.add(entityId);
      }
      
      isBandBoxing = false;
    }
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleCanvasClick(e, true);
  });
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
  // Number keys 0-9 for selection
  if (e.key >= '0' && e.key <= '9') {
    if (e.ctrlKey) {
      // Ctrl+0-9: assign control group
      // This would normally store selection in controlGroups[index]
    } else {
      // 0-9: select control group  
      // This would normally load from controlGroups[index]
    }
  } else {
    switch (e.key.toLowerCase()) {
      case 'a':
        // Attack move
        if (selection.size > 0) {
          // Find all entities under shift + click
          // For now, just move to mouse position
          const tx = Math.floor(bandBoxEnd.x / 32);
          const ty = Math.floor(bandBoxEnd.y / 32);
          for (const entityId of selection) {
            sim.enqueue({ tick: 1, playerId: 0, type: 'move', args: [entityId, tx, ty] });
          }
        }
        break;
      case 's':
        // Stop command
        if (selection.size > 0) {
          for (const entityId of selection) {
            sim.enqueue({ tick: 1, playerId: 0, type: 'stop', args: [entityId] });
          }
        }
        break;
    }
  }
});

function findEntitiesInBandBox(minX: number, minY: number, maxX: number, maxY: number): number[] {
  const entities: number[] = [];
  const entitySize = 16;
  
  for (const entity of sim.getEntityStore().all()) {
    const screenPos = worldToScreen(entity.components.x, entity.components.y, camera);
    if (screenPos.sx > minX - entitySize && screenPos.sx < maxX + entitySize &&
        screenPos.sy > minY - entitySize && screenPos.sy < maxY + entitySize) {
      entities.push(entity.id);
    }
  }
  return entities;
}

// Expose debug hooks for liveness tests
if (typeof import.meta !== 'undefined') {
  (window as any).__debugEntityScreenPos = (id: number) => {
    const entity = sim.getEntityStore().get(id);
    if (!entity) return null;
    
    const screenPos = worldToScreen(entity.components.x, entity.components.y, camera);
    return { sx: screenPos.sx, sy: screenPos.sy };
  };

  (window as any).__debugSelectionCount = () => {
    return selection.size;
  };
}

// ─── End gameplay ───────────────────────────────────────────────────────────