# 10 — Phase Plan
Gate = all listed suites green + operator smoke + operator approval recorded in
docs/adr/phase-N-gate.md. No phase N+1 work before approval. Tag repo phase-N.

## P0 — Scaffold + Sim Core
Vite+TS strict+Phaser+vitest+eslint(sim purity)+CI script. Sim core: tick loop,
command queue, SoA entity store, mulberry32, fixedpoint helpers, FNV hash,
serialize/deserialize, headless CLI (`npm run simulate -- --seed --ticks
--scenario`). View: camera (pan/zoom/edge), procedural placeholder renderer,
debug spawn/move via keyboard.
GATE: determinism + serialization suites green; 50 placeholder units order-moved
on screen at 60fps.

## P1 — Terrain / Fog / Pathfinding
Tiled JSON loader, tile types incl. infantry trails, A* + binary heap, group
moves, spatial hash collision, stuck repath, shroud/explored fog, per-entity
vision, minimap-less debug fog render. Author map 1 ("Crossing").
GATE: pathfinding suite + perf bench (80 units cross map, budget) + fog tests.

## P2 — Economy
Harvester FSM, shard density + depletion, refinery docking, storage + overflow,
drip-spend credit ledger. Scenario: 3-harvester economy 10 sim-min exact-credits.
GATE: economy suite green; operator watches autonomous loop.

## P3 — Base Building / Power / Concrete
MCV deploy, placement rules + preview, single-thread ConYard queue, slabs +
decay, power ledger + deficit effects, sell/repair, walls.
GATE: concrete/power suites; operator builds a full base by hand.

## P4 — Units / Production / Combat
Load full data/units.json + weapons.json. Producer queues + rally, projectiles +
splash + friendly fire, turret tracking, stances, attack-move, target priority,
harvester flee, engineer capture, deaths/cleanup, victory check.
GATE: combat counter-matrix suite; scripted 2-base battle runs headless to a
winner; operator fights a manual battle.

## P5 — UI / Controls (full 06 spec)
Sidebar, minimap, selection system, control groups, hotkeys, cursors, HUD bars,
event pings, stub audio cues, menus (main/skirmish setup/pause/results).
GATE: hotkey parity checklist 100%; operator plays a full manual match vs a
dummy (P4 scripted) opponent; smoke checklist clean.

## P6 — AI / Skirmish == v1.0 SHIP
Full 05 spec: governor, build director + 2 openings/faction, battle commander
FSM, threat map, fog-honest accessor, difficulty scaling. 3 more maps. Skirmish
flow end-to-end + win/lose screens. Balance harness.
GATE: 50-match suite (no stalls, win-rate + length gates); fog-honest test;
operator plays 3 matches (1/faction) and approves SHIP.

## P7 — Faction Depth / Air / Threats (v1.1)
Building upgrades, all faction uniques + tier 3 + superweapons, air movement +
AA, Airfield/strike sorties, Carryall logistics, Repair Pad flow, Starport
market, worms + thumpers, blooms, stealth/detection.
GATE: asymmetry scenario suite (each faction signature strat wins its script);
worm/bloom/starport suites; rebalanced 50-match run; operator feel review.

## P8 — Campaign (v1.2a)
Mission schema runtime (objectives, triggers, reinforcements, scripted AI
overrides), briefing scene, save/load UI, results/score. Implement 5 missions
from data/campaign/. Concordat reskin faction.
GATE: all missions completable on all difficulties (headless scripted-player
where feasible + operator playthrough); save/load mid-mission hash test.

## P9 — Art / Audio / Balance / Ship (v1.2)
Blender model scripts for full sprite manifest, render+outline+atlas pipeline,
swap renderer to atlases (placeholder mode kept behind a flag), damage states,
effects, audio per 08, music, settings menu, speedrungames.net embed build
(static dist/, no server dependency), final balance passes via harness.
GATE: art pipeline reproducibility hash; 60fps/200-unit bench in browser;
full regression suites; operator release sign-off.
