import { useRef, useState, useCallback, useEffect } from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

interface GestureState {
  type: 'none' | 'fist' | 'open' | 'peace';
  lastDetected: number;
  lastClickTime: number;
}

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gestureState, setGestureState] = useState<GestureState>({
    type: 'none',
    lastDetected: 0,
    lastClickTime: 0
  });
  const [logs, setLogs] = useState<string[]>([]);

  // Add log message
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-4), `${timestamp}: ${message}`]);
  }, []);

  // Count extended fingers
  const countExtendedFingers = useCallback((landmarks: any[]) => {
    if (!landmarks || landmarks.length < 21) return 0;

    let count = 0;
    
    // Thumb (tip vs previous joint)
    if (landmarks[4].x > landmarks[3].x) count++;
    
    // Other fingers (tip vs previous joint)
    const fingerTips = [8, 12, 16, 20];
    const fingerPips = [6, 10, 14, 18];
    
    for (let i = 0; i < fingerTips.length; i++) {
      if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) count++;
    }
    
    return count;
  }, []);

  // Detect gesture type
  const detectGesture = useCallback((landmarks: any[]) => {
    const fingerCount = countExtendedFingers(landmarks);
    
    if (fingerCount === 0) return 'fist';
    if (fingerCount === 5) return 'open';
    if (fingerCount === 2) {
      // Check if it's specifically index and middle finger
      const indexUp = landmarks[8].y < landmarks[6].y;
      const middleUp = landmarks[12].y < landmarks[10].y;
      const ringDown = landmarks[16].y > landmarks[14].y;
      const pinkyDown = landmarks[20].y > landmarks[18].y;
      
      if (indexUp && middleUp && ringDown && pinkyDown) return 'peace';
    }
    
    return 'none';
  }, [countExtendedFingers]);

  // Handle gesture actions
  const handleGesture = useCallback((gesture: 'fist' | 'open' | 'peace') => {
    const now = Date.now();
    
    switch (gesture) {
      case 'fist':
        window.scrollBy({ top: -50, behavior: 'smooth' });
        addLog('✊ Fist detected → Scroll UP');
        break;
      case 'open':
        window.scrollBy({ top: 50, behavior: 'smooth' });
        addLog('✋ Open hand detected → Scroll DOWN');
        break;
      case 'peace':
        if (now - gestureState.lastClickTime > 1000) {
          const testButton = document.getElementById('hand-tracking-test-button');
          if (testButton) {
            testButton.click();
            setGestureState(prev => ({ ...prev, lastClickTime: now }));
            addLog('✌️ Peace sign detected → Button CLICKED');
          }
        }
        break;
    }
  }, [gestureState.lastClickTime, addLog]);

  // Process hand tracking results
  const onResults = useCallback((results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    // Process hand landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand landmarks and connections
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
      drawLandmarks(canvasCtx, landmarks, {color: '#FF0000', lineWidth: 1, radius: 2});
      
      // Detect and handle gesture
      const gesture = detectGesture(landmarks);
      const now = Date.now();
      
      if (gesture !== 'none' && now - gestureState.lastDetected > 200) {
        setGestureState(prev => ({ ...prev, type: gesture, lastDetected: now }));
        handleGesture(gesture);
      }
    } else {
      setGestureState(prev => ({ ...prev, type: 'none' }));
    }

    canvasCtx.restore();
  }, [detectGesture, handleGesture, gestureState.lastDetected]);

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      setIsLoading(true);

      // Initialize Hands
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
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
        height: 480,
      });

      cameraRef.current = camera;
      await camera.start();

      setIsActive(true);
      addLog('Hand tracking initialized successfully');
    } catch (error) {
      console.error('Failed to initialize hand tracking:', error);
      addLog('Failed to initialize hand tracking');
    } finally {
      setIsLoading(false);
    }
  }, [onResults, addLog]);

  // Start hand tracking
  const startHandTracking = useCallback(async () => {
    await initializeHands();
  }, [initializeHands]);

  // Stop hand tracking
  const stopHandTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    setIsActive(false);
    addLog('Hand tracking stopped');
  }, [addLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHandTracking();
    };
  }, [stopHandTracking]);

  return {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    gestureState,
    logs,
    startHandTracking,
    stopHandTracking
  };
};
