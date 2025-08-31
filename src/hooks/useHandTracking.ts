
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
    
    // Thumb (compare x coordinates, thumb tip vs thumb IP)
    if (landmarks[4].x > landmarks[3].x) extendedCount++;
    
    // Other fingers (compare y coordinates, fingertip vs PIP)
    const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
    const fingerPIPs = [6, 10, 14, 18];
    
    for (let i = 0; i < fingerTips.length; i++) {
      if (landmarks[fingerTips[i]].y < landmarks[fingerPIPs[i]].y) {
        extendedCount++;
      }
    }
    
    return extendedCount;
  }, []);

  const detectGesture = useCallback((landmarks: any[]) => {
    const extendedFingers = countExtendedFingers(landmarks);
    
    switch (extendedFingers) {
      case 0:
        return 'fist';
      case 2:
        // Check if index and middle fingers are extended
        const indexExtended = landmarks[8].y < landmarks[6].y;
        const middleExtended = landmarks[12].y < landmarks[10].y;
        const ringFolded = landmarks[16].y > landmarks[14].y;
        const pinkyFolded = landmarks[20].y > landmarks[18].y;
        
        if (indexExtended && middleExtended && ringFolded && pinkyFolded) {
          return 'peace';
        }
        return 'unknown';
      case 5:
        return 'open';
      default:
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
    
    // Clear canvas and draw video frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand landmarks
      ctx.fillStyle = '#FF0000';
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 2;
      
      // Draw landmarks
      landmarks.forEach((landmark: any) => {
        const x = landmark.x * canvas.width;
        const y = landmark.y * canvas.height;
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
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });
      
      // Detect and handle gesture
      const gesture = detectGesture(landmarks);
      handleGesture(gesture);
    } else {
      setCurrentGesture('No hand detected');
      setGestureState({ type: 'none', confidence: 0 });
    }
  }, [detectGesture, handleGesture]);

  const initializeHandTracking = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      addLog('Initializing hand tracking...');
      
      // Load MediaPipe Hands
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Video or canvas element not found');
      }
      
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
      
      // Initialize camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });
      
      cameraRef.current = camera;
      await camera.start();
      
      setIsInitialized(true);
      setIsActive(true);
      setIsLoading(false);
      addLog('Hand tracking initialized successfully');
      console.log('Hand tracking initialized successfully');
      
    } catch (err) {
      console.error('Failed to initialize hand tracking:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize hand tracking';
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
