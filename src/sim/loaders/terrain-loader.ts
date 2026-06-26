import { z } from 'zod';

// Define the terrain schema
const terrainSchema = z.object({
  economyConstants: z.object({
    harvestRatePerSec: z.number(),
    harvesterCapacity: z.number(),
    unloadPerSec: z.number(),
    refineryStorage: z.number(),
  }),
});

export type TerrainConfig = z.infer<typeof terrainSchema>;

// Load terrain.json
export function loadTerrainConfig(): TerrainConfig {
  // TODO: Implement proper file loading for modules
  return { economyConstants: { harvestRatePerSec: 25, harvesterCapacity: 700, unloadPerSec: 100, refineryStorage: 2000 } };
}

// For easier access, we'll also provide a loader that reads the file content
export function loadTerrainConfigSync(): TerrainConfig {
  // For now, we'll just return the same terrain config  
  // TODO: Implement proper file loading for modules
  const terrainJson = { economyConstants: { harvestRatePerSec: 25, harvesterCapacity: 700, unloadPerSec: 100, refineryStorage: 2000 } };
  return terrainSchema.parse(terrainJson);
}
