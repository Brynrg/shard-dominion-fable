# 03 — Factions
Shared spine: Light Infantry, Trooper, Engineer, Harvester, MCV, Combat Tank
(faction-statted variant), Siege Tank, Missile Tank, Carryall, and the full common
building set. Faction identity = combat tank variant + 2-3 unique units + tier-3
unit + superweapon + one economic/utility wrinkle. All stats: data/units.json,
data/factions.json.

## VANGUARD ENCLAVE — precision, range, air
Color: cyan/teal. Doctrine: win at range, control the sky, fragile if rushed.
- Combat Tank-V: baseline stats (the reference tank).
- UNIQUE Longbow Trooper (Barracks upgraded): infantry, 7-tile range rocket,
  slow, shreds vehicles at standoff; dies to anything that closes.
- UNIQUE Strike Wing (Heavy Factory upgraded): fixed-wing attack craft, strafing
  rocket runs, must return to Helipad-equivalent (Airfield building, Vanguard-only)
  to rearm (3 sorties of ammo).
- TIER 3 Resonance Tank: SONIC line weapon, damages EVERYTHING in the line
  including friendlies. High skill ceiling, devastating vs clumps.
- SUPERWEAPON Orbital Lance: powered Nexus charges 8 min; pinpoint beam, very
  high damage, small radius — a sniper superweapon (kills the building you pick).
- WRINKLE: Airfield + best AA. Vanguard punishes enemy Carryall logistics.

## FORGE DOMINION — armor, alpha, attrition
Color: orange/rust. Doctrine: slow walls of metal, overwhelming siege, weak early map control.
- Combat Tank-F: +25% hp, -20% speed, -10% ROF.
- UNIQUE Scorcher Trooper (Barracks upgraded): FLAME infantry, melts infantry and
  light vehicles, suicidal range.
- UNIQUE Bulwark APC (Light Factory upgraded): armored transport, 5 infantry,
  deploy under fire; makes Forge infantry pushes real.
- TIER 3 Behemoth: super-heavy twin-cannon tank, 3x Combat Tank hp, crawls,
  splash main gun (friendly fire). Army anchor.
- SUPERWEAPON Hammerfall MIRV: Nexus charges 7 min; missile with visible flight
  time, scatters 5 warheads in a wide ellipse around target — inaccurate,
  devastating saturation (classic Death Hand pattern).
- WRINKLE: buildings +20% hp; repair 25% cheaper. Forge bases are sieges.

## PHANTOM COLLECTIVE — speed, stealth, theft
Color: violet/grey. Doctrine: see everything, own nothing, make the enemy fight
ghosts; loses straight fights on equal money.
- Combat Tank-P: -20% hp, +25% speed, +15% ROF.
- UNIQUE Wraith Raider (Light Factory base unit, replaces common scout): fastest
  ground unit in game, anti-infantry MG.
- UNIQUE Saboteur (Barracks upgraded): stealth demo infantry (see 2.8).
- UNIQUE Veil Projector (Heavy Factory upgraded): projects 4-tile cloak field
  over friendly ground units while stationary; itself uncloaked (protect it).
- TIER 3 Puppeteer: deviator-pattern gas projector — hit enemy vehicle switches
  to Phantom control for 20s (then reverts). Stolen units can be ordered, fed to
  worms, or parked in your kill zone. Cannot affect harvesters carrying cargo? NO —
  it can; stealing a full harvester is signature Phantom.
- SUPERWEAPON Phase Storm: Nexus charges 6 min; large radius EMP-like field:
  enemy buildings unpowered + vehicles frozen 15s in radius. No damage. Sets up
  the real attack.
- WRINKLE: all Phantom units cost 10% less; all Phantom units have -10% hp.
  CAMPAIGN ONLY: missions may grant Mercenary auxiliaries — allied AI detachment
  that deserts (turns neutral) if its losses exceed 60%.

## Rock-paper-scissors quick reference (full matrix in data/weapons.json)
Scout MG -> infantry | Trooper/Quad rockets -> vehicles | Siege Tank -> infantry,
buildings (weak vs tanks) | Combat Tank -> general line | Missile Tank -> vehicles
+ ONLY common anti-air | Engineers -> buildings | Flame -> infantry/light |
Walls+turrets -> raids | Worms -> anything on sand.
