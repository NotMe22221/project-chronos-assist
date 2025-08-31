
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

// Helper to resolve HSL theme tokens (like --primary: 200 98% 52%) into a valid color for canvas
const getCssHsl = (varName: string, fallback = 'hsl(200 100% 50%)') => {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return value ? `hsl(${value})` : fallback;
  } catch {
    return fallback;
  }
};

export const useHandTracking = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<HandGesture | null>(null);
  const [hands, setHands] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastClickTime = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const { toast } = useToast();

  // Load MediaPipe scripts robustly (idempotent, with verification)
  useEffect(() => {
    const loadMediaPipe = async () => {
      if ((window as any).Hands && (window as any).Camera) {
        console.log('[HandTracking] MediaPipe already available');
        return;
      }

      const scripts = [
        'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
        'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
      ];

      for (const src of scripts) {
        // Avoid duplicate script tags
        let script = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement('script');
          script.src = src;
          script.async = true;
          document.head.appendChild(script);
          console.log('[HandTracking] Loading script:', src);
          await new Promise((resolve, reject) => {
            script!.onload = resolve as any;
            script!.onerror = () => reject(new Error(`Failed to load: ${src}`));
          });
        } else {
          // If script exists but may not be loaded yet, wait one microtask
          await Promise.resolve();
        }
      }

      // Verify globals are present
      if (!(window as any).Hands || !(window as any).Camera) {
        throw new Error('MediaPipe globals not available after loading scripts.');
      }

      console.log('[HandTracking] MediaPipe loaded.');
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
            console.log('[HandTracking] Peace sign detected: clicking test button');
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

  // Continuous drawing function to ensure video feed is always visible
  const drawVideoFeed = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    try {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      // Video might not be ready yet, that's ok
    }

    // Continue drawing
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(drawVideoFeed);
    }
  }, [isActive]);

  const onResults = useCallback((results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame first
    try {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.warn('[HandTracking] Could not draw video frame:', error);
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0] as HandLandmark[];
      
      // Draw hand landmarks with theme colors
      const primaryColor = getCssHsl('--primary', '#3b82f6');
      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 2;
      
      // Draw connections
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [5, 9], [9, 10], [10, 11], [11, 12], // Middle
        [9, 13], [13, 14], [14, 15], [15, 16], // Ring
        [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [0, 17] // Palm
      ] as const;
      
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
      console.log('[HandTracking] Requesting camera...');
      
      // Request camera permission with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load and start playing
        await new Promise((resolve, reject) => {
          if (!videoRef.current) return reject(new Error('Video ref lost'));
          
          videoRef.current.onloadedmetadata = () => {
            if (!videoRef.current) return reject(new Error('Video ref lost'));
            
            // Set canvas dimensions to match video
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth || 640;
              canvasRef.current.height = videoRef.current.videoHeight || 480;
              console.log('[HandTracking] Canvas sized to', canvasRef.current.width, 'x', canvasRef.current.height);
            }
            
            videoRef.current.play()
              .then(() => {
                console.log('[HandTracking] Video playing');
                resolve(true);
              })
              .catch(reject);
          };
        });
      }

      // Wait for MediaPipe to be available
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('MediaPipe load timeout')), 15000);
        const checkMediaPipe = () => {
          if ((window as any).Hands && (window as any).Camera) {
            clearTimeout(timeout);
            resolve(true);
          } else {
            setTimeout(checkMediaPipe, 100);
          }
        };
        checkMediaPipe();
      });

      // Initialize MediaPipe Hands
      const handsInstance = new (window as any).Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
      });

      handsInstance.setOptions({
        selfieMode: true,
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      handsInstance.onResults(onResults);
      setHands(handsInstance);

      // Initialize camera
      if (videoRef.current) {
        const cameraInstance = new (window as any).Camera(videoRef.current, {
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

      // Start continuous video feed drawing
      drawVideoFeed();

      setIsActive(true);
      toast({
        title: "Hand Tracking Active",
        description: "Hand gestures are now being detected. Make gestures to control the interface.",
      });
      console.log('[HandTracking] Started successfully');
      
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
  }, [isLoading, onResults, drawVideoFeed, toast]);

  const stopHandTracking = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

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
    console.log('[HandTracking] Stopped.');
  }, [camera]);

  // Start drawing loop when active
  useEffect(() => {
    if (isActive) {
      drawVideoFeed();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, drawVideoFeed]);

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
