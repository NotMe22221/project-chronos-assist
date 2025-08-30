import { useState, useEffect } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Terminal, Brain, Zap } from 'lucide-react';

export const CommandCenter = () => {
  const [responses, setResponses] = useState<Array<{
    id: string;
    text: string;
    timestamp: Date;
    type: 'user' | 'ai';
  }>>([
    {
      id: '1',
      text: 'Good evening. JARVIS is online and ready for your commands.',
      timestamp: new Date(),
      type: 'ai'
    }
  ]);

  const [isProcessing, setIsProcessing] = useState(false);

  // Simulate AI thinking animation
  useEffect(() => {
    const interval = setInterval(() => {
      if (isProcessing) {
        // Add processing animation
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isProcessing]);

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

        {/* Response Area */}
        <div className="h-96 overflow-y-auto space-y-3 p-4 bg-background/20 rounded-lg border border-border/30">
          {responses.map((response) => (
            <div
              key={response.id}
              className={cn(
                "p-3 rounded-lg max-w-[80%]",
                response.type === 'ai'
                  ? "bg-primary/10 border border-primary/20 mr-auto"
                  : "bg-secondary/10 border border-secondary/20 ml-auto"
              )}
            >
              <div className="flex items-start space-x-2">
                {response.type === 'ai' ? (
                  <Terminal className="h-4 w-4 text-primary mt-1" />
                ) : (
                  <Zap className="h-4 w-4 text-secondary mt-1" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-foreground">{response.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {response.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mr-auto max-w-[80%]">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-primary" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-primary">Processing...</span>
              </div>
            </div>
          )}
        </div>

        {/* Command Input Area */}
        <div className="p-3 bg-muted/20 rounded-lg border border-border/30">
          <p className="text-xs text-muted-foreground mb-2">Ready for voice commands or manual input</p>
          <div className="h-8 bg-gradient-to-r from-primary/20 to-secondary/20 rounded animate-pulse"></div>
        </div>
      </div>
    </JarvisPanel>
  );
};

import { cn } from '@/lib/utils';