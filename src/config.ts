// Canvas dimensions
export const WIDTH = 1200;
export const HEIGHT = 700;
export const FPS = 60;

// World coordinates (meters-ish)
export const X_START = 0.0;
export const X_END = 800.0;
export const Y_START = 0.0;
export const Y_END = 800.0;

// Drill motion
export const FORWARD_SPEED = 60.0;       // meters/sec (constant)
export const TURN_RATE = 1.35;           // rad/sec applied by up/down (scaled by dt)
export const HEADING_INERTIA = 8.0;      // higher = slower response (simulates tool lag)

// Tolerance corridor (meters)
export const TOL_TIGHT = 4.0;
export const TOL_OK = 10.0;
export const MAX_OUTSIDE_SECONDS = 3.5;  // stay outside OK corridor too long => fail

// Legacy scoring weights per second (kept for reference)
export const PTS_TIGHT = 25.0;
export const PTS_OK = 10.0;
export const PTS_OUTSIDE = -30.0;

// ============================================
// DRILLING ECONOMICS
// ============================================

// Revenue per second based on drilling accuracy
export const REVENUE_TIGHT = 500;         // $/sec in tight corridor (optimal)
export const REVENUE_OK = 200;            // $/sec in OK corridor (acceptable)
export const COST_OUTSIDE = 800;          // $/sec outside tolerance (remediation)

// Schedule impact
export const SCHEDULE_DELAY_MULTIPLIER = 2.0;   // 1 sec outside = 2 sec schedule delay
export const SCHEDULE_RECOVERY_RATE = 0.5;      // Tight drilling recovers 0.5 sec/sec
export const DOWNSTREAM_COST_PER_SEC = 100;     // $/sec of accumulated schedule delay

// Completion bonuses/penalties (applied at end)
export const BONUS_EXCELLENT = 5000;      // >90% accuracy bonus
export const BONUS_GOOD = 2000;           // >75% accuracy bonus
export const PENALTY_POOR = -10000;       // <50% accuracy penalty
export const PENALTY_FAIL = -25000;       // Failed hole (abandon & redrill)

// Visual scaling
export const CAMERA_LOOKAHEAD = 160.0;   // meters visible ahead (world)
export const PIXELS_PER_METER = 1.2;     // world->screen scaling (x direction)
export const Y_PIXELS_PER_METER = 10.0;  // y amplification for readability

// Colors (RGB tuples)
export const BG: [number, number, number] = [16, 18, 24];
export const GRID: [number, number, number] = [40, 44, 58];
export const PLAN: [number, number, number] = [80, 200, 255];  // Cyan laser survey trace
export const ACTUAL: [number, number, number] = [255, 180, 110];  // Carved tunnel
export const TIGHT: [number, number, number] = [220, 170, 50];   // Ore gold
export const OK: [number, number, number] = [120, 110, 95];      // Acceptable rock
export const BAD: [number, number, number] = [85, 80, 75];       // Waste rock
export const TEXT: [number, number, number] = [230, 235, 245];
export const ORE_HIGHLIGHT: [number, number, number] = [255, 200, 80];  // Bright ore veins
