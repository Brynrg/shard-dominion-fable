// Three coordinate spaces (src/sim/core/coords.ts + src/view/coords.ts)
// Name them. Convert only through these functions. NO inline coordinate math anywhere.

export const TILE_SUBUNITS = 256;   // 1 tile = 256 subunits
export const TILE_PX = 32;           // 1 tile = 32 pixels

// WORLD: integers, 1 tile = 256 subunits. ALL entity positions. x in [0, w*256).
// TILE:    tx = x >> 8  (i.e. worldX / 256). Used for terrain, shard, pathfinding,
//          placement, fog. TilePt = {tx, ty}.
// SCREEN: pixels on the canvas. Depends on camera {x,y in world-pixels, zoom}.
export interface TilePt { tx: number; ty: number }
export interface Camera { x: number; y: number; zoom: number }

export function worldToTile(x: number, y: number): TilePt {
  return { tx: x >> 8, ty: y >> 8 };
}

export function tileToWorldCenter(tx: number, ty: number): { x: number; y: number } {
  return { x: (tx << 8) + 128, y: (ty << 8) + 128 };
}

export function worldToScreen(x: number, y: number, cam: Camera): { sx: number; sy: number } {
  return { 
    sx: (x / 256 * TILE_PX - cam.x) * cam.zoom,
    sy: (y / 256 * TILE_PX - cam.y) * cam.zoom
  };
}

export function screenToWorld(sx: number, sy: number, cam: Camera): { x: number; y: number } {
  const invZoom = 1 / cam.zoom;
  const worldX = (sx / invZoom + cam.x) / (TILE_PX / 256);
  const worldY = (sy / invZoom + cam.y) / (TILE_PX / 256);
  return { x: worldX, y: worldY };
}

export function screenToTile(sx: number, sy: number, cam: Camera): TilePt {
  const world = screenToWorld(sx, sy, cam);
  return worldToTile(world.x, world.y);
}