# 05 — Skirmish AI Design (Phase 6)

## Architecture
Three layers, all running INSIDE the sim (AI issues Commands like a player; it has
a PlayerId, a fog-of-war state, and NO access to hidden information — fog-honest):
1. ECONOMY GOVERNOR (always on): maintain harvester count target (2 per refinery,
   +1 per 6k credits banked), rebuild lost power/refineries first, expand to a new
   field when assigned field density < 30%, keep power surplus >= 20.
2. BUILD DIRECTOR: executes a build-order SCRIPT (JSON, per faction personality)
   until script exhausted, then follows a priority table (army value vs enemy
   estimate, tech up when bank > threshold, defense ratio per base edge facing
   known enemy direction).
3. BATTLE COMMANDER: finite state machine.
   States: SCOUT (cheap unit patrols unexplored), DEFEND (army holds rally inside
   base), RAID (3-5 fast units target enemy harvesters seen by scouts), PUSH
   (army value >= 1.4x estimated enemy army -> attack-move via least-defended
   approach), REBUILD (army value < 0.5x -> turtle + rebuild), HARASS_RESPONSE
   (own harvester under attack -> divert nearest squad).
   Transitions evaluated at the difficulty decision cadence (02 §2.16).

## Threat map
Coarse 8x8-tile grid; decays 2%/tick; bumped by sim damage events the AI can SEE.
Used for approach selection (PUSH picks lowest-threat path to a known enemy
building) and defense placement.

## Faction personalities (data/factions.json -> ai block)
- Vanguard: techs faster, holds longer before PUSH (1.6x threshold), prioritizes
  AA + standoff units, raids less.
- Forge: builds defense-heavy, pushes in fewer/larger waves (2.0x value or timer),
  slabs everything (turtle identity), rebuild threshold lower (stubborn).
- Phantom: raid-biased (RAID state preferred whenever 4+ fast units idle),
  pushes only at 1.3x, scouts twice as often, buys Starport dips aggressively.

## Build order script format
data/factions.json ai.openings[]: array of {build: typeId} | {train: unitId, n} |
{upgrade: buildingType} | {when: condition} steps. 2 openings per faction; pick
by rng at match start (variety between matches).

## Hard requirements
- AI never stalls: watchdog test — if no Command issued for 60 sim-seconds while
  credits > 800 and queues empty, that is a test failure.
- AI handles loss spirals: no ConYard + no MCV -> all-in PUSH with everything.
- 50-match AI-vs-AI headless suite must complete; each faction wins >= 25% of
  its pairings on NORMAL; median match length 12-25 sim-minutes.
