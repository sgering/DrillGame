import { GameEngine } from './GameEngine';

function updateModeButton(verticalMode: boolean): void {
  const modeText = document.getElementById('mode-text');
  if (modeText) {
    modeText.textContent = verticalMode ? 'VERTICAL' : 'HORIZONTAL';
    modeText.classList.toggle('vertical', verticalMode);
  }
}

// Help Modal Functions
function openHelpModal(): void {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.style.display = 'flex';
    
    // Add event listeners
    const overlay = modal;
    const closeX = document.getElementById('help-close-x');
    const closeFooter = document.getElementById('help-close-footer');
    
    // Close on overlay click (but not on modal content click)
    overlay.addEventListener('click', handleOverlayClick);
    
    // Close on X button click
    closeX?.addEventListener('click', closeHelpModal);
    
    // Close on footer button click
    closeFooter?.addEventListener('click', closeHelpModal);
    
    // Close on ESC key
    document.addEventListener('keydown', handleEscKey);
  }
}

function closeHelpModal(): void {
  const modal = document.getElementById('help-modal');
  if (modal) {
    modal.style.display = 'none';
    
    // Remove event listeners
    const overlay = modal;
    const closeX = document.getElementById('help-close-x');
    const closeFooter = document.getElementById('help-close-footer');
    
    overlay.removeEventListener('click', handleOverlayClick);
    closeX?.removeEventListener('click', closeHelpModal);
    closeFooter?.removeEventListener('click', closeHelpModal);
    document.removeEventListener('keydown', handleEscKey);
  }
}

function handleOverlayClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  // Only close if clicking directly on the overlay (not the modal content)
  if (target.id === 'help-modal' || target.classList.contains('modal-overlay')) {
    closeHelpModal();
  }
}

function handleEscKey(event: KeyboardEvent): void {
  if (event.code === 'Escape') {
    closeHelpModal();
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const modeToggle = document.getElementById('mode-toggle');
  const restartBtn = document.getElementById('restart-btn');
  const helpBtn = document.getElementById('help-btn');
  
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

  // Wire up help button
  helpBtn?.addEventListener('click', () => {
    openHelpModal();
  });

  // Handle H key for help
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyH') {
      openHelpModal();
    }
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
