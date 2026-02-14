import { useEffect, useRef, useState, useCallback } from 'react';

// Interface for gesture state management
interface GestureState {
  type: 'fist' | 'open' | 'peace' | 'pointing' | 'none';
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

/**
 * Hand Tracking Hook using MediaPipe Hands (Mobile Optimized)
 * 
 * This hook implements:
 * - Real-time hand detection via webcam with mobile optimizations
 * - Gesture recognition (fist, open hand, peace sign)
 * - Smooth page scrolling based on gestures
 * - Button clicking with cooldown mechanism
 * - Visual feedback with hand landmarks
 * - Mobile device detection and adaptive performance settings
 * - Frame processing optimization with performance monitoring
 */
export const useHandTracking = (): HandTrackingResult => {
  // Refs for video and canvas elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State management
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gestureState, setGestureState] = useState<GestureState>({ type: 'none', confidence: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('No gesture detected');
  const [error, setError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0, visible: false });
  
  // Mobile detection and performance state
  const [isMobile, setIsMobile] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameProcessingTime: 0,
    averageProcessingTime: 0,
    skippedFrames: 0,
    processedFrames: 0
  });
  
  // Refs for MediaPipe and gesture tracking
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastClickTimeRef = useRef<number>(0);
  const frameThrottleRef = useRef<number>(0);
  const lastGestureRef = useRef<string>('none');
  const frameSkipCounterRef = useRef<number>(0);
  const performanceTimesRef = useRef<number[]>([]);
  const smoothCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mobile device detection on hook initialization
  useEffect(() => {
    const detectMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobile(mobile);
      
      if (mobile) {
        addLog('📱 Mobile device detected - Optimized settings enabled');
        console.log('🚀 [HandTracking] Mobile device detected, using optimized settings');
      } else {
        addLog('💻 Desktop device detected - Standard settings enabled');
        console.log('🚀 [HandTracking] Desktop device detected, using standard settings');
      }
    };
    
    detectMobile();
    window.addEventListener('resize', detectMobile);
    return () => window.removeEventListener('resize', detectMobile);
  }, []);

  /**
   * Updates performance metrics with frame processing times
   */
  const updatePerformanceMetrics = useCallback((processingTime: number, skipped: boolean = false) => {
    if (skipped) {
      setPerformanceMetrics(prev => ({
        ...prev,
        skippedFrames: prev.skippedFrames + 1
      }));
      return;
    }

    performanceTimesRef.current.push(processingTime);
    if (performanceTimesRef.current.length > 30) {
      performanceTimesRef.current.shift(); // Keep only last 30 measurements
    }

    const avgTime = performanceTimesRef.current.reduce((a, b) => a + b, 0) / performanceTimesRef.current.length;
    
    setPerformanceMetrics(prev => ({
      frameProcessingTime: processingTime,
      averageProcessingTime: avgTime,
      skippedFrames: prev.skippedFrames,
      processedFrames: prev.processedFrames + 1
    }));

    // Log performance warnings for mobile devices
    if (isMobile && avgTime > 50) {
      console.warn(`⚠️ [HandTracking] High processing time on mobile: ${avgTime.toFixed(1)}ms average`);
    }
  }, [isMobile]);
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-4), logEntry]); // Keep only last 5 logs
  }, []);

  /**
   * Counts extended fingers based on hand landmarks
   * Uses landmark positions to determine finger states
   */
  const countExtendedFingers = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    let extendedCount = 0;
    
    try {
      // Thumb detection (compare x coordinates due to thumb orientation)
      if (landmarks[4]?.x !== undefined && landmarks[3]?.x !== undefined && 
          landmarks[4].x > landmarks[3].x) {
        extendedCount++;
      }
      
      // Other fingers (compare y coordinates, fingertip vs PIP joint)
      const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky fingertips
      const fingerPIPs = [6, 10, 14, 18]; // Proximal Interphalangeal joints
      
      for (let i = 0; i < fingerTips.length; i++) {
        const tipIndex = fingerTips[i];
        const pipIndex = fingerPIPs[i];
        
        if (landmarks[tipIndex]?.y !== undefined && landmarks[pipIndex]?.y !== undefined &&
            landmarks[tipIndex].y < landmarks[pipIndex].y) {
          extendedCount++;
        }
      }
    } catch (error) {
      console.error('Error counting extended fingers:', error);
      return 0;
    }
    
    return extendedCount;
  }, []);

  /**
   * Detects specific gestures based on extended finger count and positions
   */
  const detectGesture = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 'unknown';
    
    try {
      const extendedFingers = countExtendedFingers(landmarks);
      
      switch (extendedFingers) {
        case 0:
          return 'fist'; // Closed fist - scroll up
        case 1: {
          // Check if only index finger is extended (pointing gesture)
          const indexUp = landmarks[8]?.y !== undefined && landmarks[6]?.y !== undefined && 
                         landmarks[8].y < landmarks[6].y;
          const middleFolded = landmarks[12]?.y !== undefined && landmarks[10]?.y !== undefined && 
                              landmarks[12].y > landmarks[10].y;
          if (indexUp && middleFolded) {
            return 'pointing'; // Pointing - cursor mode
          }
          return 'unknown';
        }
        case 2:
          // Check if it's specifically index and middle fingers (peace sign)
          const indexExtended = landmarks[8]?.y !== undefined && landmarks[6]?.y !== undefined && 
                               landmarks[8].y < landmarks[6].y;
          const middleExtended = landmarks[12]?.y !== undefined && landmarks[10]?.y !== undefined && 
                                landmarks[12].y < landmarks[10].y;
          const ringFolded = landmarks[16]?.y !== undefined && landmarks[14]?.y !== undefined && 
                            landmarks[16].y > landmarks[14].y;
          const pinkyFolded = landmarks[20]?.y !== undefined && landmarks[18]?.y !== undefined && 
                             landmarks[20].y > landmarks[18].y;
          
          if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
            return 'peace'; // Peace sign - click button
          }
          return 'unknown';
        case 5:
          return 'open'; // Open hand - scroll down
        default:
          return 'unknown';
      }
    } catch (error) {
      console.error('Error detecting gesture:', error);
      return 'unknown';
    }
  }, [countExtendedFingers]);

  /**
   * Handles gesture actions with cooldown mechanism for clicks
   */
  const handleGesture = useCallback((gesture: string, landmarks?: any[]) => {
    const now = Date.now();
    
    switch (gesture) {
      case 'fist':
        setCurrentGesture('✊ Fist detected → Scroll UP');
        setGestureState({ type: 'fist', confidence: 0.9 });
        addLog('Fist gesture detected - Scrolling UP');
        window.scrollBy({ top: -50, behavior: 'smooth' });
        break;
        
      case 'open':
        setCurrentGesture('✋ Open hand detected → Scroll DOWN');
        setGestureState({ type: 'open', confidence: 0.9 });
        addLog('Open hand gesture detected - Scrolling DOWN');
        window.scrollBy({ top: 50, behavior: 'smooth' });
        break;

      case 'pointing':
        if (landmarks && landmarks[8]) {
          // Map fingertip position to screen coordinates
          const rawX = (1 - landmarks[8].x) * window.innerWidth;
          const rawY = landmarks[8].y * window.innerHeight;

          // Exponential smoothing to reduce jitter (lower = smoother)
          const smoothing = 0.25;
          const prev = smoothCursorRef.current;
          const smoothX = prev.x + (rawX - prev.x) * smoothing;
          const smoothY = prev.y + (rawY - prev.y) * smoothing;
          smoothCursorRef.current = { x: smoothX, y: smoothY };

          // Snap-to interactive element if cursor is close
          let finalX = smoothX;
          let finalY = smoothY;
          const snapRadius = 30;
          const elUnder = document.elementFromPoint(smoothX, smoothY);
          if (elUnder) {
            const interactive = elUnder.closest('button, a, [role="button"], input, select, textarea, [tabindex]');
            if (interactive) {
              const rect = interactive.getBoundingClientRect();
              const cx = rect.left + rect.width / 2;
              const cy = rect.top + rect.height / 2;
              const dist = Math.hypot(smoothX - cx, smoothY - cy);
              if (dist < snapRadius + Math.max(rect.width, rect.height) / 2) {
                finalX = cx;
                finalY = cy;
              }
            }
          }

          setCursorPosition({ x: finalX, y: finalY, visible: true });
        }
        setCurrentGesture('☝️ Pointing → Cursor Mode');
        setGestureState({ type: 'pointing', confidence: 0.9 });
        break;
        
      case 'peace':
        // Keep cursor visible at last known position for accurate clicking
        if (now - lastClickTimeRef.current > 1000) {
          setCurrentGesture('✌️ Peace sign detected → CLICK');
          setGestureState({ type: 'peace', confidence: 0.9 });
          addLog('Peace sign gesture detected - Clicking element under cursor');
          // Click the element under the cursor's last known position
          setCursorPosition(prev => {
            if (prev.visible) {
              const el = document.elementFromPoint(prev.x, prev.y) as HTMLElement;
              if (el) {
                el.click();
                addLog(`Clicked element: <${el.tagName.toLowerCase()}>`);
              }
            }
            return prev; // Keep cursor as-is
          });
          lastClickTimeRef.current = now;
        } else {
          setCurrentGesture('✌️ Peace sign detected → CLICK (cooldown)');
          setGestureState({ type: 'peace', confidence: 0.5 });
        }
        break;
        
      default:
        setCurrentGesture('👋 Hand detected → No action');
        setGestureState({ type: 'none', confidence: 0 });
    }
  }, [addLog]);

  /**
   * Processes MediaPipe results and draws hand landmarks (mobile optimized with frame skipping)
   */
  const onResults = useCallback((results: any) => {
    const frameStartTime = performance.now();
    
    // Mobile optimization: Skip every 2nd frame to reduce processing load
    if (isMobile) {
      frameSkipCounterRef.current++;
      if (frameSkipCounterRef.current % 2 === 0) {
        updatePerformanceMetrics(0, true); // Log as skipped frame
        return;
      }
    }
    
    // Desktop throttling: 15 FPS limit, Mobile: Natural limit through frame skipping
    const now = performance.now();
    if (!isMobile && now - frameThrottleRef.current < 67) {
      updatePerformanceMetrics(0, true);
      return;
    }
    frameThrottleRef.current = now;
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Safely draw video frame when ready
      if (videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      }
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        
        // Validate landmarks array
        if (!landmarks || landmarks.length < 21) {
          setCurrentGesture('Invalid hand data');
          setGestureState({ type: 'none', confidence: 0 });
          return;
        }
        
        // Draw hand landmarks with red dots
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        // Draw landmarks with bounds checking
        landmarks.forEach((landmark: any) => {
          if (!landmark || typeof landmark.x !== 'number' || typeof landmark.y !== 'number') return;
          
          const x = Math.max(0, Math.min(landmark.x * canvas.width, canvas.width));
          const y = Math.max(0, Math.min(landmark.y * canvas.height, canvas.height));
          
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        // Draw hand skeleton connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17] // Palm connections
        ];
        
        connections.forEach(([start, end]) => {
          if (start >= landmarks.length || end >= landmarks.length) return;
          
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];
          
          if (!startPoint || !endPoint || 
              typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number' ||
              typeof endPoint.x !== 'number' || typeof endPoint.y !== 'number') return;
          
          ctx.beginPath();
          ctx.moveTo(
            Math.max(0, Math.min(startPoint.x * canvas.width, canvas.width)), 
            Math.max(0, Math.min(startPoint.y * canvas.height, canvas.height))
          );
          ctx.lineTo(
            Math.max(0, Math.min(endPoint.x * canvas.width, canvas.width)), 
            Math.max(0, Math.min(endPoint.y * canvas.height, canvas.height))
          );
          ctx.stroke();
        });
        
        // Detect and handle gesture
        const gesture = detectGesture(landmarks);
        // For pointing, always update cursor even if gesture hasn't changed
        if (gesture === 'pointing') {
          handleGesture(gesture, landmarks);
        } else if (gesture !== lastGestureRef.current) {
          handleGesture(gesture);
        }
        lastGestureRef.current = gesture;
      } else {
        // Keep cursor visible - only hide when hand is completely gone for a while
        setCursorPosition(prev => ({ ...prev, visible: false }));
        setCurrentGesture('No hand detected');
        setGestureState({ type: 'none', confidence: 0 });
      }
      
      // Calculate and log frame processing time
      const processingTime = performance.now() - frameStartTime;
      updatePerformanceMetrics(processingTime);
      
      // Mobile performance logging (less frequent to avoid spam)
      if (isMobile && performanceMetrics.processedFrames % 30 === 0) {
        console.log(`📊 [HandTracking Mobile] Average processing: ${performanceMetrics.averageProcessingTime.toFixed(1)}ms, Skipped: ${performanceMetrics.skippedFrames}`);
      }
      
    } catch (error) {
      console.error('Error in onResults:', error);
      setCurrentGesture('Rendering error');
      setGestureState({ type: 'none', confidence: 0 });
      updatePerformanceMetrics(performance.now() - frameStartTime);
    }
  }, [detectGesture, handleGesture, isMobile, updatePerformanceMetrics, performanceMetrics]);

  /**
   * Initializes MediaPipe Hands and camera with comprehensive error handling
   */
  const initializeHandTracking = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      addLog('Initializing hand tracking...');
      
      // Wait for DOM elements to be ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not found - DOM elements not ready');
      }
      
      // Check browser camera support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }
      
      addLog('Loading MediaPipe libraries (CDN)...');
      
      // Load MediaPipe via script tags to avoid bundler constructor issues
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
      
      // Initialize MediaPipe Hands using global constructor
      let hands;
      try {
        hands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
      } catch (constructorError: any) {
        console.error('Hands constructor error (CDN):', constructorError, { globalHands: (window as any).Hands });
        throw new Error(`Failed to create Hands instance: ${constructorError?.message || constructorError}`);
      }
      
      // Configure hand detection settings
      // Configure hand detection settings based on device type
      const mobileSettings = {
        maxNumHands: 1, // Always 1 hand for mobile performance
        modelComplexity: 0, // Lite model for mobile
        minDetectionConfidence: 0.5, // Lower for mobile responsiveness
        minTrackingConfidence: 0.3 // Lower for mobile responsiveness
      };
      
      const desktopSettings = {
        maxNumHands: 1, // Keep 1 hand for consistency
        modelComplexity: 0, // Use lite model for better performance
        minDetectionConfidence: 0.6, // Slightly higher for desktop
        minTrackingConfidence: 0.4 // Slightly higher for desktop  
      };
      
      const settings = isMobile ? mobileSettings : desktopSettings;
      hands.setOptions(settings);
      
      addLog(`🎯 Applied ${isMobile ? 'mobile' : 'desktop'} optimized settings`);
      console.log(`🎯 [HandTracking] Applied settings:`, settings);
      
      hands.onResults(onResults);
      handsRef.current = hands;
      
      addLog('Initializing camera...');
      
      // Initialize camera with mobile-optimized settings
      const cameraSettings = {
        onFrame: async () => {
          try {
            if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              await handsRef.current.send({ image: videoRef.current });
            }
          } catch (frameError) {
            console.error('Error processing frame:', frameError);
          }
        },
        // Mobile-optimized resolution: 640x480 max, 480x360 for mobile
        width: isMobile ? 320 : 480,
        height: isMobile ? 240 : 360
      };
      
      const camera = new (window as any).Camera(videoRef.current, cameraSettings);
      
      addLog(`📹 Camera initialized: ${cameraSettings.width}x${cameraSettings.height} ${isMobile ? '(mobile)' : '(desktop)'}`);
      console.log(`📹 [HandTracking] Camera settings:`, cameraSettings);
      
      cameraRef.current = camera;
      
      // Start camera with timeout protection
      const cameraStartPromise = camera.start();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000)
      );
      
      await Promise.race([cameraStartPromise, timeoutPromise]);
      
      setIsInitialized(true);
      setIsActive(true);
      setIsLoading(false);
      addLog('✅ Hand tracking initialized successfully');
      console.log(`✅ [HandTracking] Initialized successfully for ${isMobile ? 'mobile' : 'desktop'} device`);
      
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
  }, [onResults, addLog, isMobile, updatePerformanceMetrics]);

  /**
   * Starts hand tracking (initializes if needed)
   */
  const startHandTracking = useCallback(async () => {
    if (!isInitialized) {
      await initializeHandTracking();
    } else if (cameraRef.current) {
      await cameraRef.current.start();
      setIsActive(true);
      addLog('Hand tracking resumed');
    }
  }, [isInitialized, initializeHandTracking, addLog]);

  /**
   * Stops hand tracking and camera
   */
  const stopHandTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setIsActive(false);
      setGestureState({ type: 'none', confidence: 0 });
      addLog('Hand tracking stopped');
    }
  }, [addLog]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
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
