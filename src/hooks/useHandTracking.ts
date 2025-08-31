import { useEffect, useRef, useState, useCallback } from 'react';

interface HandTrackingResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isInitialized: boolean;
  currentGesture: string;
  error: string | null;
  initializeHandTracking: () => Promise<void>;
}

export const useHandTracking = (): HandTrackingResult => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentGesture, setCurrentGesture] = useState('No gesture detected');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for MediaPipe and gesture tracking
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastClickTimeRef = useRef<number>(0);

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
        window.scrollBy({ top: -50, behavior: 'smooth' });
        break;
      case 'open':
        setCurrentGesture('✋ Open hand detected → Scroll DOWN');
        window.scrollBy({ top: 50, behavior: 'smooth' });
        break;
      case 'peace':
        if (now - lastClickTimeRef.current > 1000) {
          setCurrentGesture('✌️ Peace sign detected → CLICK');
          const testButton = document.querySelector('#hand-tracking-test-button') as HTMLButtonElement;
          if (testButton) {
            testButton.click();
          }
          lastClickTimeRef.current = now;
        } else {
          setCurrentGesture('✌️ Peace sign detected → CLICK (cooldown)');
        }
        break;
      default:
        setCurrentGesture('👋 Hand detected → No action');
    }
  }, []);

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
    }
  }, [detectGesture, handleGesture]);

  const initializeHandTracking = useCallback(async () => {
    try {
      setError(null);
      
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
      console.log('Hand tracking initialized successfully');
      
    } catch (err) {
      console.error('Failed to initialize hand tracking:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize hand tracking');
    }
  }, [onResults]);

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
    isInitialized,
    currentGesture,
    error,
    initializeHandTracking
  };
};
