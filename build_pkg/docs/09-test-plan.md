# 09 — Test Plan
All sim tests are vitest, headless, deterministic. View layer is operator-smoke
only. Every phase gate references suites here.

## Always-on suites (run on every commit from the phase that introduces them)
- DETERMINISM: same seed + command script, 2 runs, hash every 100 ticks for
  5000 ticks -> identical. Run for: empty map, economy scenario, full battle,
  AI-vs-AI. THE most important test in the project.
- SERIALIZATION: run 2000 ticks -> serialize -> deserialize -> run both originals
  and clone 1000 more ticks -> hashes identical.
- SCHEMA: every /data JSON validates against its zod schema; cross-refs resolve
  (every weaponId, prereq, unitId exists); damage matrix complete (every
  weaponType x armorClass pair present).
- PERF BENCH: scripted 200-unit brawl, 1000 ticks; assert p95 tick time within
  budget (01 §perf). Record trend in bench.json; >20% regression = failure.

## Per-system invariant tests (selected; agent expands)
- Economy: 3 harvesters, known field, tick N -> credits EXACTLY equal expected
  for the seed. Overflow: full storage -> income lost, credits never exceed cap.
  Drip-spend: 0 credits pauses (not cancels) production.
- Concrete: off-slab building spawns 50%, repair to 80% -> decays to 50% and
  stops. On-slab spawns 100%, no decay. Damaged power node outputs hp-ratio power.
- Power: kill a node -> production multiplier and turret/radar offline flags
  flip correctly at the exact threshold tick.
- Combat: cost-equal scripted fights assert the counter matrix: 700cr quads beat
  700cr combat tank; scout pack beats infantry pack; siege tanks lose to combat
  tanks; missile tank kills carryall.
- Pathfinding: corridor congestion (40 units through 2-wide gap) all arrive
  < 60 sim-sec, zero stuck; blocked destination -> nearest-free-tile spread;
  infantry-only trail rejects vehicles.
- Fog-honest AI: instrument AI reads; any access to entity outside its vision
  set = failure (wrap AI's world view in a guarded accessor).
- Worms: vibration targeting picks thumper over harvester; 3 swallows -> despawn;
  never leaves sand. Blooms: density never exceeds 1000; regen only via blooms.
- Capture: engineer math at the 33% boundary (>, =, < cases).
- Starport: price walk stays in [0.65,1.35]; identical across players same tick.

## Balance harness (tools/balance_run.ts, used from P6)
`npm run balance -- --matches 50 --matchup all --difficulty normal` -> AI-vs-AI
batch; outputs per-matchup win rates, median length, avg army composition.
Gates: each faction >= 25% wins per pairing; median length 12-25 min; no matchup
> 70/30. Any data/*.json balance change MUST re-run a 20-match smoke before commit.

## Operator smoke checklists (docs/smoke/phase-N.md, agent authors per phase)
Short numbered manual scripts ("place refinery off-slab, watch decay to 50%...")
the operator runs at each gate. Keep each under 15 steps.
