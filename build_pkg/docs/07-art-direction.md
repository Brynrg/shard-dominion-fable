# 07 — Art Direction & Asset Pipeline (placeholders P0-P6; real art P9)

## Style target
Late-90s pre-rendered look: 3D-modeled, top-down-oblique (camera pitched ~55 deg),
rendered to sprites with baked lighting from a fixed sun (NW, 35 deg elevation),
hard 1px dark outline, 32px-per-tile world scale. Palette-disciplined: terrain
warm neutrals, factions own saturated identity colors. NOT pixel-art-retro; this
is "1998 SVGA pre-render" — small sprites, crisp silhouettes, painterly terrain.

## Palettes (assets-spec/palette.json is authoritative)
- Terrain: sand #C8A86B, deep sand #B08F52, dune highlight #E2C98F, rock #6E665C,
  cliff #4A443D, shard crystal #7FD4C1 w/ #B8F0E4 sparkle.
- Vanguard: primary #18B7C4, secondary #0E6E78, trim #DDEFF1.
- Forge: primary #D96A1F, secondary #7A3A12, trim #E8C9A0.
- Phantom: primary #7C5BD4, secondary #3A2A66, trim #C9BCE8.
- Concordat (campaign): primary #C2C7CC, secondary #6B7077, trim #E8E8E8.
- FACTION RECOLOR: all unit/building sprites authored with faction color in a
  reserved magenta band (#FF00FF..#7F007F ramp, 8 steps) remapped at load to the
  faction ramp. One spritesheet serves all factions.

## Sprite specs (full inventory: assets-spec/sprite-manifest.json)
- Vehicles: 32 hull rotations (11.25 deg steps); turreted vehicles ship hull and
  turret as separate sheets, turret has its own 32 rotations, pivot recorded in
  manifest. Vehicle canvas 48x48 (Behemoth 64x64).
- Infantry: 8 directions x (walk 6 frames, idle 2, fire 2, death 4). Canvas 24x24.
- Buildings: 1 facing; states: construction(3 frames buildup), normal, damaged
  (>50% smoke overlay anchor), heavily damaged (<25%, fire anchors), upgraded
  (addon visible), destroyed rubble. Footprint sizes in data/buildings.json
  (2x2 to 4x4 at 32px/tile).
- Effects: muzzle flashes (3 sizes), tracers, rocket+trail, shell arc shadow,
  explosions S/M/L (8/10/12 frames), sonic ripple, cloak shimmer, worm mound
  ripple loop, worm emerge (10 frames, 96x96), bloom vent pulse loop, slab,
  rubble, shard density 3 visual tiers per sand tile (autotiled overlay).
- UI: sidebar frame, tabs, 64x48 build-button portrait per buildable (rendered
  from same 3D models, 3/4 beauty angle), cursors, cameo borders, radar frame.

## Production pipeline (tools/ in repo; agent builds these scripts)
PRIMARY — procedural Blender (deterministic, fully agent-executable):
1. tools/models/*.py — one python script per unit/building constructs the model
   from primitives (boxes, cylinders, wedges; beveled, max ~300 tris), assigns
   flat materials using palette.json + the magenta faction band. NO sculpting,
   NO external model files. Silhouette-first design: each unit readable at 32px.
2. tools/render_sprites.py — headless `blender -b -P`: fixed orthographic-ish
   camera (55 deg pitch), sun NW/35deg + fill, renders N rotations per manifest
   entry to PNG frames at 2x, downsamples to 1x with 1px outline post-pass
   (tools/outline.py, marching squares over alpha).
3. tools/pack_atlas.py — packs frames into per-category atlases + Phaser JSON.
4. Determinism: fixed seeds, fixed camera, idempotent — re-running produces
   byte-identical atlases (hash-checked in CI) so art regen never causes drift.
FALLBACK — CC0 packs (OpenGameArt "Sci-fi RTS 120+ sprites", Kenney Top-down
Tanks Redux, itch CC0 sci-fi tilesets) recolored through the same magenta-band
remap; log every source+license in assets/CREDITS.md. Use ONLY if the Blender
pipeline gate fails review.
ENHANCEMENT (operator-side, optional, not agent-blocking): operator may regenerate
terrain tiles / portraits / briefing art via local SDXL-Flux on the Spark using
prompts in assets-spec/generation-prompts.md; drop-in replaces files, same names.

## Placeholder discipline (P0-P6)
Geometric language so gameplay reads before art exists: triangles=infantry,
chevrons=light vehicles, rectangles=tanks (turret line shows facing), large
squares=buildings (letter glyph: C yard, P power, R refinery...), circles=air.
Faction = fill color, selection = white ring, hp = 3px bar. Terrain = flat color
tiles + density dots on sand. All placeholder rendering generated procedurally in
view code — zero placeholder image files to clean up later.

## Maps
4 skirmish maps (Tiled JSON, 96x96 to 128x128 tiles): "Crossing" (2p, central
shard valley), "Worm Belt" (2p, deep-sand center, rock flanks), "Quarry" (4p,
corner starts), "Spires" (3p, cliff maze, infantry trails). Campaign maps per
mission spec. Map authoring rules: every start = 6x6+ buildable rock, 1 near
field (~8k cr) + 1 contested field (~15k), expansions reachable by ground.
