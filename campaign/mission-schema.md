# Mission JSON Schema (implement as zod in src/sim/data)
{ id, title, faction, map (Tiled ref), briefing: { strategosText[], concordatText?, portrait },
  startingForces: [{owner, unit|building, x, y, onSlab?}], startingCredits: {player, perEnemy},
  techCeiling: { player: maxTier, enemies: maxTier },
  objectives: [{ id, type: destroy_all|destroy_target|capture_target|protect_target|quota|survive,
    target?, amountCr?, timeLimitSec?, required: bool, text }],
  triggers: [{ id, when: { type: timer|regionEnter|destroyed|captured|objectiveDone|quotaPct, ... },
    actions: [{ type: reinforce|attackWave|revealRegion|message|spawnWorm|spawnBloom|winCheck|loseCheck, ... }] }],
  aiOverrides: { perEnemy: { scriptedWavesOnly?: bool, personality?, noExpand?: bool } } }
