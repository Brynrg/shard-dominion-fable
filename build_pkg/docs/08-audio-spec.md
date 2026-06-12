# 08 — Audio Spec (P9; stub beeps from P5)

## Inventory (assets-spec/audio-manifest.json)
- UI: click, build-place, build-complete chime, error buzz, low-power alarm,
  storage-full alarm, radar-online/offline.
- Combat: per weapon-type fire (bullet/rocket/shell/siege/flame/sonic), 3 impact
  classes, explosion S/M/L, building collapse, capture sting.
- World: worm rumble loop (proximity-volume), worm emerge roar, bloom hiss+blast,
  carryall thrum, starport delivery horn.
- Voice: per-faction unit-acknowledge sets (select x3, move x3, attack x3) +
  EVA-style announcer (one neutral voice): "Construction complete", "Unit ready",
  "Base under attack", "Harvester under attack", "Low power", "Silos needed",
  "Worm sign detected", "Superweapon charging/ready/launch detected".
- Music: 3 ambient-industrial tracks (menu, calm, combat-intensity crossfade).

## Sourcing
SFX: CC0 (freesound CC0 filter, Kenney audio packs) -> normalize -16 LUFS, mono,
ogg. Announcer + acknowledges: operator-side local TTS (any neutral voice, slight
radio bandpass 300-3400Hz + soft compressor via ffmpeg script tools/voicefx.sh);
script of every line lives in audio-manifest.json. Music: CC0/CC-BY instrumental
only, credit in CREDITS.md; ship-blocking if license unclear — ask operator.
Implementation: Phaser audio, 16-voice cap, per-category volume in settings,
positional pan by camera offset.
