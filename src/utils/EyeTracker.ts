
declare global {
  interface Window {
    webgazer: any;
  }
}

export class EyeTracker {
  private isInitialized = false;
  private gazeCallback: ((data: { x: number; y: number }) => void) | null = null;
  private cursorElement: HTMLElement | null = null;
  private calibrationPoints: Array<{ x: number; y: number }> = [];
  private currentCalibrationPoint = 0;
  private calibrationOverlay: HTMLElement | null = null;

  async initialize(): Promise<boolean> {
    try {
      // Wait for WebGazer to be available
      await this.waitForWebGazer();
      
      if (!window.webgazer) {
        console.warn('WebGazer not available');
        return false;
      }

      // Request camera permission first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (error) {
        console.error('Camera permission denied:', error);
        return false;
      }

      // Initialize webgazer with proper settings
      window.webgazer.params.showVideoPreview = false;
      window.webgazer.params.showPredictionPoints = false;
      window.webgazer.params.showFaceOverlay = false;
      window.webgazer.params.showFaceFeedbackBox = false;

      await window.webgazer
        .setGazeListener((data: any) => {
          if (data && this.gazeCallback) {
            this.gazeCallback({ x: data.x, y: data.y });
            this.updateCursor(data.x, data.y);
          }
        })
        .begin();

      // Create custom cursor
      this.createGazeCursor();
      
      // Generate calibration points
      this.generateCalibrationPoints();
      
      this.isInitialized = true;
      console.log('Eye tracking initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize eye tracking:', error);
      return false;
    }
  }

  private waitForWebGazer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (window.webgazer) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('WebGazer failed to load'));
      }, 10000);
    });
  }

  private generateCalibrationPoints() {
    const padding = 100;
    const width = window.innerWidth - 2 * padding;
    const height = window.innerHeight - 2 * padding;

    this.calibrationPoints = [
      // Corners
      { x: padding, y: padding },
      { x: padding + width, y: padding },
      { x: padding, y: padding + height },
      { x: padding + width, y: padding + height },
      // Center and edges
      { x: padding + width / 2, y: padding + height / 2 },
      { x: padding + width / 2, y: padding },
      { x: padding + width / 2, y: padding + height },
      { x: padding, y: padding + height / 2 },
      { x: padding + width, y: padding + height / 2 },
    ];
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
    if (!this.isInitialized || !window.webgazer) {
      throw new Error('Eye tracker not initialized');
    }
    
    try {
      this.currentCalibrationPoint = 0;
      await this.showCalibrationUI();
    } catch (error) {
      console.error('Calibration failed:', error);
      throw error;
    }
  }

  private showCalibrationUI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create calibration overlay
      this.calibrationOverlay = document.createElement('div');
      this.calibrationOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: system-ui;
      `;

      const instructions = document.createElement('div');
      instructions.style.cssText = `
        position: absolute;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        font-size: 18px;
      `;
      instructions.innerHTML = `
        <h2 style="margin-bottom: 20px;">Eye Tracking Calibration</h2>
        <p>Look at each blue dot and click on it when it appears</p>
        <p>Point ${this.currentCalibrationPoint + 1} of ${this.calibrationPoints.length}</p>
      `;

      this.calibrationOverlay.appendChild(instructions);
      document.body.appendChild(this.calibrationOverlay);

      this.showNextCalibrationPoint(instructions, resolve, reject);
    });
  }

  private showNextCalibrationPoint(
    instructions: HTMLElement, 
    resolve: () => void, 
    reject: (error: Error) => void
  ) {
    if (this.currentCalibrationPoint >= this.calibrationPoints.length) {
      // Calibration complete
      if (this.calibrationOverlay) {
        this.calibrationOverlay.remove();
        this.calibrationOverlay = null;
      }
      console.log('Calibration completed successfully');
      resolve();
      return;
    }

    const point = this.calibrationPoints[this.currentCalibrationPoint];
    
    // Update instructions
    instructions.querySelector('p:last-child')!.textContent = 
      `Point ${this.currentCalibrationPoint + 1} of ${this.calibrationPoints.length}`;

    // Create calibration dot
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: absolute;
      width: 30px;
      height: 30px;
      background: hsl(var(--primary));
      border: 3px solid white;
      border-radius: 50%;
      cursor: pointer;
      transform: translate(-50%, -50%);
      left: ${point.x}px;
      top: ${point.y}px;
      animation: pulse 1s infinite;
      box-shadow: 0 0 20px hsl(var(--primary));
    `;

    // Add pulse animation
    if (!document.querySelector('#calibration-styles')) {
      const style = document.createElement('style');
      style.id = 'calibration-styles';
      style.textContent = `
        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    dot.addEventListener('click', () => {
      // Register the click with WebGazer
      if (window.webgazer) {
        window.webgazer.recordScreenPosition(point.x, point.y, 'click');
      }
      
      dot.remove();
      this.currentCalibrationPoint++;
      
      setTimeout(() => {
        this.showNextCalibrationPoint(instructions, resolve, reject);
      }, 500);
    });

    this.calibrationOverlay?.appendChild(dot);

    // Auto-advance after 10 seconds if not clicked
    setTimeout(() => {
      if (dot.parentNode) {
        dot.remove();
        this.currentCalibrationPoint++;
        this.showNextCalibrationPoint(instructions, resolve, reject);
      }
    }, 10000);
  }

  detectElementGaze(element: HTMLElement, dwellTime = 1000): Promise<void> {
    return new Promise((resolve) => {
      let startTime = 0;
      let isLooking = false;
      let gazeTimer: NodeJS.Timeout | null = null;

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
            
            gazeTimer = setTimeout(() => {
              element.classList.remove('gaze-hover');
              this.gazeCallback = null;
              resolve();
            }, dwellTime);
          }
        } else {
          if (isLooking) {
            isLooking = false;
            element.classList.remove('gaze-hover');
            if (gazeTimer) {
              clearTimeout(gazeTimer);
              gazeTimer = null;
            }
          }
        }
      };

      this.onGazeUpdate(checkGaze);
    });
  }

  stop() {
    try {
      if (window.webgazer && this.isInitialized) {
        window.webgazer.end();
      }
    } catch (error) {
      console.error('Error stopping WebGazer:', error);
    }
    
    if (this.cursorElement) {
      this.cursorElement.remove();
      this.cursorElement = null;
    }

    if (this.calibrationOverlay) {
      this.calibrationOverlay.remove();
      this.calibrationOverlay = null;
    }

    // Remove calibration styles
    const styles = document.querySelector('#calibration-styles');
    if (styles) {
      styles.remove();
    }
    
    this.isInitialized = false;
    this.gazeCallback = null;
  }

  isActive(): boolean {
    return this.isInitialized;
  }
}
