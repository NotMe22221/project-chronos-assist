
import { useEffect, useRef, useState, useCallback } from 'react';

interface GestureState {
  type: 'fist' | 'open' | 'peace' | 'none';
  confidence: number;
}

interface HandTrackingResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isActive: boolean;
  isLoading: boolean;
  gestureState: GestureState;
  logs: string[];
  startHandTracking: () => Promise<void>;
  stopHandTracking: () => void;
  isInitialized: boolean;
  currentGesture: string;
  error: string | null;
  initializeHandTracking: () => Promise<void>;
}

export const useHandTracking = (): HandTrackingResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gestureState, setGestureState] = useState<GestureState>({ type: 'none', confidence: 0 });
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('No gesture detected');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for MediaPipe and gesture tracking
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastClickTimeRef = useRef<number>(0);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLogs(prev => [...prev.slice(-4), logEntry]); // Keep only last 5 logs
  }, []);

  const countExtendedFingers = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 0;
    
    let extendedCount = 0;
    
    try {
      // Thumb (compare x coordinates, thumb tip vs thumb IP)
      if (landmarks[4]?.x !== undefined && landmarks[3]?.x !== undefined && 
          landmarks[4].x > landmarks[3].x) {
        extendedCount++;
      }
      
      // Other fingers (compare y coordinates, fingertip vs PIP)
      const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
      const fingerPIPs = [6, 10, 14, 18];
      
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

  const detectGesture = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 'unknown';
    
    try {
      const extendedFingers = countExtendedFingers(landmarks);
      
      switch (extendedFingers) {
        case 0:
          return 'fist';
        case 2:
          // Check if index and middle fingers are extended (Peace sign)
          const indexExtended = landmarks[8]?.y !== undefined && landmarks[6]?.y !== undefined && 
                               landmarks[8].y < landmarks[6].y;
          const middleExtended = landmarks[12]?.y !== undefined && landmarks[10]?.y !== undefined && 
                                landmarks[12].y < landmarks[10].y;
          const ringFolded = landmarks[16]?.y !== undefined && landmarks[14]?.y !== undefined && 
                            landmarks[16].y > landmarks[14].y;
          const pinkyFolded = landmarks[20]?.y !== undefined && landmarks[18]?.y !== undefined && 
                             landmarks[20].y > landmarks[18].y;
          
          if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
            return 'peace';
          }
          return 'unknown';
        case 5:
          return 'open';
        default:
          return 'unknown';
      }
    } catch (error) {
      console.error('Error detecting gesture:', error);
      return 'unknown';
    }
  }, [countExtendedFingers]);

  const handleGesture = useCallback((gesture: string) => {
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
      case 'peace':
        if (now - lastClickTimeRef.current > 1000) {
          setCurrentGesture('✌️ Peace sign detected → CLICK');
          setGestureState({ type: 'peace', confidence: 0.9 });
          addLog('Peace sign gesture detected - Clicking test button');
          const testButton = document.querySelector('#hand-tracking-test-button') as HTMLButtonElement;
          if (testButton) {
            testButton.click();
          }
          lastClickTimeRef.current = now;
        } else {
          setCurrentGesture('✌️ Peace sign detected → CLICK (cooldown)');
          setGestureState({ type: 'peace', confidence: 0.5 });
        }
        break;
      default:
        setCurrentGesture('👋 Hand detected → No action');
        setGestureState({ type: 'none', confidence: 0.3 });
    }
  }, [addLog]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    try {
      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Safely draw video frame
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
        
        // Draw hand landmarks
        ctx.fillStyle = '#FF0000';
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        
        // Draw landmarks with bounds checking
        landmarks.forEach((landmark: any, index: number) => {
          if (!landmark || typeof landmark.x !== 'number' || typeof landmark.y !== 'number') return;
          
          const x = Math.max(0, Math.min(landmark.x * canvas.width, canvas.width));
          const y = Math.max(0, Math.min(landmark.y * canvas.height, canvas.height));
          
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        // Draw connections
        const connections = [
          [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
          [0, 5], [5, 6], [6, 7], [7, 8], // Index
          [0, 9], [9, 10], [10, 11], [11, 12], // Middle
          [0, 13], [13, 14], [14, 15], [15, 16], // Ring
          [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
          [5, 9], [9, 13], [13, 17] // Palm
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
        handleGesture(gesture);
      } else {
        setCurrentGesture('No hand detected');
        setGestureState({ type: 'none', confidence: 0 });
      }
    } catch (error) {
      console.error('Error in onResults:', error);
      setCurrentGesture('Rendering error');
      setGestureState({ type: 'none', confidence: 0 });
    }
  }, [detectGesture, handleGesture]);

  const initializeHandTracking = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      addLog('Initializing hand tracking...');
      
      // Wait longer to ensure DOM elements are rendered
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not found - DOM elements not ready');
      }
      
      // Check if camera is already accessible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported in this browser');
      }
      
      addLog('Loading MediaPipe libraries...');
      
      // Load MediaPipe Hands with error handling
      const { Hands } = await import('@mediapipe/hands').catch(err => {
        throw new Error('Failed to load MediaPipe Hands library');
      });
      const { Camera } = await import('@mediapipe/camera_utils').catch(err => {
        throw new Error('Failed to load MediaPipe Camera utilities');
      });
      
      addLog('MediaPipe libraries loaded successfully');
      
      // Initialize Hands
      const hands = new Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });
      
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5
      });
      
      hands.onResults(onResults);
      handsRef.current = hands;
      
      addLog('Initializing camera...');
      
      // Initialize camera with improved error handling
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          try {
            if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
              await handsRef.current.send({ image: videoRef.current });
            }
          } catch (frameError) {
            console.error('Error processing frame:', frameError);
          }
        },
        width: 640,
        height: 480
      });
      
      cameraRef.current = camera;
      
      // Start camera with timeout
      const cameraStartPromise = camera.start();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Camera initialization timeout')), 10000)
      );
      
      await Promise.race([cameraStartPromise, timeoutPromise]);
      
      setIsInitialized(true);
      setIsActive(true);
      setIsLoading(false);
      addLog('Hand tracking initialized successfully');
      console.log('Hand tracking initialized successfully');
      
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
      addLog(`Error: ${errorMessage}`);
    }
  }, [onResults, addLog]);

  const startHandTracking = useCallback(async () => {
    if (!isInitialized) {
      await initializeHandTracking();
    } else if (cameraRef.current) {
      await cameraRef.current.start();
      setIsActive(true);
      addLog('Hand tracking started');
    }
  }, [isInitialized, initializeHandTracking, addLog]);

  const stopHandTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      setIsActive(false);
      setGestureState({ type: 'none', confidence: 0 });
      addLog('Hand tracking stopped');
    }
  }, [addLog]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
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
    logs,
    startHandTracking,
    stopHandTracking,
    isInitialized,
    currentGesture,
    error,
    initializeHandTracking
  };
};
