import { X_START, Y_START } from './config';
import { SeededRandom } from './utils';
import type { PlanData } from './types';

export class Plan implements PlanData {
  seed: number;
  a1: number;
  a2: number;
  w1: number;
  w2: number;
  phase1: number;
  phase2: number;
  slope: number;

  constructor(data: PlanData) {
    this.seed = data.seed;
    this.a1 = data.a1;
    this.a2 = data.a2;
    this.w1 = data.w1;
    this.w2 = data.w2;
    this.phase1 = data.phase1;
    this.phase2 = data.phase2;
    this.slope = data.slope;
  }

  // For horizontal mode: y = f(x)
  y(x: number): number {
    return (
      (this.slope * (x - X_START)) / 200.0 +
      this.a1 * Math.sin(this.w1 * x + this.phase1) +
      this.a2 * Math.sin(this.w2 * x + this.phase2)
    );
  }

  // For vertical mode: x = f(y)
  x(y: number): number {
    return (
      (this.slope * (y - Y_START)) / 200.0 +
      this.a1 * Math.sin(this.w1 * y + this.phase1) +
      this.a2 * Math.sin(this.w2 * y + this.phase2)
    );
  }

  static random(): Plan {
    const seed = Math.floor(Math.random() * 1000000);
    const rng = new SeededRandom(seed);
    
    return new Plan({
      seed,
      a1: rng.uniform(8.0, 18.0),
      a2: rng.uniform(3.0, 10.0),
      w1: rng.uniform(0.010, 0.018),
      w2: rng.uniform(0.020, 0.035),
      phase1: rng.uniform(0, Math.PI * 2),
      phase2: rng.uniform(0, Math.PI * 2),
      slope: rng.uniform(-8.0, 8.0),
    });
  }
}
