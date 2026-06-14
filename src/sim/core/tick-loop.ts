// Tick loop: fixed 20Hz tick

import type { Tick } from './types.js';

export class TickLoop {
  private currentTick: Tick = 0;
  private lastTickTime: number = 0;
  private tickRate: number; // ticks per second

  constructor(tickRate: number = 20) {
    this.tickRate = tickRate;
  }

  // Get the current tick
  getTick(): Tick {
    return this.currentTick;
  }

  // Set the current tick
  setTick(tick: Tick): void {
    this.currentTick = tick;
  }

  // Start the tick loop
  start(): void {
    // eslint-disable-next-line no-undef
    this.lastTickTime = performance.now();
  }

  // Update the tick loop
  update(): Tick {
    // eslint-disable-next-line no-undef
    const now = performance.now();
    const elapsed = now - this.lastTickTime;
    const tickInterval = 1000 / this.tickRate;

    if (elapsed >= tickInterval) {
      this.currentTick++;
      this.lastTickTime = now - (elapsed % tickInterval);
    }

    return this.currentTick;
  }

  // Reset the tick loop
  reset(): void {
    this.currentTick = 0;
    // eslint-disable-next-line no-undef
    this.lastTickTime = performance.now();
  }
}
