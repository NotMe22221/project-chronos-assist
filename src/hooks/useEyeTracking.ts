import { useState, useEffect, useRef } from 'react';
import { EyeTracker } from '@/utils/EyeTracker';
import { useToast } from '@/hooks/use-toast';

export const useEyeTracking = () => {
  const [isActive, setIsActive] = useState(false);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [gazePosition, setGazePosition] = useState({ x: 0, y: 0 });
  const eyeTracker = useRef<EyeTracker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load WebGazer script
    const script = document.createElement('script');
    script.src = 'https://webgazer.cs.brown.edu/webgazer.js';
    script.async = true;
    script.onload = () => {
      console.log('WebGazer loaded');
    };
    document.head.appendChild(script);

    return () => {
      if (eyeTracker.current) {
        eyeTracker.current.stop();
      }
    };
  }, []);

  const startEyeTracking = async () => {
    try {
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
          description: "Eye tracking is now monitoring your gaze. Calibrate for better accuracy.",
        });
      } else {
        throw new Error('Failed to initialize eye tracking');
      }
    } catch (error) {
      console.error('Eye tracking error:', error);
      toast({
        title: "Eye Tracking Error",
        description: "Failed to start eye tracking. Please check camera permissions.",
        variant: "destructive"
      });
    }
  };

  const calibrateEyeTracking = async () => {
    if (!eyeTracker.current || !isActive) return;

    try {
      await eyeTracker.current.calibrate();
      setIsCalibrated(true);
      toast({
        title: "Calibration Complete",
        description: "Eye tracking calibration completed successfully.",
      });
    } catch (error) {
      console.error('Calibration error:', error);
      toast({
        title: "Calibration Failed",
        description: "Eye tracking calibration failed. Try again.",
        variant: "destructive"
      });
    }
  };

  const stopEyeTracking = () => {
    if (eyeTracker.current) {
      eyeTracker.current.stop();
      setIsActive(false);
      setIsCalibrated(false);
      setGazePosition({ x: 0, y: 0 });
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
    startEyeTracking,
    calibrateEyeTracking,
    stopEyeTracking,
    detectGazeOnElement
  };
};