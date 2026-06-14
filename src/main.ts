// Entry point. Wires the canvas, the game loop, the timer, and the HUD.
//
// This file ships a tiny demo (click N targets as fast as you can) so the
// template deploys to a playable state on day one. REPLACE the gameplay
// section below with your game.

import { SpeedrunTimer } from "speedrungames-sdk/timer";
import { createHUD } from "speedrungames-sdk/hud";
import { createStorage } from "speedrungames-sdk/storage";
import { Sim } from "./sim/index.js";
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

// Create the sim
const sim = new Sim(SIM_CONFIG);
sim.getTickLoop().start();

// Add a few entities to the sim
sim.getEntityStore().create({
  id: 1,
  components: {
    type: "player",
    x: 50,
    y: 50,
    hp: 100,
    maxHp: 100,
  },
});

sim.getEntityStore().create({
  id: 2,
  components: {
    type: "enemy",
    x: 30,
    y: 30,
    hp: 50,
    maxHp: 50,
  },
});

// Add a command to move the player
sim.enqueue({
  tick: 0,
  playerId: 1,
  type: "move",
  args: [60, 60], // target x, y
});

// Render loop: update sim and draw
let lastTime = 0;
const tickInterval = 1000 / SIM_CONFIG.tickRate;

function gameLoop(timestamp: number) {
  const elapsed = timestamp - lastTime;

  if (elapsed >= tickInterval) {
    // Update sim tick
    sim.tick();

    // Get sim state
    const state = sim.getState();
    if (state) {
      // Draw sim state
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas
        ctx.fillStyle = "#0b0b10";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw entities
        for (const entity of state.entities) {
          const x = (entity.components.x as number) * (canvas.width / SIM_CONFIG.mapWidth);
          const y = (entity.components.y as number) * (canvas.height / SIM_CONFIG.mapHeight);
          const size = 10;

          // Draw entity based on type
          if (entity.components.type === "player") {
            ctx.fillStyle = "#00ff00";
            ctx.fillRect(x - size/2, y - size/2, size, size);
          } else if (entity.components.type === "enemy") {
            ctx.fillStyle = "#ff0000";
            ctx.fillRect(x - size/2, y - size/2, size, size);
          }
        }
      }
    }
  }

  lastTime = timestamp;
  requestAnimationFrame(gameLoop);
}

// Start the game loop
requestAnimationFrame(gameLoop);

// ─── End gameplay ───────────────────────────────────────────────────────────