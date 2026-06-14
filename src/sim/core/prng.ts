// Mulberry32 PRNG: seeded, deterministic, fast

export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  // Get the current state
  getState(): number {
    return this.state;
  }

  // Set the state
  setState(state: number): void {
    this.state = state;
  }

  // Returns a float in [0, 1)
  next(): number {
    this.state += 0x6D2B79F5;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Returns an integer in [0, max)
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  // Returns a float in [min, max)
  nextFloat(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Clone the PRNG state
  clone(): PRNG {
    const clone = new PRNG(0);
    clone.state = this.state;
    return clone;
  }
}