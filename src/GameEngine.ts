import {
  FORWARD_SPEED,
  TURN_RATE,
  HEADING_INERTIA,
  TOL_TIGHT,
  TOL_OK,
  MAX_OUTSIDE_SECONDS,
  PTS_TIGHT,
  PTS_OK,
  PTS_OUTSIDE,
  X_END,
  Y_END,
  // Economics constants
  REVENUE_TIGHT,
  REVENUE_OK,
  COST_OUTSIDE,
  SCHEDULE_DELAY_MULTIPLIER,
  SCHEDULE_RECOVERY_RATE,
  DOWNSTREAM_COST_PER_SEC,
  BONUS_EXCELLENT,
  BONUS_GOOD,
  PENALTY_POOR,
  PENALTY_FAIL,
} from './config';
import { clamp } from './utils';
import { GameState } from './GameState';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';

export type ModeChangeCallback = (verticalMode: boolean) => void;

export class GameEngine {
  private state: GameState;
  private renderer: Renderer;
  private input: InputHandler;
  private lastTime: number = 0;
  private running: boolean = false;
  private onModeChange?: ModeChangeCallback;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new InputHandler();
    this.state = GameState.new(false);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  setModeChangeCallback(callback: ModeChangeCallback): void {
    this.onModeChange = callback;
  }

  toggleMode(): void {
    const newMode = !this.state.verticalMode;
    this.state = GameState.new(newMode);
    this.onModeChange?.(newMode);
  }

  restart(): void {
    this.state = GameState.new(this.state.verticalMode);
  }

  isVerticalMode(): boolean {
    return this.state.verticalMode;
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000.0;
    this.lastTime = currentTime;

    this.handleInput();
    this.update(dt);
    this.renderer.render(this.state);
    this.input.clearJustPressed();

    requestAnimationFrame(() => this.gameLoop());
  }

  private handleInput(): void {
    // Handle toggle mode (T key)
    if (this.input.wasJustPressed('KeyT')) {
      this.toggleMode();
    }

    // Handle restart (R key)
    if (this.input.wasJustPressed('KeyR')) {
      this.restart();
    }
  }

  private update(dt: number): void {
    if (this.state.finished || this.state.failed) {
      return;
    }

    // Get steering input
    const steer = this.input.getSteerInput(this.state.verticalMode);

    // Heading target changes with input (clamped to avoid absurd angles)
    this.state.headingTarget += steer * TURN_RATE * dt;
    this.state.headingTarget = clamp(this.state.headingTarget, -0.55, 0.55); // ~±31.5°

    // Inertia: heading approaches target slowly
    const alpha = 1.0 - Math.exp(-HEADING_INERTIA * dt);
    this.state.heading = (1 - alpha) * this.state.heading + alpha * this.state.headingTarget;

    // Advance drill with constant forward speed
    if (this.state.verticalMode) {
      // Vertical mode: forward is along +y (downward)
      const dy = FORWARD_SPEED * dt;
      const dx = Math.tan(this.state.heading) * dy;
      this.state.x += dx;
      this.state.y += dy;
    } else {
      // Horizontal mode: forward is along +x (rightward)
      const dx = FORWARD_SPEED * dt;
      const dy = Math.tan(this.state.heading) * dx;
      this.state.x += dx;
      this.state.y += dy;
    }

    this.state.actualPoints.push([this.state.x, this.state.y]);

    // Score based on deviation from planned path
    let dev: number;
    if (this.state.verticalMode) {
      const plannedX = this.state.plan.x(this.state.y);
      dev = Math.abs(this.state.x - plannedX);
    } else {
      const plannedY = this.state.plan.y(this.state.x);
      dev = Math.abs(this.state.y - plannedY);
    }

    // Update economics and legacy score
    const econ = this.state.economics;
    econ.totalTime += dt;

    if (dev <= TOL_TIGHT) {
      // Tight corridor: optimal drilling
      this.state.score += PTS_TIGHT * dt;
      econ.timeInTight += dt;
      econ.grossRevenue += REVENUE_TIGHT * dt;
      // Recover schedule when drilling optimally
      econ.scheduleVariance = Math.max(0, econ.scheduleVariance - SCHEDULE_RECOVERY_RATE * dt);
    } else if (dev <= TOL_OK) {
      // OK corridor: acceptable drilling
      this.state.score += PTS_OK * dt;
      econ.timeInOK += dt;
      econ.grossRevenue += REVENUE_OK * dt;
    } else {
      // Outside tolerance: problem drilling
      this.state.score += PTS_OUTSIDE * dt;
      econ.timeOutside += dt;
      econ.remediationCosts += COST_OUTSIDE * dt;
      // Accumulate schedule delay
      econ.scheduleVariance += SCHEDULE_DELAY_MULTIPLIER * dt;
      this.state.outsideTime += dt;
    }

    // Calculate downstream penalty from accumulated schedule variance
    econ.downstreamPenalty = econ.scheduleVariance * DOWNSTREAM_COST_PER_SEC;

    // You can dip outside briefly and recover; too long -> fail
    if (dev <= TOL_OK) {
      this.state.outsideTime = Math.max(0.0, this.state.outsideTime - 1.8 * dt);
    }

    if (this.state.outsideTime >= MAX_OUTSIDE_SECONDS) {
      this.state.failed = true;
      this.calculateCompletionBonus();
    }

    // Check if finished based on mode
    if (this.state.verticalMode) {
      if (this.state.y >= Y_END) {
        this.state.finished = true;
        this.calculateCompletionBonus();
      }
    } else {
      if (this.state.x >= X_END) {
        this.state.finished = true;
        this.calculateCompletionBonus();
      }
    }
  }

  private calculateCompletionBonus(): void {
    const accuracy = this.state.getAccuracyPercent();
    const econ = this.state.economics;

    if (this.state.failed) {
      // Failed hole - major penalty
      econ.completionBonus = PENALTY_FAIL;
    } else if (accuracy >= 90) {
      econ.completionBonus = BONUS_EXCELLENT;
    } else if (accuracy >= 75) {
      econ.completionBonus = BONUS_GOOD;
    } else if (accuracy < 50) {
      econ.completionBonus = PENALTY_POOR;
    } else {
      econ.completionBonus = 0;
    }
  }
}
