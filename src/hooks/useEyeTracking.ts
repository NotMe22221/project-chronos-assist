
import { useState, useEffect, useRef } from 'react';
import { EyeTracker } from '@/utils/EyeTracker';
import { useToast } from '@/hooks/use-toast';

export const useEyeTracking = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const eyeTracker = useRef<EyeTracker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Only load WebGazer when actually needed (lazy loading)
    return () => {
      if (eyeTracker.current) {
        eyeTracker.current.stop();
      }
    };
  }, []);

  const startEyeTracking = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Load WebGazer script only when needed
      if (!window.webgazer) {
        const script = document.createElement('script');
        script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
        script.async = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            console.log('WebGazer loaded successfully');
            resolve();
          };
          script.onerror = () => {
            reject(new Error('Failed to load WebGazer script'));
          };
          document.head.appendChild(script);
        });
      }

      if (!eyeTracker.current) {
        eyeTracker.current = new EyeTracker();
      }

      const success = await eyeTracker.current.initialize();
      if (success) {
        eyeTracker.current.onGazeUpdate((position) => {
          setGazePosition(position);
        });
        
        setIsActive(true);
        toast({
          title: "Eye Tracking Active",
          description: "Eye tracking is now monitoring your gaze. Click 'Calibrate' for better accuracy.",
        });
      } else {
        throw new Error('Failed to initialize eye tracking');
      }
    } catch (error) {
      console.error('Eye tracking error:', error);
      toast({
        title: "Eye Tracking Error",
        description: "Failed to start eye tracking. Please check camera permissions and try again.",
        variant: "destructive"
      });
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const calibrateEyeTracking = async () => {
    if (!eyeTracker.current || !isActive || isLoading) return;

    setIsLoading(true);
    try {
      await eyeTracker.current.calibrate();
      setIsCalibrated(true);
      toast({
        title: "Calibration Complete",
        description: "Eye tracking calibration completed successfully. Accuracy should now be improved.",
      });
    } catch (error) {
      console.error('Calibration error:', error);
      toast({
        title: "Calibration Failed",
        description: "Eye tracking calibration failed. Please ensure you're looking at the dots and clicking them.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopEyeTracking = () => {
    if (eyeTracker.current) {
      eyeTracker.current.stop();
      setIsActive(false);
      setIsCalibrated(false);
      setGazePosition({ x: 0, y: 0 });
      setIsLoading(false);
    }
  };

  const detectGazeOnElement = async (element: HTMLElement, dwellTime = 1500) => {
    if (!eyeTracker.current || !isActive) return false;

    try {
      await eyeTracker.current.detectElementGaze(element, dwellTime);
      return true;
    } catch (error) {
      console.error('Gaze detection error:', error);
      return false;
    }
  };

  return {
    isActive,
    isCalibrated,
    gazePosition,
    isLoading,
    startEyeTracking,
    calibrateEyeTracking,
    stopEyeTracking,
    detectGazeOnElement
  };
};
