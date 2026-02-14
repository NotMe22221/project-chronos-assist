import { useHandTracking } from '@/hooks/useHandTracking';
import { JarvisPanel } from './JarvisPanel';
import { Button } from '@/components/ui/button';
import { Hand, Play, Square, TestTube, AlertCircle, Camera, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Hand Tracking Interface Component
 * 
 * This component provides:
 * - Real-time webcam feed with hand landmarks
 * - Gesture recognition controls
 * - Visual feedback for detected gestures
 * - Test button for gesture interaction
 * - Activity logging
 */
export const HandTrackingInterface = () => {
  const {
    videoRef,
    canvasRef,
    isActive,
    isLoading,
    gestureState,
    cursorPosition,
    logs,
    startHandTracking,
    stopHandTracking,
    error,
    isMobile,
    performanceMetrics
  } = useHandTracking();

  /**
   * Test button click handler for gesture verification
   */
  const handleTestButtonClick = () => {
    console.log('✌️ Test button clicked via hand gesture!');
    // Add visual feedback or notification here if needed
  };

  return (
    <>
      {/* Floating Cursor Overlay */}
      {cursorPosition.visible && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: cursorPosition.x - 12,
            top: cursorPosition.y - 12,
            transition: 'left 0.12s ease-out, top 0.12s ease-out',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-primary/80 border-2 border-primary-foreground shadow-lg shadow-primary/40 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary-foreground absolute top-2 left-2" />
        </div>
      )}
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

        {/* System Status Header */}
        <div className="flex items-center justify-between p-3 bg-gradient-panel rounded-lg border border-primary/10">
          <div className="flex items-center space-x-3">
            <Hand className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground text-enhanced">
              MediaPipe Hands {isMobile ? '📱' : '💻'}
            </span>
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

        {/* Control Buttons */}
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

        {/* Test Button for Gesture Interaction */}
        <Button
          id="hand-tracking-test-button"
          onClick={handleTestButtonClick}
          variant="outline"
          className="w-full touch-target bg-secondary/10 border-secondary/20 hover:bg-secondary/20"
        >
          <TestTube className="h-4 w-4 mr-2" />
          <Target className="h-4 w-4 mr-2" />
          Test Button (Use ✌️ Peace Sign to Click)
        </Button>

        {/* Real-time Webcam Feed with Hand Landmarks */}
        <div className="relative bg-background/20 rounded-lg border border-border/30 overflow-hidden backdrop-blur-sm">
          {/* Hidden video element for MediaPipe processing */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-48 object-cover opacity-0"
            playsInline
            muted
            autoPlay
            webkit-playsinline="true"
          />
          
          {/* Canvas for displaying video + hand landmarks */}
          <canvas
            ref={canvasRef}
            width={isMobile ? 320 : 480}
            height={isMobile ? 240 : 360}
            className="w-full h-48 object-cover"
          />
          
          {/* Camera Status Overlay */}
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Camera inactive</p>
              </div>
            </div>
          )}
          
          {/* Real-time Gesture Indicator */}
          {isActive && (
            <div className="absolute top-2 left-2 px-3 py-1 bg-primary/90 rounded-lg text-xs text-primary-foreground font-bold backdrop-blur-sm border border-primary/20">
              {gestureState.type === 'fist' && '✊ Fist → Scroll UP'}
              {gestureState.type === 'open' && '✋ Open → Scroll DOWN'}
              {gestureState.type === 'peace' && '✌️ Peace → CLICK'}
              {gestureState.type === 'pointing' && '☝️ Pointing → Cursor'}
              {gestureState.type === 'none' && '🤚 No Gesture'}
            </div>
          )}

          {/* Hand Detection Status */}
          {isActive && (
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-background/80 rounded text-xs text-foreground backdrop-blur-sm">
              {gestureState.confidence > 0 ? 'Hand Detected' : 'No Hand'}
            </div>
          )}
        </div>

        {/* Gesture Instructions */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-2 text-enhanced flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Gesture Controls:
          </h4>
          <div className="space-y-1 text-xs text-foreground/90 text-enhanced">
            <div className="flex items-center justify-between">
              <span>✊ <strong>Fist (0 fingers)</strong></span>
              <span className="text-primary">→ Scroll UP</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✋ <strong>Open Hand (5 fingers)</strong></span>
              <span className="text-primary">→ Scroll DOWN</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✌️ <strong>Peace Sign (2 fingers)</strong></span>
              <span className="text-primary">→ Click Button</span>
            </div>
            <div className="flex items-center justify-between">
              <span>☝️ <strong>Pointing (1 finger)</strong></span>
              <span className="text-primary">→ Move Cursor</span>
            </div>
            <div className="text-xs text-muted-foreground mt-2 italic">
              * Click gesture has 1-second cooldown
            </div>
          </div>
        </div>

        {/* Real-time Activity Log */}
        <div className="p-3 bg-background/20 rounded-lg border border-border/30 backdrop-blur-sm">
          <h4 className="text-sm font-medium text-foreground mb-2 text-enhanced">Activity Log:</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-foreground/70 text-enhanced">No activity yet...</p>
            ) : (
              logs.map((log, index) => (
                <p key={index} className="text-xs text-foreground/90 text-enhanced font-mono">
                  {log}
                </p>
              ))
            )}
          </div>
        </div>

        {/* Performance Monitor (Mobile) */}
        {isMobile && isActive && (
          <div className="p-2 bg-muted/10 rounded border border-border/20">
            <h4 className="text-xs font-medium text-foreground mb-1 text-enhanced">📊 Mobile Performance:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-foreground/90 text-enhanced">
              <span>Processing: {performanceMetrics.frameProcessingTime.toFixed(1)}ms</span>
              <span>Average: {performanceMetrics.averageProcessingTime.toFixed(1)}ms</span>
              <span>Processed: {performanceMetrics.processedFrames}</span>
              <span>Skipped: {performanceMetrics.skippedFrames}</span>
            </div>
          </div>
        )}

        {/* Performance Tips */}
        <div className="p-2 bg-muted/10 rounded border border-border/20">
          <p className="text-xs text-muted-foreground text-enhanced">
            💡 <strong>Tips:</strong> {isMobile 
              ? 'Mobile optimizations active: Lower resolution, frame skipping enabled for smooth performance.' 
              : 'Desktop mode: Full resolution with 15 FPS throttling for optimal performance.'
            }
          </p>
        </div>
      </div>
    </JarvisPanel>
    </>
  );
};