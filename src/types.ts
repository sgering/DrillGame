export type Point = [number, number];
export type Color = [number, number, number];

export interface PlanData {
  seed: number;
  a1: number;
  a2: number;
  w1: number;
  w2: number;
  phase1: number;
  phase2: number;
  slope: number;
}

// Drilling economics tracking
export interface DrillingEconomics {
  // Revenue tracking
  grossRevenue: number;        // Total earned from good drilling
  remediationCosts: number;    // Costs from being outside tolerance
  
  // Schedule tracking
  scheduleVariance: number;    // Accumulated delay (seconds)
  downstreamPenalty: number;   // Lost revenue from delayed operations
  
  // Time tracking by zone
  timeInTight: number;         // Seconds in tight corridor
  timeInOK: number;            // Seconds in OK corridor  
  timeOutside: number;         // Seconds outside tolerance
  totalTime: number;           // Total drilling time
  
  // Completion bonus (calculated at end)
  completionBonus: number;
}

export interface GameStateData {
  plan: PlanData;
  x: number;
  y: number;
  heading: number;
  headingTarget: number;
  score: number;
  outsideTime: number;
  finished: boolean;
  failed: boolean;
  verticalMode: boolean;
  actualPoints: Point[];
  economics: DrillingEconomics;
}
