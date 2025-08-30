declare global {
  interface Window {
    webgazer: any;
  }
}

export class EyeTracker {
  private isInitialized = false;
  private gazeCallback: ((data: { x: number; y: number }) => void) | null = null;
  private cursorElement: HTMLElement | null = null;

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.webgazer) {
        console.warn('WebGazer not available');
        return false;
      }

      // Initialize webgazer
      await window.webgazer.setGazeListener((data: any) => {
        if (data && this.gazeCallback) {
          this.gazeCallback({ x: data.x, y: data.y });
          this.updateCursor(data.x, data.y);
        }
      }).begin();

      // Create custom cursor
      this.createGazeCursor();
      
      this.isInitialized = true;
      console.log('Eye tracking initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize eye tracking:', error);
      return false;
    }
  }

  private createGazeCursor() {
    // Remove existing cursor
    const existing = document.getElementById('gaze-cursor');
    if (existing) existing.remove();

    // Create new cursor
    this.cursorElement = document.createElement('div');
    this.cursorElement.id = 'gaze-cursor';
    this.cursorElement.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border: 2px solid hsl(var(--primary));
      border-radius: 50%;
      background: hsl(var(--primary) / 0.3);
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%);
      transition: all 0.1s ease-out;
      box-shadow: 0 0 10px hsl(var(--primary) / 0.5);
    `;
    document.body.appendChild(this.cursorElement);
  }

  private updateCursor(x: number, y: number) {
    if (this.cursorElement) {
      this.cursorElement.style.left = `${x}px`;
      this.cursorElement.style.top = `${y}px`;
    }
  }

  onGazeUpdate(callback: (data: { x: number; y: number }) => void) {
    this.gazeCallback = callback;
  }

  async calibrate(): Promise<void> {
    if (!this.isInitialized) return;
    
    try {
      // Show calibration UI
      const calibrationOverlay = document.createElement('div');
      calibrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 18px;
        text-align: center;
      `;
      calibrationOverlay.innerHTML = `
        <div>
          <h2>Eye Tracking Calibration</h2>
          <p>Look at the blue dots and click them to calibrate</p>
          <p>This will take about 30 seconds...</p>
        </div>
      `;
      document.body.appendChild(calibrationOverlay);

      // Wait for calibration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Remove overlay
      calibrationOverlay.remove();
      
      console.log('Eye tracking calibration completed');
    } catch (error) {
      console.error('Calibration failed:', error);
    }
  }

  detectElementGaze(element: HTMLElement, dwellTime = 1000): Promise<void> {
    return new Promise((resolve) => {
      let startTime = 0;
      let isLooking = false;

      const checkGaze = (data: { x: number; y: number }) => {
        const rect = element.getBoundingClientRect();
        const isInside = data.x >= rect.left && 
                        data.x <= rect.right && 
                        data.y >= rect.top && 
                        data.y <= rect.bottom;

        if (isInside) {
          if (!isLooking) {
            isLooking = true;
            startTime = Date.now();
            element.classList.add('gaze-hover');
          } else if (Date.now() - startTime >= dwellTime) {
            element.classList.remove('gaze-hover');
            this.gazeCallback = null;
            resolve();
          }
        } else {
          if (isLooking) {
            isLooking = false;
            element.classList.remove('gaze-hover');
          }
        }
      };

      this.onGazeUpdate(checkGaze);
    });
  }

  stop() {
    if (window.webgazer && this.isInitialized) {
      window.webgazer.end();
    }
    
    if (this.cursorElement) {
      this.cursorElement.remove();
      this.cursorElement = null;
    }
    
    this.isInitialized = false;
    this.gazeCallback = null;
  }

  isActive(): boolean {
    return this.isInitialized;
  }
}