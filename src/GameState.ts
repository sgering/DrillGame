import { X_START, Y_START } from './config';
import { Plan } from './Plan';
import type { Point, GameStateData, DrillingEconomics } from './types';

export class GameState implements GameStateData {
  plan: Plan;
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

  constructor(data: Omit<GameStateData, 'plan' | 'economics'> & { plan: Plan; economics: DrillingEconomics }) {
    this.plan = data.plan;
    this.x = data.x;
    this.y = data.y;
    this.heading = data.heading;
    this.headingTarget = data.headingTarget;
    this.score = data.score;
    this.outsideTime = data.outsideTime;
    this.finished = data.finished;
    this.failed = data.failed;
    this.verticalMode = data.verticalMode;
    this.actualPoints = data.actualPoints;
    this.economics = data.economics;
  }

  static createEmptyEconomics(): DrillingEconomics {
    return {
      grossRevenue: 0,
      remediationCosts: 0,
      scheduleVariance: 0,
      downstreamPenalty: 0,
      timeInTight: 0,
      timeInOK: 0,
      timeOutside: 0,
      totalTime: 0,
      completionBonus: 0,
    };
  }

  // Calculate accuracy percentage
  getAccuracyPercent(): number {
    if (this.economics.totalTime === 0) return 100;
    return ((this.economics.timeInTight + this.economics.timeInOK) / this.economics.totalTime) * 100;
  }

  // Calculate net profit
  getNetProfit(): number {
    return (
      this.economics.grossRevenue -
      this.economics.remediationCosts -
      this.economics.downstreamPenalty +
      this.economics.completionBonus
    );
  }

  static new(verticalMode: boolean = false): GameState {
    const plan = Plan.random();
    let x0: number, y0: number, heading: number;

    if (verticalMode) {
      y0 = Y_START;
      x0 = plan.x(y0); // Align with planned path at start
      heading = 0.0;   // 0° means straight down in vertical mode
    } else {
      x0 = X_START;
      y0 = plan.y(x0); // Align with planned path at start
      heading = 0.0;   // 0 rad means heading along +x (straight right)
    }

    return new GameState({
      plan,
      x: x0,
      y: y0,
      heading,
      headingTarget: heading,
      score: 0.0,
      outsideTime: 0.0,
      finished: false,
      failed: false,
      verticalMode,
      actualPoints: [[x0, y0]],
      economics: GameState.createEmptyEconomics(),
    });
  }
}
