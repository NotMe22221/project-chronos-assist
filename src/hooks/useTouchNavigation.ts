import { useState, useCallback, useRef, useEffect } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

interface SwipeGesture {
  direction: 'up' | 'down' | 'left' | 'right';
  distance: number;
  velocity: number;
}

export const useTouchNavigation = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [touchStart, setTouchStart] = useState<TouchPosition | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<TouchPosition | null>(null);
  const [lastSwipe, setLastSwipe] = useState<SwipeGesture | null>(null);
  
  const touchStartTime = useRef<number>(0);
  const swipeCallbacks = useRef<{
    onSwipe?: (gesture: SwipeGesture) => void;
    onTouchStart?: (position: TouchPosition) => void;
    onTouchMove?: (position: TouchPosition) => void;
    onTouchEnd?: (position: TouchPosition) => void;
  }>({});

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    const position = { x: touch.clientX, y: touch.clientY };
    
    setTouchStart(position);
    setTouchCurrent(position);
    setIsDragging(true);
    touchStartTime.current = Date.now();
    
    swipeCallbacks.current.onTouchStart?.(position);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStart) return;
    
    const touch = e.touches[0];
    const position = { x: touch.clientX, y: touch.clientY };
    
    setTouchCurrent(position);
    swipeCallbacks.current.onTouchMove?.(position);
  }, [isDragging, touchStart]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging || !touchStart || !touchCurrent) {
      setIsDragging(false);
      return;
    }

    const endTime = Date.now();
    const duration = endTime - touchStartTime.current;
    
    const deltaX = touchCurrent.x - touchStart.x;
    const deltaY = touchCurrent.y - touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Determine swipe direction and trigger callback if it's a significant swipe
    if (distance > 50 && velocity > 0.1) {
      let direction: SwipeGesture['direction'];
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const gesture: SwipeGesture = { direction, distance, velocity };
      setLastSwipe(gesture);
      swipeCallbacks.current.onSwipe?.(gesture);
    }

    const endPosition = touchCurrent;
    swipeCallbacks.current.onTouchEnd?.(endPosition);

    // Reset state
    setIsDragging(false);
    setTouchStart(null);
    setTouchCurrent(null);
  }, [isDragging, touchStart, touchCurrent]);

  const registerElement = useCallback((element: HTMLElement) => {
    if (!element) return () => {};

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const setCallbacks = useCallback((callbacks: typeof swipeCallbacks.current) => {
    swipeCallbacks.current = callbacks;
  }, []);

  const addGestureSupport = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Add touch-friendly styling
    element.style.touchAction = 'manipulation';
    element.style.userSelect = 'none';
    
    // Add visual feedback classes
    element.classList.add('touch-target');

    return registerElement(element);
  }, [registerElement]);

  const getTouchDelta = useCallback(() => {
    if (!touchStart || !touchCurrent) return { x: 0, y: 0 };
    return {
      x: touchCurrent.x - touchStart.x,
      y: touchCurrent.y - touchStart.y
    };
  }, [touchStart, touchCurrent]);

  // Auto-detect mobile and add global touch classes
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      document.body.classList.add('touch-device');
    }
  }, []);

  return {
    isDragging,
    touchStart,
    touchCurrent,
    lastSwipe,
    registerElement,
    setCallbacks,
    addGestureSupport,
    getTouchDelta
  };
};