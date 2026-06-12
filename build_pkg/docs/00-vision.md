# 00 — Vision & Scope

## One-liner
A faithful, IP-clean recreation of late-90s Westwood RTS depth: vulnerable economy,
optional-concrete base decay, power pressure, single-thread construction, asymmetric
factions, neutral megafauna threats, classic sidebar UI — built browser-first in
TypeScript/Phaser 3 with a fully deterministic headless simulation core.

## Pillars (every design decision must serve one)
1. ECONOMY IS THE GAME. Harvesters are the most valuable and most vulnerable units.
   Raiding the economy is always a viable strategy; protecting it is always a tax.
2. MEANINGFUL TRADEOFFS, NOT TAXES. Concrete is optional-with-penalty, not mandatory.
   Power can be over- or under-built. Starport prices fluctuate. Every system gives
   the player a real decision, not a chore.
3. ASYMMETRY WITH A SHARED SPINE. ~70% shared roster, 30% faction identity. A player
   who knows one faction can play all three; a player who masters one feels distinct.
4. READABLE BATTLEFIELD. Rock-paper-scissors counters are legible at a glance. AI is
   predictable over optimal. Units do what the player expects.
5. THE PLANET FIGHTS BACK. Titan Worms and Shard Blooms make neutral terrain an
   active opponent and the resource system self-renewing.

## Scope
- SHIP TARGET (v1.0): Phases 0-6. Skirmish vs AI, 3 factions core rosters, full
  economy/base/combat/UI loop, 4 skirmish maps. This is a complete game.
- v1.1: Phase 7 (faction depth, air, starport, worms/blooms, superweapons).
- v1.2: Phase 8 (5-mission Vanguard campaign) + Phase 9 (art/audio/balance/ship).
- EXPLICITLY OUT OF SCOPE: multiplayer netcode (but sim determinism is preserved as
  its future foundation), map editor UI (maps are Tiled JSON), mod loader, mobile.

## Hard constraints
- 60fps with 200 active units in a desktop browser (Apple Silicon Chrome baseline).
- Whole game state serializable to JSON; save/load = serialize + seed.
- Identical seed + identical command stream => identical state hash. Always.
