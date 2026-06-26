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

function worldToScreen(x: number, y: number, cam: Camera) {
  const TILE_PX = 32;
  return { 
    sx: (x / 256 * TILE_PX - cam.x) * cam.zoom,
    sy: (y / 256 * TILE_PX - cam.y) * cam.zoom
  };
}

function gameLoop(timestamp: number) {
  const elapsed = timestamp - (lastTime || 0);

  // Update sim tick
  if (elapsed >= tickInterval) {
    sim.tick();
    lastTime = timestamp;
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
      drawEntities(sim.getEntityStore().all(), camera, ctx, selection);
    }
  }

  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// Expose debug hooks for liveness tests
if (typeof import.meta !== 'undefined') {
  (window as any).__debugEntityScreenPos = (id: number) => {
    const entity = sim.getEntityStore().get(id);
    if (!entity) return null;
    
    const screenPos = worldToScreen(entity.components.x, entity.components.y, camera);
    return { sx: screenPos.sx, sy: screenPos.sy };
  };
}

// ─── End gameplay ───────────────────────────────────────────────────────────