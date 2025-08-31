import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface HandGesture {
  type: 'fist' | 'open' | 'peace' | 'unknown';
  fingerCount: number;
  confidence: number;
}

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export const useHandTracking = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<HandGesture | null>(null);
  const [hands, setHands] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastClickTime = useRef<number>(0);
  const { toast } = useToast();

  // Load MediaPipe scripts
  useEffect(() => {
    const loadMediaPipe = async () => {
      // Load MediaPipe scripts
      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      ];

      for (const src of scripts) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }
    };

    loadMediaPipe().catch((error) => {
      console.error('Failed to load MediaPipe scripts:', error);
      toast({
        title: "MediaPipe Loading Failed",
        description: "Could not load hand tracking library. Please check your internet connection.",
        variant: "destructive"
      });
    });
  }, [toast]);

  const countFingers = useCallback((landmarks: HandLandmark[]) => {
    if (!landmarks || landmarks.length !== 21) return 0;

    let fingerCount = 0;
    
    // Thumb (tip vs MCP, considering hand orientation)
    if (landmarks[4].x > landmarks[3].x) fingerCount++;
    
    // Other fingers (tip vs PIP)
    const fingerTips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
    const fingerPips = [6, 10, 14, 18];
    
    for (let i = 0; i < fingerTips.length; i++) {
      if (landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y) {
        fingerCount++;
      }
    }
    
    return fingerCount;
  }, []);

  const classifyGesture = useCallback((landmarks: HandLandmark[]): HandGesture => {
    const fingerCount = countFingers(landmarks);
    
    let gestureType: HandGesture['type'] = 'unknown';
    
    if (fingerCount === 0) {
      gestureType = 'fist';
    } else if (fingerCount === 5) {
      gestureType = 'open';
    } else if (fingerCount === 2) {
      // Check if it's specifically peace sign (index and middle finger)
      const indexUp = landmarks[8].y < landmarks[6].y;
      const middleUp = landmarks[12].y < landmarks[10].y;
      const ringDown = landmarks[16].y > landmarks[14].y;
      const pinkyDown = landmarks[20].y > landmarks[18].y;
      
      if (indexUp && middleUp && ringDown && pinkyDown) {
        gestureType = 'peace';
      }
    }
    
    return {
      type: gestureType,
      fingerCount,
      confidence: 0.8 // Simplified confidence score
    };
  }, [countFingers]);

  const executeGesture = useCallback((gesture: HandGesture) => {
    const now = Date.now();
    
    switch (gesture.type) {
      case 'fist':
        // Scroll up
        window.scrollBy({ top: -200, behavior: 'smooth' });
        break;
        
      case 'open':
        // Scroll down
        window.scrollBy({ top: 200, behavior: 'smooth' });
        break;
        
      case 'peace':
        // Click action with cooldown
        if (now - lastClickTime.current > 1000) {
          lastClickTime.current = now;
          
          // Find and click the test button
          const testButton = document.querySelector('[data-hand-clickable="true"]') as HTMLElement;
          if (testButton) {
            testButton.click();
            testButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
              testButton.style.transform = 'scale(1)';
            }, 150);
          }
        }
        break;
    }
  }, []);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Draw hand landmarks
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      
      // Draw connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [5, 9], [9, 10], [10, 11], [11, 12], // Middle
        [9, 13], [13, 14], [14, 15], [15, 16], // Ring
        [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [0, 17] // Palm
      ];
      
      connections.forEach(([start, end]) => {
        const startPoint = landmarks[start];
        const endPoint = landmarks[end];
        
        ctx.beginPath();
        ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
        ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
        ctx.stroke();
      });
      
      // Draw landmarks
      landmarks.forEach((landmark: any) => {
        ctx.beginPath();
        ctx.arc(
          landmark.x * canvas.width,
          landmark.y * canvas.height,
          5,
          0,
          2 * Math.PI
        );
        ctx.fill();
      });

      // Classify and execute gesture
      const gesture = classifyGesture(landmarks);
      setCurrentGesture(gesture);
      
      if (gesture.type !== 'unknown') {
        executeGesture(gesture);
      }
    } else {
      setCurrentGesture(null);
    }
  }, [classifyGesture, executeGesture]);

  const startHandTracking = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Wait for MediaPipe to be available
      await new Promise((resolve) => {
        const checkMediaPipe = () => {
          if (window.Hands && window.Camera) {
            resolve(true);
          } else {
            setTimeout(checkMediaPipe, 100);
          }
        };
        checkMediaPipe();
      });

      // Initialize MediaPipe Hands
      const handsInstance = new window.Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsInstance.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults(onResults);
      setHands(handsInstance);

      // Initialize camera
      if (videoRef.current) {
        const cameraInstance = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await handsInstance.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        
        await cameraInstance.start();
        setCamera(cameraInstance);
      }

      setIsActive(true);
      toast({
        title: "Hand Tracking Active",
        description: "Hand gestures are now being detected. Make gestures to control the interface.",
      });

    } catch (error) {
      console.error('Hand tracking error:', error);
      toast({
        title: "Hand Tracking Error",
        description: "Failed to start hand tracking. Please check camera permissions.",
        variant: "destructive"
      });
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onResults, toast]);

  const stopHandTracking = useCallback(() => {
    if (camera) {
      camera.stop();
      setCamera(null);
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setCurrentGesture(null);
    setHands(null);
  }, [camera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHandTracking();
    };
  }, [stopHandTracking]);

  return {
    isActive,
    isLoading,
    currentGesture,
    videoRef,
    canvasRef,
    startHandTracking,
    stopHandTracking
  };
};

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}
