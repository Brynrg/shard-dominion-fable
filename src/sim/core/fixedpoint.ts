// Fixed-point math: positions/velocities in 1/256-tile subunits

const SCALE = 256;

export class FixedPoint {
  // Convert float to fixed-point
  static fromFloat(value: number): number {
    return Math.round(value * SCALE);
  }

  // Convert fixed-point to float
  static toFloat(value: number): number {
    return value / SCALE;
  }

  // Add two fixed-point numbers
  static add(a: number, b: number): number {
    return a + b;
  }

  // Subtract two fixed-point numbers
  static sub(a: number, b: number): number {
    return a - b;
  }

  // Multiply two fixed-point numbers
  static mul(a: number, b: number): number {
    return (a * b) / SCALE;
  }

  // Divide two fixed-point numbers
  static div(a: number, b: number): number {
    return (a * SCALE) / b;
  }

  // Compare two fixed-point numbers
  static eq(a: number, b: number): boolean {
    return a === b;
  }

  // Compare if a is less than b
  static lt(a: number, b: number): boolean {
    return a < b;
  }

  // Compare if a is greater than b
  static gt(a: number, b: number): boolean {
    return a > b;
  }

  // Compare if a is less than or equal to b
  static lte(a: number, b: number): boolean {
    return a <= b;
  }

  // Compare if a is greater than or equal to b
  static gte(a: number, b: number): boolean {
    return a >= b;
  }

  // Get the squared distance between two fixed-point vectors
  static distSq(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  // Get the distance between two fixed-point vectors
  static dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt(this.distSq(a, b));
  }
}