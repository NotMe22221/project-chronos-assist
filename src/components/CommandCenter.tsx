
import { useState, useEffect, useRef } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Terminal, Brain, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { useTouchNavigation } from '@/hooks/useTouchNavigation';
import { cn } from '@/lib/utils';

export const CommandCenter = () => {
  const { messages, isConnected, isSpeaking } = useElevenLabsConversation();
  const { 
    isActive: eyeTrackingActive, 
    isCalibrated,
    isLoading: eyeTrackingLoading,
    startEyeTracking, 
    calibrateEyeTracking,
    stopEyeTracking
  } = useEyeTracking();
  const { addGestureSupport } = useTouchNavigation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize touch gestures
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = addGestureSupport(containerRef.current);
      return cleanup;
    }
  }, [addGestureSupport]);

  return (
    <JarvisPanel 
      title="AI Command Center" 
      glow={isConnected || isSpeaking} 
      pulse={isSpeaking}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Status Indicators */}
        <div className="flex items-center justify-between p-3 bg-gradient-panel rounded-lg border border-primary/10">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground text-enhanced">ElevenLabs JARVIS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isConnected ? "bg-success" : "bg-muted"
            )}></div>
            <span className="text-xs text-success font-medium text-enhanced">
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Eye Tracking Controls */}
        {!eyeTrackingActive && (
          <div className="hidden lg:flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
            <span className="text-sm text-foreground/90 font-medium text-enhanced">Eye Tracking (Desktop)</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={startEyeTracking}
              disabled={eyeTrackingLoading}
              className="text-xs"
            >
              {eyeTrackingLoading ? "Starting..." : "Enable Eye Tracking"}
            </Button>
          </div>
        )}

        {eyeTrackingActive && (
          <div className="hidden lg:flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex flex-col">
              <span className="text-sm text-primary font-medium text-enhanced">Eye Tracking Active</span>
              {isCalibrated && (
                <span className="text-xs text-success font-medium text-enhanced">Calibrated ✓</span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={calibrateEyeTracking}
                disabled={eyeTrackingLoading}
                className="text-xs"
              >
                {eyeTrackingLoading ? "Calibrating..." : "Calibrate"}
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                onClick={stopEyeTracking}
                className="text-xs"
              >
                Stop
              </Button>
            </div>
          </div>
        )}

        {/* Response Area */}
        <div 
          ref={containerRef}
          className="h-96 overflow-y-auto space-y-3 p-4 bg-background/20 rounded-lg border border-border/30 touch-target backdrop-blur-sm"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded-lg max-w-[80%] transition-all duration-300 gaze-hover:shadow-glow backdrop-blur-sm",
                message.type === 'ai'
                  ? "bg-primary/10 border border-primary/20 mr-auto"
                  : "bg-secondary/10 border border-secondary/20 ml-auto",
                message.isProcessing && "animate-pulse"
              )}
            >
              <div className="flex items-start space-x-2">
                {message.type === 'ai' ? (
                  <Terminal className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                ) : (
                  <Zap className="h-4 w-4 text-secondary mt-1 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words font-medium text-enhanced">
                    {message.text}
                  </p>
                  <p className="text-xs text-foreground/80 mt-1 text-enhanced">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Connection Status */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30 backdrop-blur-sm">
          <p className="text-xs text-foreground/90 mb-2 font-medium text-enhanced">
            ElevenLabs Conversational AI - Voice-only interaction
          </p>
          <p className="text-sm text-foreground font-medium text-enhanced">
            {isConnected 
              ? "🎤 Connected - Speak naturally to JARVIS" 
              : "📞 Click the phone button in Voice Interface to connect"
            }
          </p>
        </div>
      </div>
    </JarvisPanel>
  );
};
