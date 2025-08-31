
import { useHandTracking } from '@/hooks/useHandTracking';
import { JarvisPanel } from './JarvisPanel';
import { Button } from '@/components/ui/button';
import { Hand, Play, Square, TestTube, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const HandTrackingInterface = () => {
  const {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    gestureState,
    logs,
    startHandTracking,
    stopHandTracking,
    error
  } = useHandTracking();

  const handleTestButtonClick = () => {
    console.log('Test button clicked via hand gesture!');
  };

  return (
    <JarvisPanel 
      title="Hand Gesture Control" 
      glow={isActive} 
      pulse={gestureState.type !== 'none'}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center space-x-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-between p-3 bg-gradient-panel rounded-lg border border-primary/10">
          <div className="flex items-center space-x-3">
            <Hand className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground text-enhanced">MediaPipe Hands</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isActive ? "bg-success" : "bg-muted"
            )}></div>
            <span className="text-xs text-success font-medium text-enhanced">
              {isActive ? "TRACKING" : "INACTIVE"}
            </span>
          </div>
        </div>

        {/* Start/Stop Controls */}
        <div className="flex space-x-2">
          {!isActive ? (
            <Button 
              onClick={startHandTracking} 
              disabled={isLoading}
              className="flex-1 touch-target"
            >
              <Play className="h-4 w-4 mr-2" />
              {isLoading ? "Starting..." : "Start Hand Tracking"}
            </Button>
          ) : (
            <Button 
              onClick={stopHandTracking} 
              variant="destructive"
              className="flex-1 touch-target"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}
        </div>

        {/* Test Button */}
        <Button
          id="hand-tracking-test-button"
          onClick={handleTestButtonClick}
          variant="outline"
          className="w-full touch-target bg-secondary/10 border-secondary/20 hover:bg-secondary/20"
        >
          <TestTube className="h-4 w-4 mr-2" />
          Test Button (Use ✌️ Peace Sign to Click)
        </Button>

        {/* Camera Feed (always mounted so refs exist before init) */}
        <div className="relative bg-background/20 rounded-lg border border-border/30 overflow-hidden backdrop-blur-sm">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-48 object-cover opacity-0"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full h-48 object-cover"
          />
          
          {/* Gesture Indicator */}
          {isActive && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-primary/80 rounded text-xs text-primary-foreground font-bold backdrop-blur-sm">
              {gestureState.type === 'fist' && '✊ Fist'}
              {gestureState.type === 'open' && '✋ Open'}
              {gestureState.type === 'peace' && '✌️ Peace'}
              {gestureState.type === 'none' && '🤚 No Gesture'}
            </div>
          )}
        </div>

        {/* Gesture Instructions */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-2 text-enhanced">Gesture Controls:</h4>
          <div className="space-y-1 text-xs text-foreground/90 text-enhanced">
            <div>✊ <strong>Fist</strong> → Scroll UP</div>
            <div>✋ <strong>Open Hand</strong> → Scroll DOWN</div>
            <div>✌️ <strong>Peace Sign</strong> → Click Test Button</div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="p-3 bg-background/20 rounded-lg border border-border/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-2 text-enhanced">Activity Log:</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-foreground/70 text-enhanced">No activity yet...</p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className="text-xs text-foreground/90 text-enhanced">
                  {log}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </JarvisPanel>
  );
};
