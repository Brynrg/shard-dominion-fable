// Type declarations for the sim module

declare module '../sim' {
  export { Sim } from './index.js';
  export type { Command, SimConfig, SimState } from './core/types.js';
}