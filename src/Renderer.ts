import {
  WIDTH, HEIGHT,
  BG, GRID, PLAN, ACTUAL, TIGHT, OK, BAD, TEXT,
  TOL_TIGHT, TOL_OK, MAX_OUTSIDE_SECONDS,
  X_START, X_END, Y_START, Y_END,
  CAMERA_LOOKAHEAD,
} from './config';
import { worldToScreen, colorToRgb, colorToRgba } from './utils';
import { GameState } from './GameState';
import type { Point, Color } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.fillStyle = colorToRgb(BG);
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  drawGrid(): void {
    this.ctx.strokeStyle = colorToRgb(GRID);
    this.ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = 0; x < WIDTH; x += 80) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, HEIGHT);
      this.ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < HEIGHT; y += 80) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(WIDTH, y);
      this.ctx.stroke();
    }
  }

  drawCorridor(
    state: GameState,
    camX: number,
    camY: number,
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number
  ): { planLine: Point[] } {
    const step = 4.0;
    const planLine: Point[] = [];

    if (state.verticalMode) {
      const okLeft: Point[] = [];
      const okRight: Point[] = [];
      const tightLeft: Point[] = [];
      const tightRight: Point[] = [];

      for (let y = yMin; y <= yMax; y += step) {
        const px = state.plan.x(y);
        planLine.push(worldToScreen(px, y, camX, camY, true));
        okLeft.push(worldToScreen(px - TOL_OK, y, camX, camY, true));
        okRight.push(worldToScreen(px + TOL_OK, y, camX, camY, true));
        tightLeft.push(worldToScreen(px - TOL_TIGHT, y, camX, camY, true));
        tightRight.push(worldToScreen(px + TOL_TIGHT, y, camX, camY, true));
      }

      // Draw OK corridor
      if (okLeft.length >= 2) {
        this.drawPolygon([...okLeft, ...okRight.reverse()], OK, 0.14);
      }
      // Draw tight corridor
      if (tightLeft.length >= 2) {
        this.drawPolygon([...tightLeft, ...tightRight.reverse()], TIGHT, 0.22);
      }
    } else {
      const okUpper: Point[] = [];
      const okLower: Point[] = [];
      const tightUpper: Point[] = [];
      const tightLower: Point[] = [];

      for (let x = xMin; x <= xMax; x += step) {
        const py = state.plan.y(x);
        planLine.push(worldToScreen(x, py, camX, camY, false));
        okUpper.push(worldToScreen(x, py + TOL_OK, camX, camY, false));
        okLower.push(worldToScreen(x, py - TOL_OK, camX, camY, false));
        tightUpper.push(worldToScreen(x, py + TOL_TIGHT, camX, camY, false));
        tightLower.push(worldToScreen(x, py - TOL_TIGHT, camX, camY, false));
      }

      // Draw OK corridor
      if (okUpper.length >= 2) {
        this.drawPolygon([...okUpper, ...okLower.reverse()], OK, 0.14);
      }
      // Draw tight corridor
      if (tightUpper.length >= 2) {
        this.drawPolygon([...tightUpper, ...tightLower.reverse()], TIGHT, 0.22);
      }
    }

    return { planLine };
  }

  private drawPolygon(points: Point[], color: Color, alpha: number): void {
    if (points.length < 3) return;
    
    this.ctx.fillStyle = colorToRgba(color, alpha);
    this.ctx.beginPath();
    this.ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i][0], points[i][1]);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawPlanLine(planLine: Point[]): void {
    if (planLine.length < 2) return;
    
    this.ctx.strokeStyle = colorToRgb(PLAN);
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(planLine[0][0], planLine[0][1]);
    for (let i = 1; i < planLine.length; i++) {
      this.ctx.lineTo(planLine[i][0], planLine[i][1]);
    }
    this.ctx.stroke();
  }

  drawActualPath(
    state: GameState,
    camX: number,
    camY: number,
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number
  ): void {
    const visibleActual: Point[] = [];
    const points = state.actualPoints.slice(-4000);

    for (const [ax, ay] of points) {
      if (state.verticalMode) {
        if (ay >= yMin - 20 && ay <= yMax + 20) {
          visibleActual.push(worldToScreen(ax, ay, camX, camY, true));
        }
      } else {
        if (ax >= xMin - 20 && ax <= xMax + 20) {
          visibleActual.push(worldToScreen(ax, ay, camX, camY, false));
        }
      }
    }

    if (visibleActual.length >= 2) {
      this.ctx.strokeStyle = colorToRgb(ACTUAL);
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(visibleActual[0][0], visibleActual[0][1]);
      for (let i = 1; i < visibleActual.length; i++) {
        this.ctx.lineTo(visibleActual[i][0], visibleActual[i][1]);
      }
      this.ctx.stroke();
    }
  }

  drawDrillHead(state: GameState, camX: number, camY: number): void {
    const head = worldToScreen(state.x, state.y, camX, camY, state.verticalMode);
    
    // Draw drill head circle
    this.ctx.fillStyle = colorToRgb(ACTUAL);
    this.ctx.beginPath();
    this.ctx.arc(head[0], head[1], 7, 0, Math.PI * 2);
    this.ctx.fill();

    // Heading indicator
    let hx: number, hy: number;
    if (state.verticalMode) {
      // In vertical mode, heading 0 = straight down, positive = right
      hx = head[0] + Math.floor(24 * Math.sin(state.heading));
      hy = head[1] + Math.floor(24 * Math.cos(state.heading));
    } else {
      // In horizontal mode, heading 0 = straight right, positive = up
      hx = head[0] + Math.floor(24 * Math.cos(state.heading));
      hy = head[1] - Math.floor(24 * Math.sin(state.heading));
    }

    this.ctx.strokeStyle = colorToRgb(ACTUAL);
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(head[0], head[1]);
    this.ctx.lineTo(hx, hy);
    this.ctx.stroke();
  }

  private formatMoney(value: number): string {
    const prefix = value >= 0 ? '$' : '-$';
    return prefix + Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  drawHUD(state: GameState, dev: number): void {
    let modeText: string, depthText: string, controlsText: string;
    if (state.verticalMode) {
      modeText = 'VERTICAL';
      depthText = `Depth Y: ${state.y.toFixed(1).padStart(7)} m / ${Y_END.toFixed(0)} m`;
      controlsText = '← → steer | T toggle | R restart';
    } else {
      modeText = 'HORIZONTAL';
      depthText = `Depth X: ${state.x.toFixed(1).padStart(7)} m / ${X_END.toFixed(0)} m`;
      controlsText = '↑ ↓ steer | T toggle | R restart';
    }

    const econ = state.economics;
    const netProfit = state.getNetProfit();
    const accuracy = state.getAccuracyPercent();

    // Left panel - Drilling Info
    const leftLines = [
      `Mode: ${modeText}`,
      depthText,
      `Deviation: ${dev.toFixed(2).padStart(6)} m`,
      `Heading: ${(state.heading * 180 / Math.PI).toFixed(1).padStart(6)}°`,
      `Outside: ${state.outsideTime.toFixed(1)} / ${MAX_OUTSIDE_SECONDS.toFixed(1)} s`,
      controlsText,
    ];

    // Background panel - left
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.ctx.fillRect(16, 16, 320, 145);

    // Text - left panel
    this.ctx.font = '16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(TEXT);
    
    let y0 = 34;
    for (const line of leftLines) {
      this.ctx.fillText(line, 26, y0);
      y0 += 20;
    }

    // Right panel - Financial Info
    const rightX = WIDTH - 300 - 16;
    
    // Background panel - right
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    this.ctx.fillRect(rightX, 16, 300, 165);

    // Title
    this.ctx.font = 'bold 16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.fillText('FINANCIALS', rightX + 10, 34);

    // Financial data
    this.ctx.font = '15px Consolas, "Courier New", monospace';
    
    // Revenue (green)
    this.ctx.fillStyle = colorToRgb(TIGHT);
    this.ctx.fillText(`Revenue:      ${this.formatMoney(econ.grossRevenue).padStart(10)}`, rightX + 10, 56);
    
    // Remediation (red)
    this.ctx.fillStyle = colorToRgb(BAD);
    this.ctx.fillText(`Remediation: ${this.formatMoney(-econ.remediationCosts).padStart(10)}`, rightX + 10, 76);
    
    // Schedule delay (yellow/orange)
    this.ctx.fillStyle = colorToRgb(OK);
    this.ctx.fillText(`Sched Delay: ${econ.scheduleVariance.toFixed(1).padStart(7)} sec`, rightX + 10, 96);
    this.ctx.fillText(`Downstream:  ${this.formatMoney(-econ.downstreamPenalty).padStart(10)}`, rightX + 10, 116);
    
    // Separator line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(rightX + 10, 126);
    this.ctx.lineTo(rightX + 290, 126);
    this.ctx.stroke();
    
    // Net profit
    this.ctx.font = 'bold 16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = netProfit >= 0 ? colorToRgb(TIGHT) : colorToRgb(BAD);
    this.ctx.fillText(`NET PROFIT:  ${this.formatMoney(netProfit).padStart(10)}`, rightX + 10, 146);
    
    // Accuracy bar
    this.ctx.fillStyle = colorToRgb(TEXT);
    this.ctx.font = '14px Consolas, "Courier New", monospace';
    this.ctx.fillText(`Accuracy: ${accuracy.toFixed(0)}%`, rightX + 10, 168);
    
    // Draw accuracy bar
    const barX = rightX + 120;
    const barWidth = 160;
    const barHeight = 10;
    const barY = 160;
    
    // Background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Fill based on accuracy
    const fillWidth = (accuracy / 100) * barWidth;
    const barColor = accuracy >= 90 ? TIGHT : accuracy >= 75 ? OK : accuracy >= 50 ? OK : BAD;
    this.ctx.fillStyle = colorToRgb(barColor);
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);
  }

  drawBanner(state: GameState, dev: number): void {
    const statusColor = dev <= TOL_TIGHT ? TIGHT : dev <= TOL_OK ? OK : BAD;

    let bannerText: string;
    if (state.failed) {
      bannerText = 'FAILED — too far off plan (press R)';
    } else if (state.finished) {
      bannerText = 'COMPLETE — nice drilling (press R)';
    } else {
      bannerText = dev <= TOL_OK ? 'ON TRACK' : 'OFF PLAN';
    }

    this.ctx.font = 'bold 28px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(statusColor);
    this.ctx.fillText(bannerText, 16, HEIGHT - 24);
  }

  drawEndReport(state: GameState): void {
    const econ = state.economics;
    const netProfit = state.getNetProfit();
    const accuracy = state.getAccuracyPercent();

    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Report box
    const boxWidth = 500;
    const boxHeight = 460;
    const boxX = (WIDTH - boxWidth) / 2;
    const boxY = (HEIGHT - boxHeight) / 2;

    // Box background
    this.ctx.fillStyle = 'rgba(20, 24, 32, 0.98)';
    this.ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Box border
    this.ctx.strokeStyle = state.failed ? colorToRgb(BAD) : colorToRgb(TIGHT);
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    // Title
    this.ctx.font = 'bold 24px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(TEXT);
    this.ctx.textAlign = 'center';
    this.ctx.fillText('DRILLING OPERATIONS REPORT', WIDTH / 2, boxY + 40);

    // Status line
    this.ctx.font = 'bold 20px Consolas, "Courier New", monospace';
    if (state.failed) {
      this.ctx.fillStyle = colorToRgb(BAD);
      this.ctx.fillText('⚠ HOLE ABANDONED - REDRILL REQUIRED ⚠', WIDTH / 2, boxY + 70);
    } else {
      this.ctx.fillStyle = colorToRgb(TIGHT);
      this.ctx.fillText('✓ DRILLING COMPLETE', WIDTH / 2, boxY + 70);
    }

    this.ctx.textAlign = 'left';
    const leftCol = boxX + 30;
    const rightCol = boxX + 280;
    let y = boxY + 110;

    // Section: Performance
    this.ctx.font = 'bold 16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.fillText('PERFORMANCE', leftCol, y);
    y += 25;

    this.ctx.font = '15px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(TEXT);
    
    const tightPct = econ.totalTime > 0 ? (econ.timeInTight / econ.totalTime * 100).toFixed(0) : '0';
    const okPct = econ.totalTime > 0 ? (econ.timeInOK / econ.totalTime * 100).toFixed(0) : '0';
    const outPct = econ.totalTime > 0 ? (econ.timeOutside / econ.totalTime * 100).toFixed(0) : '0';

    this.ctx.fillStyle = colorToRgb(TIGHT);
    this.ctx.fillText(`Time in Tight:`, leftCol, y);
    this.ctx.fillText(`${econ.timeInTight.toFixed(1)} sec (${tightPct}%)`, rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(OK);
    this.ctx.fillText(`Time in OK:`, leftCol, y);
    this.ctx.fillText(`${econ.timeInOK.toFixed(1)} sec (${okPct}%)`, rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(BAD);
    this.ctx.fillText(`Time Outside:`, leftCol, y);
    this.ctx.fillText(`${econ.timeOutside.toFixed(1)} sec (${outPct}%)`, rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(TEXT);
    this.ctx.fillText(`Total Time:`, leftCol, y);
    this.ctx.fillText(`${econ.totalTime.toFixed(1)} sec`, rightCol, y);
    y += 20;

    this.ctx.fillText(`Accuracy:`, leftCol, y);
    const accColor = accuracy >= 90 ? TIGHT : accuracy >= 75 ? OK : accuracy >= 50 ? OK : BAD;
    this.ctx.fillStyle = colorToRgb(accColor);
    this.ctx.fillText(`${accuracy.toFixed(1)}%`, rightCol, y);
    y += 35;

    // Section: Financials
    this.ctx.font = 'bold 16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.fillText('FINANCIALS', leftCol, y);
    y += 25;

    this.ctx.font = '15px Consolas, "Courier New", monospace';
    
    this.ctx.fillStyle = colorToRgb(TIGHT);
    this.ctx.fillText(`Gross Revenue:`, leftCol, y);
    this.ctx.fillText(this.formatMoney(econ.grossRevenue), rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(BAD);
    this.ctx.fillText(`Remediation Costs:`, leftCol, y);
    this.ctx.fillText(this.formatMoney(-econ.remediationCosts), rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(OK);
    this.ctx.fillText(`Schedule Delay:`, leftCol, y);
    this.ctx.fillText(`${econ.scheduleVariance.toFixed(1)} sec`, rightCol, y);
    y += 20;

    this.ctx.fillStyle = colorToRgb(BAD);
    this.ctx.fillText(`Downstream Penalty:`, leftCol, y);
    this.ctx.fillText(this.formatMoney(-econ.downstreamPenalty), rightCol, y);
    y += 20;

    // Completion bonus/penalty
    if (econ.completionBonus !== 0) {
      this.ctx.fillStyle = econ.completionBonus > 0 ? colorToRgb(TIGHT) : colorToRgb(BAD);
      const bonusLabel = econ.completionBonus > 0 ? 'Completion Bonus:' : 'Completion Penalty:';
      this.ctx.fillText(bonusLabel, leftCol, y);
      this.ctx.fillText(this.formatMoney(econ.completionBonus), rightCol, y);
      y += 20;
    }

    // Separator
    y += 5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(leftCol, y);
    this.ctx.lineTo(boxX + boxWidth - 30, y);
    this.ctx.stroke();
    y += 20;

    // Net profit
    this.ctx.font = 'bold 18px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = netProfit >= 0 ? colorToRgb(TIGHT) : colorToRgb(BAD);
    this.ctx.fillText('NET PROFIT:', leftCol, y);
    this.ctx.fillText(this.formatMoney(netProfit), rightCol, y);
    y += 35;

    // Press R to restart
    this.ctx.font = '16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(TEXT);
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Press R to restart', WIDTH / 2, y);
    this.ctx.textAlign = 'left';
  }

  render(state: GameState): void {
    this.clear();
    this.drawGrid();

    // Camera follows current position
    let camX: number, camY: number;
    let xMin: number, xMax: number, yMin: number, yMax: number;

    if (state.verticalMode) {
      camY = state.y - 40.0;
      camX = 0.0;
      yMin = Math.max(Y_START, camY - 40);
      yMax = Math.min(Y_END, camY + CAMERA_LOOKAHEAD);
      xMin = X_START;
      xMax = X_END;
    } else {
      camX = state.x - 40.0;
      camY = 0.0;
      xMin = Math.max(X_START, camX - 40);
      xMax = Math.min(X_END, camX + CAMERA_LOOKAHEAD);
      yMin = Y_START;
      yMax = Y_END;
    }

    // Draw corridor and get plan line
    const { planLine } = this.drawCorridor(state, camX, camY, xMin, xMax, yMin, yMax);
    
    // Draw plan line
    this.drawPlanLine(planLine);
    
    // Draw actual path
    this.drawActualPath(state, camX, camY, xMin, xMax, yMin, yMax);
    
    // Draw drill head
    this.drawDrillHead(state, camX, camY);

    // Calculate deviation for HUD
    let dev: number;
    if (state.verticalMode) {
      const plannedX = state.plan.x(state.y);
      dev = Math.abs(state.x - plannedX);
    } else {
      const plannedY = state.plan.y(state.x);
      dev = Math.abs(state.y - plannedY);
    }

    // Draw HUD
    this.drawHUD(state, dev);
    
    // Draw banner
    this.drawBanner(state, dev);

    // Draw end report overlay if game is over
    if (state.finished || state.failed) {
      this.drawEndReport(state);
    }
  }
}
