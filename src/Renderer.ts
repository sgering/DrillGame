import {
  WIDTH, HEIGHT,
  PLAN, ACTUAL, TIGHT, OK, BAD, TEXT, ORE_HIGHLIGHT,
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
  private drillRigImage: HTMLImageElement | null = null;
  private drillRigLoaded: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Load drill rig image
    this.drillRigImage = new Image();
    this.drillRigImage.onload = () => {
      this.drillRigLoaded = true;
    };
    this.drillRigImage.src = '/drill-rig.png';
  }

  clear(): void {
    // Create rock texture background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, '#2a2520');
    gradient.addColorStop(0.5, '#1a1612');
    gradient.addColorStop(1, '#252018');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    // Add noise texture for rock face feel
    this.addRockTexture();
  }

  private addRockTexture(): void {
    // Create subtle noise pattern
    const imageData = this.ctx.getImageData(0, 0, WIDTH, HEIGHT);
    const data = imageData.data;
    
    // Simple noise - much faster than full Perlin
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15; // ±7.5 brightness variation
      data[i] += noise;     // R
      data[i + 1] += noise; // G
      data[i + 2] += noise; // B
    }
    
    this.ctx.putImageData(imageData, 0, 0);
  }

  drawGrid(): void {
    // Draw faint stratification lines (rock layers)
    this.ctx.strokeStyle = 'rgba(80, 70, 60, 0.15)';
    this.ctx.lineWidth = 1;
    
    // Horizontal stratification lines (rock layers)
    for (let y = 0; y < HEIGHT; y += 120) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(WIDTH, y);
      this.ctx.stroke();
    }
    
    // Very faint vertical lines (rock fractures)
    this.ctx.strokeStyle = 'rgba(70, 60, 50, 0.08)';
    for (let x = 0; x < WIDTH; x += 200) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, HEIGHT);
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

      // Draw OK corridor (acceptable rock - neutral)
      if (okLeft.length >= 2) {
        this.drawPolygon([...okLeft, ...okRight.reverse()], OK, 0.25);
      }
      // Draw tight corridor (ore vein - golden with sparkle)
      if (tightLeft.length >= 2) {
        const tightPoly = [...tightLeft, ...tightRight.reverse()];
        this.drawPolygon(tightPoly, TIGHT, 0.35);
        // Add ore vein highlights
        this.drawOreVeins(tightPoly, true);
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

      // Draw OK corridor (acceptable rock - neutral)
      if (okUpper.length >= 2) {
        this.drawPolygon([...okUpper, ...okLower.reverse()], OK, 0.25);
      }
      // Draw tight corridor (ore vein - golden with sparkle)
      if (tightUpper.length >= 2) {
        const tightPoly = [...tightUpper, ...tightLower.reverse()];
        this.drawPolygon(tightPoly, TIGHT, 0.35);
        // Add ore vein highlights
        this.drawOreVeins(tightPoly, false);
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

  private drawOreVeins(poly: Point[], _isVertical: boolean): void {
    // Add subtle ore vein sparkles
    const numSparkles = Math.floor(poly.length / 20);
    for (let i = 0; i < numSparkles; i++) {
      const idx = Math.floor((i / numSparkles) * poly.length / 2);
      const point = poly[idx];
      if (!point) continue;
      
      // Draw small sparkle
      this.ctx.fillStyle = colorToRgba(ORE_HIGHLIGHT, 0.4);
      this.ctx.beginPath();
      this.ctx.arc(point[0], point[1], 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawPlanLine(planLine: Point[]): void {
    if (planLine.length < 2) return;
    
    // Draw laser survey trace - thin glowing cyan line
    this.ctx.strokeStyle = colorToRgba(PLAN, 0.8);
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = colorToRgb(PLAN);
    this.ctx.beginPath();
    this.ctx.moveTo(planLine[0][0], planLine[0][1]);
    for (let i = 1; i < planLine.length; i++) {
      this.ctx.lineTo(planLine[i][0], planLine[i][1]);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0; // Reset shadow
  }

  drawPlannedDrillholeLabels(
    state: GameState,
    camX: number,
    camY: number,
    yMin: number,
    yMax: number,
    xMin: number,
    xMax: number
  ): void {
    const isVertical = state.verticalMode;
    
    // Calculate drill rig size for proper label offset
    const imgScale = 0.12;
    const drillRigWidth = this.drillRigImage ? this.drillRigImage.width * imgScale : 0;
    const drillRigHeight = this.drillRigImage ? this.drillRigImage.height * imgScale : 0;
    
    if (isVertical) {
      // Check if collar (start at Y_START) is visible
      if (Y_START >= yMin - 20 && Y_START <= yMax + 20) {
        const plannedX = state.plan.x(Y_START);
        const [sx, sy] = worldToScreen(plannedX, Y_START, camX, camY, true);
        // In vertical mode, drill rig extends above, so position label further up
        const extraOffset = drillRigWidth + 20; // Rotated, so width becomes vertical extent
        this.drawPlanLabel('Planned Collar', sx, sy, 'top', extraOffset);
      }
      
      // Check if toe (end at Y_END) is visible
      if (Y_END >= yMin - 20 && Y_END <= yMax + 20) {
        const plannedX = state.plan.x(Y_END);
        const [sx, sy] = worldToScreen(plannedX, Y_END, camX, camY, true);
        this.drawPlanLabel('Planned Toe', sx, sy, 'bottom', 0);
      }
    } else {
      // Check if collar (start at X_START) is visible
      if (X_START >= xMin - 20 && X_START <= xMax + 20) {
        const plannedY = state.plan.y(X_START);
        const [sx, sy] = worldToScreen(X_START, plannedY, camX, camY, false);
        // In horizontal mode, drill rig extends to the left
        const extraOffset = drillRigWidth + 30;
        this.drawPlanLabel('Planned Collar', sx, sy, 'left', extraOffset);
      }
      
      // Check if toe (end at X_END) is visible
      if (X_END >= xMin - 20 && X_END <= xMax + 20) {
        const plannedY = state.plan.y(X_END);
        const [sx, sy] = worldToScreen(X_END, plannedY, camX, camY, false);
        this.drawPlanLabel('Planned Toe', sx, sy, 'right', 0);
      }
    }
  }

  private drawPlanLabel(text: string, x: number, y: number, position: 'top' | 'bottom' | 'left' | 'right', extraOffset: number = 0): void {
    this.ctx.font = 'bold 13px Consolas, "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Calculate text dimensions for background
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = 13;
    const padding = 6;

    // Position offset from the point
    let offsetX = 0;
    let offsetY = 0;
    
    switch (position) {
      case 'top':
        // Position further above to avoid drill rig overlap
        // Base offset plus any extra offset for drill rig
        offsetY = -(30 + extraOffset);
        break;
      case 'bottom':
        offsetY = 30 + extraOffset;
        break;
      case 'left':
        // Position further left to avoid drill rig overlap in horizontal mode
        offsetX = -(70 + extraOffset);
        break;
      case 'right':
        offsetX = 70 + extraOffset;
        break;
    }

    const labelX = x + offsetX;
    const labelY = y + offsetY;

    // Draw background rectangle with slight transparency
    this.ctx.fillStyle = 'rgba(0, 20, 30, 0.85)';
    this.ctx.fillRect(
      labelX - textWidth / 2 - padding,
      labelY - textHeight / 2 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw border with cyan glow to match the plan line
    this.ctx.strokeStyle = colorToRgb(PLAN);
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = colorToRgb(PLAN);
    this.ctx.strokeRect(
      labelX - textWidth / 2 - padding,
      labelY - textHeight / 2 - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );
    this.ctx.shadowBlur = 0;

    // Draw connecting line from label to point
    this.ctx.strokeStyle = colorToRgba(PLAN, 0.6);
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([3, 3]); // Dashed line
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(labelX, labelY);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset to solid line

    // Draw text with cyan color to match plan line
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.shadowBlur = 3;
    this.ctx.shadowColor = colorToRgb(PLAN);
    this.ctx.fillText(text, labelX, labelY);
    this.ctx.shadowBlur = 0;
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
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
      // Draw carved tunnel - wider with rough edges
      // Outer darker edge
      this.ctx.strokeStyle = 'rgba(60, 50, 40, 0.6)';
      this.ctx.lineWidth = 8;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      this.ctx.moveTo(visibleActual[0][0], visibleActual[0][1]);
      for (let i = 1; i < visibleActual.length; i++) {
        this.ctx.lineTo(visibleActual[i][0], visibleActual[i][1]);
      }
      this.ctx.stroke();
      
      // Inner carved tunnel
      this.ctx.strokeStyle = colorToRgba(ACTUAL, 0.9);
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(visibleActual[0][0], visibleActual[0][1]);
      for (let i = 1; i < visibleActual.length; i++) {
        this.ctx.lineTo(visibleActual[i][0], visibleActual[i][1]);
      }
      this.ctx.stroke();
    }
  }

  drawDrillRig(state: GameState, camX: number, camY: number): void {
    if (!this.drillRigLoaded || !this.drillRigImage) return;

    // Get the starting position of the drill hole
    let startX: number, startY: number;
    if (state.verticalMode) {
      // Vertical mode: drill starts at top (Y_START)
      const plannedX = state.plan.x(Y_START);
      [startX, startY] = worldToScreen(plannedX, Y_START, camX, camY, true);
    } else {
      // Horizontal mode: drill starts at left (X_START)
      const plannedY = state.plan.y(X_START);
      [startX, startY] = worldToScreen(X_START, plannedY, camX, camY, false);
    }

    // Scale the image to fit nicely
    const imgScale = 0.12;
    const imgWidth = this.drillRigImage.width * imgScale;
    const imgHeight = this.drillRigImage.height * imgScale;

    // Position the drill rig at the start of the hole
    if (state.verticalMode) {
      // For vertical mode, position above the start point, rotated to point down
      this.ctx.save();
      this.ctx.translate(startX, startY - imgHeight / 2);
      this.ctx.rotate(Math.PI / 2); // Rotate 90° to point downward
      this.ctx.drawImage(
        this.drillRigImage,
        -imgWidth / 2,
        -imgHeight / 2,
        imgWidth,
        imgHeight
      );
      this.ctx.restore();
    } else {
      // For horizontal mode, position to the left of the start point
      this.ctx.drawImage(
        this.drillRigImage,
        startX - imgWidth - 10,
        startY - imgHeight / 2,
        imgWidth,
        imgHeight
      );
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

    // Draw large "DRILL" watermark in center background
    this.drawDrillWatermark();

    // Left panel - Drilling Info
    const leftLines = [
      depthText,
      `Deviation: ${dev.toFixed(2).padStart(6)} m`,
      `Heading: ${(state.heading * 180 / Math.PI).toFixed(1).padStart(6)}°`,
      `Outside: ${state.outsideTime.toFixed(1)} / ${MAX_OUTSIDE_SECONDS.toFixed(1)} s`,
      '',
      controlsText,
    ];

    // Background panel - left (darker and more opaque)
    this.ctx.fillStyle = 'rgba(15, 20, 30, 0.85)';
    this.ctx.fillRect(16, 16, 280, 165);
    
    // Panel border
    this.ctx.strokeStyle = 'rgba(100, 120, 140, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(16, 16, 280, 165);

    // Mode header with colored dot indicator
    this.ctx.font = '14px Consolas, "Courier New", monospace';
    const modeColor = state.verticalMode ? [255, 0, 180] : [0, 200, 255]; // Pink for vertical, cyan for horizontal
    
    // Draw dot indicator
    this.ctx.fillStyle = `rgb(${modeColor[0]}, ${modeColor[1]}, ${modeColor[2]})`;
    this.ctx.beginPath();
    this.ctx.arc(26, 30, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw mode text
    this.ctx.fillStyle = `rgb(${modeColor[0]}, ${modeColor[1]}, ${modeColor[2]})`;
    this.ctx.fillText(`MODE: ${modeText}`, 40, 34);

    // Text - left panel data
    this.ctx.font = '15px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(TEXT);
    
    let y0 = 58;
    for (const line of leftLines) {
      if (line === '') {
        y0 += 10; // Extra spacing
        continue;
      }
      this.ctx.fillText(line, 26, y0);
      y0 += 20;
    }

    // Right panel - Financial Info
    const rightX = WIDTH - 280 - 16;
    
    // Background panel - right (darker and more opaque)
    this.ctx.fillStyle = 'rgba(15, 20, 30, 0.85)';
    this.ctx.fillRect(rightX, 16, 280, 185);
    
    // Panel border
    this.ctx.strokeStyle = 'rgba(100, 120, 140, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(rightX, 16, 280, 185);

    // Title
    this.ctx.font = '14px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.fillText('FINANCIALS', rightX + 10, 34);

    // Financial data
    this.ctx.font = '15px Consolas, "Courier New", monospace';
    
    let yPos = 58;
    
    // Revenue (green)
    this.ctx.fillStyle = colorToRgb(TIGHT);
    this.ctx.fillText(`Revenue:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(this.formatMoney(econ.grossRevenue), rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 20;
    
    // Remediation (red)
    this.ctx.fillStyle = colorToRgb(BAD);
    this.ctx.fillText(`Remediation:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(this.formatMoney(-econ.remediationCosts), rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 20;
    
    // Schedule delay (yellow/orange)
    this.ctx.fillStyle = colorToRgb(OK);
    this.ctx.fillText(`Sched Delay:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${econ.scheduleVariance.toFixed(1)} sec`, rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 20;
    
    this.ctx.fillStyle = colorToRgb(OK);
    this.ctx.fillText(`Downstream:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(this.formatMoney(-econ.downstreamPenalty), rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 8;
    
    // Separator line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(rightX + 10, yPos);
    this.ctx.lineTo(rightX + 270, yPos);
    this.ctx.stroke();
    yPos += 20;
    
    // Net profit
    this.ctx.font = 'bold 16px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = netProfit >= 0 ? colorToRgb(TIGHT) : colorToRgb(BAD);
    this.ctx.fillText(`NET PROFIT:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(this.formatMoney(netProfit), rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 25;
    
    // Accuracy bar
    this.ctx.fillStyle = colorToRgb(TEXT);
    this.ctx.font = '14px Consolas, "Courier New", monospace';
    this.ctx.fillText(`Accuracy:`, rightX + 10, yPos);
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${accuracy.toFixed(0)}%`, rightX + 270, yPos);
    this.ctx.textAlign = 'left';
    yPos += 10;
    
    // Draw accuracy bar
    const barX = rightX + 10;
    const barWidth = 260;
    const barHeight = 10;
    const barY = yPos;
    
    // Background
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Fill based on accuracy
    const fillWidth = (accuracy / 100) * barWidth;
    const barColor = accuracy >= 90 ? TIGHT : accuracy >= 75 ? OK : accuracy >= 50 ? OK : BAD;
    this.ctx.fillStyle = colorToRgb(barColor);
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);
  }

  private drawDrillWatermark(): void {
    // Draw large "DRILL" text in center background
    this.ctx.save();
    this.ctx.font = 'bold 180px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = 'rgba(40, 50, 60, 0.15)';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('DRILL', WIDTH / 2, HEIGHT / 2);
    this.ctx.restore();
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
      // Check if net profit exceeds $10,000 for "Nice Job" message
      const isExcellentProfit = netProfit > 10000;
      this.ctx.fillStyle = isExcellentProfit ? colorToRgb(TIGHT) : colorToRgb(TIGHT);
      const statusText = isExcellentProfit ? '✓ DRILLING COMPLETE - Nice Job' : '✓ DRILLING COMPLETE';
      this.ctx.fillText(statusText, WIDTH / 2, boxY + 70);
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

    // Net profit - use green for profits over $10,000
    this.ctx.font = 'bold 18px Consolas, "Courier New", monospace';
    let profitColor: Color;
    if (netProfit > 10000) {
      profitColor = TIGHT; // Green for excellent profit
    } else if (netProfit >= 0) {
      profitColor = OK; // Yellow for positive profit
    } else {
      profitColor = BAD; // Red for loss
    }
    this.ctx.fillStyle = colorToRgb(profitColor);
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

  private drawVignette(state: GameState, camX: number, camY: number): void {
    // Create headlamp vignette - dark edges for tunnel confinement feel
    const drillHead = worldToScreen(state.x, state.y, camX, camY, state.verticalMode);
    
    // Create radial gradient from drill head
    const gradient = this.ctx.createRadialGradient(
      drillHead[0], drillHead[1], 100,
      drillHead[0], drillHead[1], WIDTH * 0.7
    );
    
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');       // Clear at center
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');   // Slight darkening
    gradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.5)');   // Darker edges
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.75)');    // Dark corners
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  render(state: GameState, countdownActive: boolean = false, countdownMessage: string = ''): void {
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
    
    // Draw planned drillhole labels (Collar and Toe) only when visible
    this.drawPlannedDrillholeLabels(state, camX, camY, yMin, yMax, xMin, xMax);
    
    // Draw actual path
    this.drawActualPath(state, camX, camY, xMin, xMax, yMin, yMax);
    
    // Draw drill rig at the start of the hole
    this.drawDrillRig(state, camX, camY);
    
    // Draw drill head
    this.drawDrillHead(state, camX, camY);

    // Apply headlamp vignette for underground feel
    this.drawVignette(state, camX, camY);

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

    // Draw countdown overlay if active (takes priority over end report)
    if (countdownActive && countdownMessage) {
      this.drawCountdown(countdownMessage);
    } else if (state.finished || state.failed) {
      // Draw end report overlay if game is over (but not during countdown)
      this.drawEndReport(state);
    }
  }

  private drawCountdown(message: string): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw large centered message
    this.ctx.font = 'bold 48px Consolas, "Courier New", monospace';
    this.ctx.fillStyle = colorToRgb(PLAN);
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Add glow effect
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = colorToRgb(PLAN);
    
    this.ctx.fillText(message, WIDTH / 2, HEIGHT / 2);
    
    // Reset shadow
    this.ctx.shadowBlur = 0;
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';
  }
}
