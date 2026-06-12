# 06 — UI / Controls Spec (Phase 5)

## Layout (1280x720 logical, scale to fit)
- RIGHT SIDEBAR (200px, classic): top = credits ticker + power bar (green/red
  needle) + storage bar; middle = radar/minimap 184x184 (static noise when
  unpowered); bottom = build strip: tabs [BUILDINGS | INFANTRY | VEHICLES |
  STARPORT(when built)], grid of build buttons w/ cost, radial progress sweep,
  queue count badge, greyed when unaffordable/locked, padlock icon when needs
  upgrade. Right-click a building button = cancel/refund queue head.
- TOP-LEFT: objective text (campaign) / elapsed time (skirmish).
- BOTTOM: selection tray (up to 24 unit portraits w/ hp slivers; click = subselect
  type), stance toggle, and context buttons (deploy MCV, send-to-repair flag).
- CURSORS: default / move / attack (red) / no-go / harvest / capture (wrench) /
  repair / sell / place-building footprint (per-tile green-yellow-red).

## Minimap
Terrain underlay, fog overlay, friendly units green dots, enemies red (only when
radar powered AND currently seen), buildings as 2x2 blips in explored. Click =
jump camera; right-drag = move command at minimap point; ping flash on attack
events ("base under attack" + audio, 10s cooldown per region).

## Mouse & keys (classic Westwood grammar + modern QoL)
- LMB select / band-box; double-click = all of type on screen; LMB on enemy with
  selection = attack; RMB = context order (move/attack/harvest/capture/enter).
- SHIFT = queue waypoints/orders. A+LMB = attack-move. S = stop. G = guard,
  H = hold stance. X = scatter. D = deploy (MCV).
- CTRL+1..0 assign group; 1..0 select; double-tap = jump camera to group.
- Edge scroll + WASD/arrows + MMB-drag pan. Z/X or wheel = zoom (2 steps).
- E = select all military on screen. Backspace = jump to last event ping.
- ESC = menu. F5 quicksave / F9 quickload (campaign).

## Feedback rules
Every order = audio acknowledge (per faction voice set) + green move-target flash.
Every production complete = sidebar chime + "unit ready" line. Low power, low
storage, base under attack, harvester under attack, worm sign nearby: distinct
audio cues, throttled. Build button tooltips: name, cost, time, 1-line role,
prereq if locked.
