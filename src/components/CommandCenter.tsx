
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
  const { isActive: eyeTrackingActive, startEyeTracking, calibrateEyeTracking } = useEyeTracking();
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
            <span className="text-sm font-medium">ElevenLabs JARVIS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isConnected ? "bg-success" : "bg-muted"
            )}></div>
            <span className="text-xs text-success">
              {isConnected ? "CONNECTED" : "OFFLINE"}
            </span>
          </div>
        </div>

        {/* Eye Tracking Controls */}
        {!eyeTrackingActive && (
          <div className="hidden lg:flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
            <span className="text-sm text-muted-foreground">Eye Tracking (Desktop)</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={startEyeTracking}
              className="text-xs"
            >
              Enable Eye Tracking
            </Button>
          </div>
        )}

        {eyeTrackingActive && (
          <div className="hidden lg:flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
            <span className="text-sm text-primary">Eye Tracking Active</span>
            <Button 
              size="sm" 
              variant="outline"
              onClick={calibrateEyeTracking}
              className="text-xs"
            >
              Calibrate
            </Button>
          </div>
        )}

        {/* Response Area */}
        <div 
          ref={containerRef}
          className="h-96 overflow-y-auto space-y-3 p-4 bg-background/20 rounded-lg border border-border/30 touch-target"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "p-3 rounded-lg max-w-[80%] transition-all duration-300 gaze-hover:shadow-glow",
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
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Connection Status */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">
            ElevenLabs Conversational AI - Voice-only interaction
          </p>
          <p className="text-sm text-foreground">
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
