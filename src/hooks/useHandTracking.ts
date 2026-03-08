import { useEffect, useRef, useState, useCallback } from 'react';

// Interface for gesture state management
interface GestureState {
  type: 'scroll' | 'peace' | 'pointing' | 'none';
  confidence: number;
}

// Cursor position for pointing gesture
interface CursorPosition {
  x: number;
  y: number;
  visible: boolean;
}

// Performance monitoring interface
interface PerformanceMetrics {
  frameProcessingTime: number;
  averageProcessingTime: number;
  skippedFrames: number;
  processedFrames: number;
}

// Return type for the hand tracking hook
interface HandTrackingResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  gestureState: GestureState;
  cursorPosition: CursorPosition;
  logs: string[];
  startHandTracking: () => Promise<void>;
  stopHandTracking: () => void;
  isInitialized: boolean;
  currentGesture: string;
  error: string | null;
  isMobile: boolean;
  performanceMetrics: PerformanceMetrics;
}

// Pre-computed skeleton connections (avoid recreating every frame)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const FINGER_TIPS = [8, 12, 16, 20];
const FINGER_PIPS = [6, 10, 14, 18];

/**
 * Hand Tracking Hook using MediaPipe Hands (Performance Optimized)
 * @version 2
 */
export const useHandTracking = (): HandTrackingResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Only essential state that drives UI re-renders
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Use refs for high-frequency updates (gesture, cursor, metrics) to avoid re-renders
  const gestureStateRef = useRef<GestureState>({ type: 'none', confidence: 0 });
  const cursorPositionRef = useRef<CursorPosition>({ x: 0, y: 0, visible: false });
  const currentGestureRef = useRef('No gesture detected');
  const performanceMetricsRef = useRef<PerformanceMetrics>({
    frameProcessingTime: 0, averageProcessingTime: 0, skippedFrames: 0, processedFrames: 0
  });

  // Batched state for UI — updated at lower frequency
  const [gestureState, setGestureState] = useState<GestureState>({ type: 'none', confidence: 0 });
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0, visible: false });
  const [currentGesture, setCurrentGesture] = useState('No gesture detected');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameProcessingTime: 0, averageProcessingTime: 0, skippedFrames: 0, processedFrames: 0
  });

  // UI sync timer — flush ref values to state at ~30fps for smoother cursor
  const uiSyncRAF = useRef<number | null>(null);
  const lastUISyncRef = useRef(0);

  const syncUIState = useCallback(() => {
    const now = performance.now();
    if (now - lastUISyncRef.current < 33) return; // ~30fps UI updates
    lastUISyncRef.current = now;

    const gs = gestureStateRef.current;
    const cp = cursorPositionRef.current;
    setGestureState(prev =>
      prev.type !== gs.type || prev.confidence !== gs.confidence ? gs : prev
    );
    setCursorPosition(prev =>
      prev.x !== cp.x || prev.y !== cp.y || prev.visible !== cp.visible ? { ...cp } : prev
    );
    setCurrentGesture(currentGestureRef.current);
  }, []);

  // Refs for MediaPipe and gesture tracking
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastClickTimeRef = useRef<number>(0);
  const frameThrottleRef = useRef<number>(0);
  const lastGestureRef = useRef<string>('none');
  const frameSkipCounterRef = useRef<number>(0);
  const performanceTimesRef = useRef<number[]>([]);
  const smoothCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevRawCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cursorActivatedRef = useRef(false);
  const handLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandYRef = useRef<number | null>(null);
  const scrollVelocityRef = useRef<number>(0);
  const scrollMomentumRAF = useRef<number | null>(null);

  // Cache screen dimensions (avoid reading every frame)
  const screenDimsRef = useRef({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const update = () => { screenDimsRef.current = { w: window.innerWidth, h: window.innerHeight }; };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Mobile device detection
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobile(mobile);
    };
    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, []);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-4), logEntry]);
  }, []);

  /**
   * Fast finger counting — no optional chaining in hot path
   */
  const countExtendedFingers = useCallback((landmarks: any[]) => {
    let count = 0;
    // Thumb
    if (landmarks[4].x > landmarks[3].x) count++;
    // Other fingers
    for (let i = 0; i < 4; i++) {
      if (landmarks[FINGER_TIPS[i]].y < landmarks[FINGER_PIPS[i]].y) count++;
    }
    return count;
  }, []);

  const detectGesture = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 'unknown';
    const extendedFingers = countExtendedFingers(landmarks);
    
    switch (extendedFingers) {
      case 1: {
        const indexUp = landmarks[8].y < landmarks[6].y;
        const middleFolded = landmarks[12].y > landmarks[10].y;
        return (indexUp && middleFolded) ? 'pointing' : 'scroll';
      }
      case 2: {
        const indexExt = landmarks[8].y < landmarks[6].y;
        const middleExt = landmarks[12].y < landmarks[10].y;
        const ringFolded = landmarks[16].y > landmarks[14].y;
        const pinkyFolded = landmarks[20].y > landmarks[18].y;
        return (indexExt && middleExt && ringFolded && pinkyFolded) ? 'peace' : 'scroll';
      }
      default:
        return 'scroll';
    }
  }, [countExtendedFingers]);

  const handleGesture = useCallback((gesture: string, landmarks?: any[]) => {
    const now = Date.now();
    const screen = screenDimsRef.current;
    
    switch (gesture) {
      case 'scroll':
        if (landmarks && landmarks[0]) {
          const currentY = landmarks[0].y;
          if (lastHandYRef.current !== null) {
            const delta = currentY - lastHandYRef.current;
            if (Math.abs(delta) > 0.005) {
              const targetVelocity = delta * 1000;
              // Smooth velocity transition for less jerky scrolling
              scrollVelocityRef.current = scrollVelocityRef.current * 0.6 + targetVelocity * 0.4;
              window.scrollBy({ top: scrollVelocityRef.current });
              currentGestureRef.current = delta > 0 ? '👇 Scrolling DOWN' : '👆 Scrolling UP';
            }
          }
          lastHandYRef.current = currentY;
        }
        gestureStateRef.current = { type: 'scroll', confidence: 0.9 };
        break;

      case 'pointing':
        if (scrollMomentumRAF.current) {
          cancelAnimationFrame(scrollMomentumRAF.current);
          scrollMomentumRAF.current = null;
          scrollVelocityRef.current = 0;
        }
        if (landmarks && landmarks[8]) {
          if (handLostTimerRef.current) {
            clearTimeout(handLostTimerRef.current);
            handLostTimerRef.current = null;
          }
          cursorActivatedRef.current = true;
          lastHandYRef.current = null;
          
          const rawX = (1 - landmarks[8].x) * screen.w;
          const rawY = landmarks[8].y * screen.h;

          // Velocity-adaptive smoothing: fast movements get less smoothing for responsiveness,
          // slow movements get more smoothing for precision
          const prev = smoothCursorRef.current;
          const prevRaw = prevRawCursorRef.current;
          const velocity = Math.hypot(rawX - prevRaw.x, rawY - prevRaw.y);
          prevRawCursorRef.current = { x: rawX, y: rawY };
          
          // Adaptive lerp: 0.15 for tiny movements (stable), 0.6 for fast sweeps (responsive)
          const smoothing = Math.min(0.6, Math.max(0.15, velocity / 200));
          const smoothX = prev.x + (rawX - prev.x) * smoothing;
          const smoothY = prev.y + (rawY - prev.y) * smoothing;
          smoothCursorRef.current = { x: smoothX, y: smoothY };

          // Snap-to interactive element
          let finalX = smoothX;
          let finalY = smoothY;
          const elUnder = document.elementFromPoint(smoothX, smoothY);
          if (elUnder) {
            const interactive = elUnder.closest('button, a, [role="button"], input, select, textarea, [tabindex]');
            if (interactive) {
              const rect = interactive.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const dist = Math.hypot(smoothX - cx, smoothY - cy);
              if (dist < 30 + Math.max(rect.width, rect.height) / 2) {
                finalX = cx;
                finalY = cy;
              }
            }
          }

          cursorPositionRef.current = { x: finalX, y: finalY, visible: true };
        }
        currentGestureRef.current = '☝️ Pointing → Cursor Mode';
        gestureStateRef.current = { type: 'pointing', confidence: 0.9 };
        break;
        
      case 'peace':
        if (now - lastClickTimeRef.current > 1000) {
          currentGestureRef.current = '✌️ Peace sign detected → CLICK';
          gestureStateRef.current = { type: 'peace', confidence: 0.9 };
          addLog('Peace sign gesture detected - Clicking element under cursor');
          const cp = cursorPositionRef.current;
          if (cp.visible) {
            const el = document.elementFromPoint(cp.x, cp.y) as HTMLElement;
            if (el) {
              el.click();
              addLog(`Clicked element: <${el.tagName.toLowerCase()}>`);
            }
          }
          lastClickTimeRef.current = now;
        } else {
          currentGestureRef.current = '✌️ Peace sign detected → CLICK (cooldown)';
          gestureStateRef.current = { type: 'peace', confidence: 0.5 };
        }
        break;
        
      default:
        currentGestureRef.current = '👋 Hand detected → No action';
        gestureStateRef.current = { type: 'none', confidence: 0 };
    }
  }, [addLog]);

  /**
   * Optimized frame processor — minimal allocations, batched UI updates
   */
  const onResults = useCallback((results: any) => {
    const frameStartTime = performance.now();
    
    // Frame skipping — mobile only, skip every other frame
    if (isMobile) {
      frameSkipCounterRef.current++;
      if (frameSkipCounterRef.current % 2 === 0) return;
    }
    
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and draw video
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (videoRef.current.readyState >= 2) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    }
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      if (!landmarks || landmarks.length < 21) return;
      
      // Draw landmarks — batch fill calls
      const cw = canvas.width;
      const ch = canvas.height;
      
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        const x = lm.x * cw;
        const y = lm.y * ch;
        ctx.moveTo(x + 4, y);
        ctx.arc(x, y, 4, 0, 6.283);
      }
      ctx.fill();
      
      // Draw skeleton — single path
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < HAND_CONNECTIONS.length; i++) {
        const [s, e] = HAND_CONNECTIONS[i];
        const sp = landmarks[s];
        const ep = landmarks[e];
        ctx.moveTo(sp.x * cw, sp.y * ch);
        ctx.lineTo(ep.x * cw, ep.y * ch);
      }
      ctx.stroke();
      
      // Cancel hand-lost timer
      if (handLostTimerRef.current) {
        clearTimeout(handLostTimerRef.current);
        handLostTimerRef.current = null;
      }
      
      // Detect and handle gesture
      const gesture = detectGesture(landmarks);
      if (gesture === 'pointing' || gesture === 'scroll') {
        handleGesture(gesture, landmarks);
      } else if (gesture !== lastGestureRef.current) {
        handleGesture(gesture, landmarks);
      }
      lastGestureRef.current = gesture;
    } else {
      // Hand lost — momentum scrolling
      if (lastGestureRef.current === 'scroll' && Math.abs(scrollVelocityRef.current) > 1) {
        if (!scrollMomentumRAF.current) {
          const decelerate = () => {
            scrollVelocityRef.current *= 0.92;
            if (Math.abs(scrollVelocityRef.current) > 0.5) {
              window.scrollBy({ top: scrollVelocityRef.current });
              scrollMomentumRAF.current = requestAnimationFrame(decelerate);
            } else {
              scrollVelocityRef.current = 0;
              scrollMomentumRAF.current = null;
              lastHandYRef.current = null;
            }
          };
          scrollMomentumRAF.current = requestAnimationFrame(decelerate);
        }
      }

      // Cursor hide with delay
      if (cursorActivatedRef.current && !handLostTimerRef.current) {
        handLostTimerRef.current = setTimeout(() => {
          cursorPositionRef.current = { ...cursorPositionRef.current, visible: false };
          cursorActivatedRef.current = false;
          handLostTimerRef.current = null;
        }, 3000);
      }
      currentGestureRef.current = 'No hand detected';
      gestureStateRef.current = { type: 'none', confidence: 0 };
    }
    
    // Performance tracking (ref-only, no state)
    const processingTime = performance.now() - frameStartTime;
    performanceTimesRef.current.push(processingTime);
    if (performanceTimesRef.current.length > 30) performanceTimesRef.current.shift();
    
    // Sync refs → state for UI
    syncUIState();
  }, [detectGesture, handleGesture, isMobile, syncUIState]);

  // Update performance metrics state at low frequency
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      const times = performanceTimesRef.current;
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        setPerformanceMetrics({
          frameProcessingTime: times[times.length - 1],
          averageProcessingTime: avg,
          skippedFrames: 0,
          processedFrames: times.length
        });
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isActive]);

  /**
   * Initializes MediaPipe Hands and camera
   */
  const initializeHandTracking = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      addLog('Initializing hand tracking...');
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not found - DOM elements not ready');
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }
      
      addLog('Loading MediaPipe libraries (CDN)...');
      
      const loadScript = (src: string) =>
        new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) return resolve();
          const s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error(`Failed to load script ${src}`));
          document.head.appendChild(s);
        });

      await Promise.all([
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'),
        loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js')
      ]);
      
      addLog('MediaPipe libraries loaded successfully');
      
      let hands;
      try {
        hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
      } catch (constructorError: any) {
        throw new Error(`Failed to create Hands instance: ${constructorError?.message || constructorError}`);
      }
      
      const settings = isMobile
        ? { maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.4, minTrackingConfidence: 0.25 }
        : { maxNumHands: 1, modelComplexity: 0, minDetectionConfidence: 0.45, minTrackingConfidence: 0.3 };
      
      hands.setOptions(settings);
      addLog(`🎯 Applied ${isMobile ? 'mobile' : 'desktop'} optimized settings`);
      
      hands.onResults(onResults);
      handsRef.current = hands;
      
      addLog('Initializing camera...');
      
      const camW = isMobile ? 320 : 480;
      const camH = isMobile ? 240 : 360;
      
      const camera = new (window as any).Camera(videoRef.current, {
        onFrame: async () => {
          try {
            if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              await handsRef.current.send({ image: videoRef.current });
            }
          } catch (frameError) {
            // Silently handle frame errors to avoid console spam
          }
        },
        width: camW,
        height: camH
      });
      
      addLog(`📹 Camera initialized: ${camW}x${camH}`);
      cameraRef.current = camera;
      
      const cameraStartPromise = camera.start();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000)
      );
      
      await Promise.race([cameraStartPromise, timeoutPromise]);
      
      setIsInitialized(true);
      setIsActive(true);
      setIsLoading(false);
      addLog('✅ Hand tracking initialized successfully');
      
    } catch (err) {
      console.error('Failed to initialize hand tracking:', err);
      let errorMessage = 'Failed to initialize hand tracking';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
          errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        } else if (err.message.includes('NotFoundError') || err.message.includes('No camera found')) {
          errorMessage = 'No camera found. Please ensure a camera is connected.';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
      addLog(`❌ Error: ${errorMessage}`);
    }
  }, [onResults, addLog, isMobile]);

  const startHandTracking = useCallback(async () => {
    if (!isInitialized) {
      await initializeHandTracking();
    } else if (cameraRef.current) {
      await cameraRef.current.start();
      setIsActive(true);
      addLog('Hand tracking resumed');
    }
  }, [isInitialized, initializeHandTracking, addLog]);

  const stopHandTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setIsActive(false);
      gestureStateRef.current = { type: 'none', confidence: 0 };
      setGestureState({ type: 'none', confidence: 0 });
      addLog('Hand tracking stopped');
    }
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (handLostTimerRef.current) clearTimeout(handLostTimerRef.current);
      if (scrollMomentumRAF.current) cancelAnimationFrame(scrollMomentumRAF.current);
      if (uiSyncRAF.current) cancelAnimationFrame(uiSyncRAF.current);
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    gestureState,
    cursorPosition,
    logs,
    startHandTracking,
    stopHandTracking,
    isInitialized,
    currentGesture,
    error,
    isMobile,
    performanceMetrics
  };
};
