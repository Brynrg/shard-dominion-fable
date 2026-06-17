# Shard Dominion — Final Execution Spec
The authoritative build instruction for the local builder team. Read fully before
touching code. Order: this file -> 01-CONTRACTS -> 02-SLICES -> liveness gate.
The original build package (design docs + balance JSON) and the recovery plan
still stand; this file makes the path from blank screen to playable RTS explicit
and unambiguous, with verification the builder cannot fake.

==============================================================================
## A. Honest scope statement (read this, don't skip)
"Comparable to Dune 2000" is reached in TWO stages:
  - CORE-LOOP PARITY (Slice 6, the v1.0 milestone): a controllable, AI-opposed
    RTS with the D2K loop — harvest economy, base building with power + optional
    concrete, three factions of producible units, rock-paper-scissors combat, fog
    + minimap, win/lose, classic sidebar UI, selection/groups/hotkeys, 4 maps.
    Executed to gate, THIS is "comparable to Dune 2000" in feel and loop.
  - FULL PARITY (P7-P9, original package): carryalls, worms, starport,
    superweapons, full faction depth, the 5-mission campaign, and real art/audio.
This spec gets you to CORE-LOOP PARITY explicitly and verifiably. Full parity is
the original package's later phases, run as more pixel-gated slices on top.

This plan is explicit and complete enough that EACH STEP is unambiguous and
independently verifiable. Whether the end result reaches the bar depends on the
team passing each gate HONESTLY — which the liveness + acceptance gates now force
(you cannot mark a slice done with a blank or fake screen). That is the most a
plan can guarantee; the rest is execution discipline.

==============================================================================
## B. THE FINISH LINE — "Dune 2000 comparable" acceptance checklist (Slice 6)
The operator certifies v1.0 only when ALL of these are true at the live URL,
each proven by the slice's automated acceptance test AND an operator playthrough:

ECONOMY
[ ] Harvesters auto-cycle shard field -> refinery -> credits, visibly, on screen.
[ ] Harvesters are killable and fleeing-when-hit; losing them hurts the economy.
[ ] Storage cap + overflow loss + low/full warnings work.
BASE
[ ] MCV deploys to a Construction Yard.
[ ] Single-thread build queue from the sidebar; placement preview; adjacency rule.
[ ] Power: deficit slows production and disables radar + advanced turret.
[ ] Concrete is OPTIONAL: off-slab buildings spawn at 50% and decay; on-slab full.
[ ] Sell + repair work.
UNITS & COMBAT
[ ] All three factions buildable with their combat-tank variant + shared roster.
[ ] Tech via building upgrades (not a research lab) gates advanced units.
[ ] RPS counters are real and visible: scout>infantry, quad/missile>vehicles,
    siege>infantry/buildings(weak vs tanks), engineer captures buildings.
[ ] Projectiles fly; splash + friendly fire on siege; turrets track.
CONTROL & UI
[ ] Left-click + band-box select; right-click context order; A/S/H stances;
    ctrl-groups 0-9; double-click select-type; shift-queue.
[ ] Sidebar build strip with tabs, queue, cost, progress; credit + power HUD.
[ ] Minimap with fog-aware blips, click-to-jump, attack pings.
WORLD & MATCH
[ ] Fog of war: shroud + persistent-explored; per-unit vision.
[ ] AI opponent that economies, expands, defends, raids, and attacks — fog-honest.
[ ] 3 difficulties via cost-scaling. Win = destroy all enemy buildings. Lose too.
[ ] 4 skirmish maps; setup screen (map/faction/difficulty); results screen.
PROOF
[ ] 50-match headless AI-vs-AI suite: no stalls; each faction wins >=25% per
    pairing; median match 12-25 min.
[ ] Operator plays one full match per faction to a win and a loss without crash.

==============================================================================
## C. The unbreakable rules (process, not negotiable)
1. LIVENESS GATE FIRST. Install tests/liveness/liveness.spec.ts before any code
   change; confirm it FAILS on the current blank build (proves the gate works).
   Nothing is "done" until the relevant gate is green against the DEPLOYED bundle
   (vite build -> vite preview), with a screenshot saved. Vitest does NOT count.
2. PINNED CONTRACTS. 01-CONTRACTS defines the state shape, entity shape, and three
   coordinate spaces. Every file obeys them. The recurring NaN/double-nest/nothing-
   instantiated bugs are ALL contract violations. Do not deviate without an ADR.
3. VERTICAL SLICES. Build sim-piece + wire-into-main + render + input + gate, per
   slice, in order. Never deepen the sim past the current slice. Tag each slice.
4. ONE SLICE AT A TIME, THEN STOP AND SHOW. After each gate, deliver the report +
   screenshot and HALT for operator approval. No batching slices.
5. DATA OVER LITERALS. As each slice touches a system, it reads the balance number
   from data/*.json via a zod loader — never a hardcoded literal.
6. DETERMINISM IS PRIORITY 5. Make it real (Slice 5.5) but never block visible
   progress for it. It is the future-MP foundation, not a ship requirement.

==============================================================================
## D. Per-session verification loop
typecheck -> eslint (sim purity) -> vitest -> `vite build` -> `vite preview` ->
`npm run test:live` (liveness + this slice's acceptance assertions) -> save
screenshot -> (Slice 6+) 20-match balance smoke if data changed -> conventional
commit -> update docs/status.md -> gate report.

GATE REPORT (every slice): slice id | liveness PASS/FAIL + screenshot path | new
acceptance assertions PASS/FAIL | what's visibly new in one line | open questions
| deviations (ADR refs) | next slice plan <=6 lines. A report claiming green with
no passing liveness run + screenshot is auto-rejected.

==============================================================================
## E. Slice index (full specs in 02-SLICES.md)
S0  blank -> alive: render-loop accumulator + entity shape + one harvester moving
S1  economy visible: harvester FSM wired, credits rising, storage HUD
S2  input + selection: click/band-box/right-click -> commands; the "control" half
S3  base building: MCV deploy, queue, placement, concrete, power
S4  units + combat: factions roster, production, projectiles, RPS, victory check
S5  fog + minimap + camera/groups/hotkeys (full control parity)
S5.5 determinism made real (priority 5, can run parallel after S2)
S6  AI opponent + skirmish flow = CORE-LOOP PARITY (v1.0)
[then] original package P7 (worms/carryalls/starport/superweapons/depth) ->
       P8 (campaign) -> P9 (art/audio/balance/ship)
