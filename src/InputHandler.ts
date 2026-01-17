export class InputHandler {
  private keysPressed: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.keysPressed.has(event.code)) {
      this.keysJustPressed.add(event.code);
    }
    this.keysPressed.add(event.code);
    
    // Prevent default for game keys to avoid scrolling
    // Note: KeyH is handled separately for help modal
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyT', 'KeyR', 'Escape'].includes(event.code)) {
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keysPressed.delete(event.code);
  }

  isPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  wasJustPressed(code: string): boolean {
    return this.keysJustPressed.has(code);
  }

  clearJustPressed(): void {
    this.keysJustPressed.clear();
  }

  getSteerInput(verticalMode: boolean): number {
    let steer = 0.0;
    
    if (verticalMode) {
      // Vertical mode: left/right arrows control heading
      if (this.isPressed('ArrowLeft')) steer -= 1.0;
      if (this.isPressed('ArrowRight')) steer += 1.0;
    } else {
      // Horizontal mode: up/down arrows control heading
      if (this.isPressed('ArrowUp')) steer += 1.0;
      if (this.isPressed('ArrowDown')) steer -= 1.0;
    }
    
    return steer;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}
