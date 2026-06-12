# 02 — Mechanics Specification
All numbers here are DEFAULTS; the JSON in /data is authoritative. Times in seconds
(sim converts to ticks at 20/s). Costs in credits (cr).

## 2.1 Terrain
Tile types (data/terrain.json):
- ROCK: buildable, all ground units, worm-immune. Move cost 1.0.
- SAND: harvestable (carries shard density 0-1000 per tile), worms can attack here.
  Not buildable. Move cost 1.0.
- DEEP_SAND: as SAND, denser fields spawn here, worm spawn region. Move cost 1.25.
- DUNE: passable, move cost 1.6, blocks building, +1 vision when standing on it.
- CLIFF/ROCK_WALL: impassable, blocks LOS.
Infantry-only passages: narrow cliff trails flagged infantryOnly=true (vehicles
cannot path through). Gives infantry a map role beyond cheapness.

## 2.2 Economy
- Shard fields: per-tile density 0-1000. Harvester extracts 25 density/sec while
  parked on a tile, converted at 1 density = 1 cr of load. Tile visually thins at
  <500 and <150 thresholds.
- Harvester: capacity 700 cr. FSM: SEEK (densest known reachable tile, prefers
  assigned field) -> HARVEST -> RETURN (nearest friendly refinery with free dock)
  -> DOCK (unload 100 cr/sec) -> repeat. Player can redirect; manual orders stick
  until completed, then FSM resumes.
- Refinery: stores 2000 cr. Comes with 1 free Harvester delivered on build complete
  (and 1 free Carryall in v1.1+). Silo: +1500 cr storage.
- OVERFLOW RULE: income beyond total storage is LOST. UI: storage bar + flashing
  warning + audio cue at 90%.
- Credits SPEND from storage in real time as construction/production progresses
  (Westwood drip model): queue items consume cr/sec proportional to build speed;
  if credits hit 0, all progress pauses (does not cancel).

## 2.3 Concrete (Foundation Slabs)
- Slab 2x2: 20 cr, builds in 1s, placed like a building on ROCK only.
  Upgraded ConYard unlocks Slab 3x3: 40 cr.
- Building placed with full footprint on slabs: spawns at 100% HP, no decay.
- Building with ANY footprint tile off-slab: spawns at 50% maxHp and DECAYS back
  toward 50% at 1 hp/sec whenever repaired above it. Repair can hold it above 50%
  only while actively paying repair costs.
- Damaged Power Nodes output power proportional to hp/maxHp (this makes slabbing
  power the canonical strong opening; everything else is a judgment call).
- Slabs take 75% reduced damage from everything; destroyed slab tiles revert.

## 2.4 Power
- Power Node: +100 power. Building powerDrain values in data/buildings.json.
- supply >= demand: normal. Deficit: production speed multiplier =
  max(0.4, supply/demand) applied to ALL construction and unit production;
  Radar offline (minimap blips lost, AI superweapon warnings lost);
  Rocket Turret and faction advanced defenses OFFLINE; basic Gun Turret keeps
  working (it is the no-power fallback).
- Low-power state is visible to enemies who have radar: base lights dim (view-only
  effect, but a scouting reward).

## 2.5 Construction & Base Building
- MCV (vehicle) deploys (needs 3x3 ROCK clear) -> Construction Yard. Undeploy NOT
  allowed (classic). Losing all ConYards with no MCV = no new buildings (sell/
  starport may still function) — legitimate loss spiral, AI exploits it.
- SINGLE construction thread per ConYard: one building at a time, sidebar queue
  up to 5. Build time/cost in data/buildings.json. When complete, player places it:
  must touch (8-neighborhood) an existing friendly building footprint, range max
  12 tiles from a ConYard, on valid terrain. Placement preview shows slab coverage
  green/yellow/red per tile.
- Sell building: returns 50% of cost, 3s demolition, spawns 1-2 Light Infantry
  (defenders escaping).
- Repair: toggle per building, costs 0.3 cr per hp, 20 hp/sec.
- Walls: 50 cr/segment, block ground movement and direct-fire projectiles, immune
  to bullets, damaged only by shells/rockets/explosive. No slab needed.

## 2.6 Production
- Producer buildings each run ONE queue (Barracks=infantry, Light Factory=light
  vehicles, Heavy Factory=tanks+harvester+MCV, Starport=market orders, Nexus=
  superweapon charge). Queue depth 5, infinite-repeat toggle on last item.
- Rally points per producer; produced units move there on spawn.
- BUILDING UPGRADES (the tech system): Barracks/Light/Heavy/ConYard each have one
  paid timed upgrade (cost/time in data/techtree.json) that unlocks its advanced
  roster for THAT building instance. Upgrade visible on the building sprite
  (antenna/addon) — scouting reads enemy tech.
- Tier 3: Command Nexus requires upgraded ConYard + upgraded Heavy Factory. Unlocks
  faction superweapon (charge timer) + faction tier-3 unit at Heavy Factory.

## 2.7 Combat
- Damage = weapon.damage * matrix[weapon.type][target.armorClass] (data/weapons.json).
- Armor classes: NONE (infantry), LIGHT, MEDIUM, HEAVY, BUILDING.
- Weapon types: BULLET, ROCKET, SHELL, SIEGE, FLAME, SONIC, EXPLOSIVE.
- Projectiles are sim entities with travel time (except BULLET = instant hitscan).
  SIEGE/EXPLOSIVE have splash radius with linear falloff; FRIENDLY FIRE ON for
  splash and SONIC (faction risk mechanic).
- Turreted vehicles (Combat/Missile/Siege tanks, turrets) track targets
  independently of hull facing; hull-fixed weapons require facing within 1/16.
- Stances: AGGRESSIVE (chase), GUARD (engage in range, return to post), HOLD
  (never move). Default GUARD. Attack-move = move that engages en route.
- Target priority when auto-acquiring: nearest threat that can damage me > nearest
  attacker of allies > nearest enemy. Harvesters flee toward refinery when hit.
- Veterancy: none (classic purity). Health bars: green/yellow/red on selection
  and on damage for 2s.

## 2.8 Capture & Infiltration
- Engineer enters enemy building: if building hp > 33%, sets hp to 33% (engineer
  consumed); if hp <= 33%, building changes ownership (engineer consumed).
- Phantom Saboteur: stealth infantry, demolition charge destroys any building
  (10s fuse, consumed). Detected by detector units/turrets within range.

## 2.9 Stealth
- Cloaked entities invisible to enemies unless: within 3 tiles of any enemy unit
  (shimmer, attackable at -50% accuracy), revealed by detector (Radar building
  gives blips only; dedicated detector units fully reveal in 6-tile radius), or
  firing (decloak 3s).

## 2.10 Fog of War
- SHROUD: never-seen = black, no information.
- EXPLORED: seen-then-left = terrain + last-known buildings (greyed), no units.
  Classic permanence: explored never re-shrouds.
- Vision per unit/building (data files). Radar (powered) = minimap unit blips for
  everything outside fog that any friendly currently sees + building blips in
  explored. Dunes +1 vision standing bonus.

## 2.11 Carryall Logistics (v1.1 / Phase 7)
- Carryall (air, no weapon): auto-tasks when idle, nearest-first:
  (a) ferry full harvester to refinery if walk distance > 8 tiles,
  (b) ferry harvester from refinery to its field by same rule,
  (c) ferry vehicle flagged send-to-repair to Repair Pad and back to flag origin.
- Player can manually order pickups (override queue). Carryalls are killable;
  cargo dies with them (brutal, classic, correct). Air units ignore terrain,
  use straight-line movement, only AA weapons can hit them.

## 2.12 Starport (v1.1 / Phase 7)
- Buy any factory unit your tech allows, delivered by NPC freight drop in 20-45s
  (rng). Market price per unit type = baseCost * marketMult; marketMult random-
  walks in [0.65, 1.35], stepping +/-0.05..0.15 every 30s, shared across players.
  Max 6 units per delivery, one pending delivery at a time.
- Strategic identity: convert money into instant army when prices dip; counterplay
  is sniping the Starport or the drop zone.

## 2.13 Titan Worms (v1.1 / Phase 7)
- Spawn only on maps with DEEP_SAND regions; 1-2 active, respawn 90-180s after
  despawn. Move under sand (visible mound ripple to anyone with vision of tile).
- Vibration attraction, weights per source per tick standing on sand:
  thumper 50, harvester harvesting 10, vehicle moving 3, infantry moving 1.
  Worm targets highest accumulated local vibration in 20-tile radius.
- Attack: 2s emerge telegraph (visible mound + audio) -> swallows ONE ground unit
  on the tile whole (any size; harvesters are not immune) -> submerges.
- After 3 swallows: sated, despawns for 120-240s. Cannot enter ROCK/DUNE.
  Killable: 1200 hp, only damageable during emerge window. Feeding it 3 cheap
  units to protect harvesters must be a viable, discoverable play.
- Thumper: cheap consumable from Barracks (50 cr), deployed on sand, max
  attraction for 30s. Use: lure worms toward enemy harvesting ops.

## 2.14 Shard Blooms (v1.1 / Phase 7) — the resource regen system
- On SAND/DEEP_SAND tiles near depleted field centers, a Bloom spawns (rng,
  weighted to depleted areas): pulsing vent, 60-120s fuse, then detonates:
  150 EXPLOSIVE damage in 2-tile radius AND seeds +300..600 shard density across
  a 4-tile radius (clamped to 1000/tile).
- Shooting a bloom detonates it early (same effect). Standing on it when it blows
  is on you. Blooms are the ONLY density regeneration — fields migrate over a long
  match, forcing expansion and re-fights over new ground.

## 2.15 Victory
- Skirmish: destroy all enemy buildings (units alone don't sustain a player), OR
  enemy concedes (AI concedes when no buildings + no MCV + army value < 500).
- Campaign: per-mission objective triggers (data/campaign/*.json).

## 2.16 Difficulty (skirmish + campaign)
Classic cost-scaling: EASY player x0.8 / AI x1.2 cost multipliers; NORMAL 1/1;
HARD player x1.2 / AI x0.8. Plus AI decision cadence: EASY 1 decision/3s,
NORMAL 1/1.5s, HARD 1/0.75s. No AI map hacks at any difficulty: AI scouts and
remembers like a player (fog-honest AI is a hard requirement).
