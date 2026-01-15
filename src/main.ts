import { GameEngine } from './GameEngine';

function updateModeButton(verticalMode: boolean): void {
  const modeText = document.getElementById('mode-text');
  if (modeText) {
    modeText.textContent = verticalMode ? 'VERTICAL' : 'HORIZONTAL';
    modeText.classList.toggle('vertical', verticalMode);
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const modeToggle = document.getElementById('mode-toggle');
  const restartBtn = document.getElementById('restart-btn');
  
  if (!canvas) {
    console.error('Could not find game canvas element');
    return;
  }

  const engine = new GameEngine(canvas);
  
  // Set up mode change callback to update UI
  engine.setModeChangeCallback((verticalMode) => {
    updateModeButton(verticalMode);
  });

  // Wire up mode toggle button
  modeToggle?.addEventListener('click', () => {
    engine.toggleMode();
  });

  // Wire up restart button
  restartBtn?.addEventListener('click', () => {
    engine.restart();
  });

  // Initialize button state
  updateModeButton(engine.isVerticalMode());

  engine.start();

  // Handle page visibility (pause when tab hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Game continues but time will jump when returning
      // For a more complete implementation, you could pause the game
    }
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
