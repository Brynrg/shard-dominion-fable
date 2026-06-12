# 04 — Story & Campaign (v1.2, Phase 8)

## Setting
AETHER PRIME: a mineral world wrapped in static storms. Its dunes grow AETHER
SHARDS — piezoelectric crystal that makes interstellar industry run. Nobody owns
Aether Prime. The AETHER CONCORDAT — an off-world tribunal of charter-banks and
fleet insurers — "administers" it, and administration means auctioning the right
to bleed.

## The Charter
The Concordat issues a single CHARTER OF EXTRACTION... to three claimants at once,
by design. Vanguard Enclave (a depatriated naval officer corps turned joint-stock
expedition), Forge Dominion (a heavy-industry combine that pays debts in tonnage),
and the Phantom Collective (a syndicate of voidside smugglers and signal-thieves
who incorporated out of spite). The Charter's fine print: the claimant holding the
orbital uplink terminals at audit's end keeps the world. The Concordat calls this
"competitive stewardship." Everyone on the ground calls it what it is — an arena.

## Arc (9 beats; MVP builds beats 1-5 as missions for VANGUARD)
1. LANDFALL — secure a foothold, learn economy. Reveal: prior charter-holders'
   ruins everywhere. Someone has run this race before. Nobody graduated.
2. THE QUOTA — Concordat demands an extraction quota under deadline while Phantom
   raiders test you. Teaches harvester defense.
3. SALT THE GROUND — strike Forge's forward refineries. First offense. Your
   Strategos notes Forge anticipated the exact timing of your authorization codes.
4. THE AUDITOR — escort/protect a Concordat audit station. It is "neutral." Its
   sensor logs upload to someone. After the mission: your codes rotate; the leak
   continues.
5. BLACKOUT — Phantom steals your uplink cipher; assault their listening post
   THROUGH a worm-belt of deep sand. Recovered data shows the Concordat itself is
   feeding your movements to whichever faction is LOSING. The Charter is not a
   race. It is a culling — the Concordat keeps the world richest when no one wins.
6-9 (v1.3+): expose the audit fraud, fight a 2v1 as rivals accept Concordat
   subsidies, destroy the orbital uplink you were told to capture, final stand vs
   both houses + Concordat ENFORCEMENT LEGION (grey/white fourth faction, campaign-
   only, uses Vanguard roster reskinned + superweapon access).

## Voice
Briefings delivered by your STRATEGOS — faction advisor persona, text + static
portrait + 2-3 lines of TTS. Vanguard Strategos: ex-fleet intelligence, dry,
precise, increasingly insubordinate toward the Concordat as the arc progresses.
Concordat communiques: passive-voice corporate menace ("Stewardship metrics
indicate consolidation opportunities."). All briefing text lives in mission JSON.

## Mission design rules
- Every mission introduces or stresses exactly ONE mechanic.
- Mission variety pool: destroy-all, capture-structure, protect-structure (timed),
  no-ConYard/starport-only, extraction quota under deadline.
- Reinforcement triggers and scripted attacks defined in mission JSON triggers[].
- Difficulty via global cost multipliers (see 02 §2.16), never via AI cheats.
