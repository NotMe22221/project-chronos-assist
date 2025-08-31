
import { useState } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Hand, Play, Square, Gesture } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHandTracking } from '@/hooks/useHandTracking';
import { cn } from '@/lib/utils';

export const HandTracking = () => {
  const {
    isActive,
    isLoading,
    currentGesture,
    videoRef,
    canvasRef,
    startHandTracking,
    stopHandTracking
  } = useHandTracking();

  const [testClicks, setTestClicks] = useState(0);

  const handleTestButtonClick = () => {
    setTestClicks(prev => prev + 1);
  };

  const getGestureIcon = () => {
    if (!currentGesture) return '🤚';
    
    switch (currentGesture.type) {
      case 'fist': return '✊';
      case 'open': return '🖐️';
      case 'peace': return '✌️';
      default: return '🤚';
    }
  };

  const getGestureAction = () => {
    if (!currentGesture) return 'No gesture detected';
    
    switch (currentGesture.type) {
      case 'fist': return 'Scrolling up';
      case 'open': return 'Scrolling down';
      case 'peace': return 'Clicking';
      default: return 'Unknown gesture';
    }
  };

  return (
    <JarvisPanel 
      title="Hand Tracking" 
      glow={isActive} 
      pulse={currentGesture?.type !== 'unknown'}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Control Buttons */}
        <div className="flex items-center justify-between p-3 bg-gradient-panel rounded-lg border border-primary/10">
          <div className="flex items-center space-x-3">
            <Hand className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">MediaPipe Hands</span>
          </div>
          <div className="flex space-x-2">
            {!isActive ? (
              <Button 
                size="sm" 
                variant="outline"
                onClick={startHandTracking}
                disabled={isLoading}
                className="text-xs"
              >
                {isLoading ? (
                  <>
                    <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin mr-1"></div>
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Start
                  </>
                )}
              </Button>
            ) : (
              <Button 
                size="sm" 
                variant="destructive"
                onClick={stopHandTracking}
                className="text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Video Feed */}
        {isActive && (
          <div className="relative">
            <video
              ref={videoRef}
              className="hidden"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="w-full h-48 bg-background/20 rounded-lg border border-border/30 object-cover"
            />
            {!isActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Camera feed will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Gesture Status */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Current Gesture</span>
            <span className="text-2xl">{getGestureIcon()}</span>
          </div>
          <p className="text-sm text-foreground">
            {currentGesture ? (
              <>
                <span className="text-primary font-medium">
                  {currentGesture.type.toUpperCase()}
                </span>
                {' '} - {getGestureAction()}
                <br />
                <span className="text-xs text-muted-foreground">
                  Fingers: {currentGesture.fingerCount}
                </span>
              </>
            ) : (
              'Make a gesture to control the interface'
            )}
          </p>
        </div>

        {/* Test Button */}
        <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
          <h4 className="text-sm font-medium text-secondary mb-2">Test Gesture Click</h4>
          <Button 
            data-hand-clickable="true"
            onClick={handleTestButtonClick}
            className={cn(
              "w-full transition-all duration-150",
              "bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            )}
          >
            <Gesture className="w-4 h-4 mr-2" />
            Test Button (Clicked {testClicks} times)
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Make a peace sign (✌️) to click this button
          </p>
        </div>

        {/* Gesture Guide */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
          <h4 className="text-sm font-medium mb-3">Gesture Controls</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center">
                <span className="text-lg mr-2">✊</span>
                Fist (0 fingers)
              </span>
              <span className="text-muted-foreground">Scroll Up</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center">
                <span className="text-lg mr-2">🖐️</span>
                Open Hand (5 fingers)
              </span>
              <span className="text-muted-foreground">Scroll Down</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center">
                <span className="text-lg mr-2">✌️</span>
                Peace Sign (2 fingers)
              </span>
              <span className="text-muted-foreground">Click Button</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            * Click gesture has 1-second cooldown
          </p>
        </div>
      </div>
    </JarvisPanel>
  );
};
