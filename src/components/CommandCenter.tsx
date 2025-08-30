import { useState, useEffect, useRef } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Terminal, Brain, Zap, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useJarvisAI } from '@/hooks/useJarvisAI';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { useTouchNavigation } from '@/hooks/useTouchNavigation';
import { cn } from '@/lib/utils';

export const CommandCenter = () => {
  const { messages, isProcessing, sendTextMessage } = useJarvisAI();
  const { isActive: eyeTrackingActive, startEyeTracking, calibrateEyeTracking } = useEyeTracking();
  const { addGestureSupport } = useTouchNavigation();
  const [inputValue, setInputValue] = useState('');
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    
    await sendTextMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <JarvisPanel 
      title="AI Command Center" 
      glow={isProcessing} 
      pulse={isProcessing}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Status Indicators */}
        <div className="flex items-center justify-between p-3 bg-gradient-panel rounded-lg border border-primary/10">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">AI Status</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-success">ONLINE</span>
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

        {/* Command Input Area */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">
            {eyeTrackingActive ? "Voice commands, text input, or gaze selection available" : "Voice commands or text input"}
          </p>
          <div className="flex space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your command..."
              disabled={isProcessing}
              className="flex-1 bg-background/50 border-primary/20 focus:border-primary/40"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isProcessing}
              size="sm"
              className="px-3"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </JarvisPanel>
  );
};
