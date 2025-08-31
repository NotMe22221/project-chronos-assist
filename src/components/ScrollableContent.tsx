
import { JarvisPanel } from './JarvisPanel';
import { ScrollText, Zap, Brain, Eye, Hand } from 'lucide-react';

export const ScrollableContent = () => {
  return (
    <JarvisPanel title="Scrollable Test Area" className="h-full">
      <div className="space-y-6">
        {/* Introduction */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
          <div className="flex items-center space-x-2 mb-3">
            <ScrollText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary text-enhanced">Test Your Hand Gestures Here</h3>
          </div>
          <p className="text-sm text-foreground/90 text-enhanced">
            Use this scrollable area to test your hand tracking gestures. Make a fist to scroll up, 
            open your hand to scroll down, or use a peace sign to click the test button above.
          </p>
        </div>

        {/* Feature Cards */}
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="p-4 bg-gradient-panel rounded-lg border border-border/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              {i % 4 === 0 && <Brain className="h-5 w-5 text-secondary" />}
              {i % 4 === 1 && <Zap className="h-5 w-5 text-primary" />}
              {i % 4 === 2 && <Eye className="h-5 w-5 text-accent" />}
              {i % 4 === 3 && <Hand className="h-5 w-5 text-success" />}
              <h4 className="font-semibold text-foreground text-enhanced">
                {i % 4 === 0 && 'AI Processing'}
                {i % 4 === 1 && 'Voice Recognition'}
                {i % 4 === 2 && 'Eye Tracking'}
                {i % 4 === 3 && 'Hand Gestures'}
              </h4>
            </div>
            <p className="text-sm text-foreground/90 text-enhanced mb-4">
              {i % 4 === 0 && 'Advanced AI processing capabilities for natural language understanding and response generation.'}
              {i % 4 === 1 && 'Real-time voice recognition and speech-to-text conversion with high accuracy.'}
              {i % 4 === 2 && 'Precise eye tracking for hands-free navigation and interface control.'}
              {i % 4 === 3 && 'Intuitive hand gesture recognition for seamless user interaction and control.'}
            </p>
            
            {/* Progress bars for visual interest */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-foreground/70 text-enhanced">
                <span>Accuracy</span>
                <span>{85 + (i * 2)}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${85 + (i * 2)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom spacer for better scrolling */}
        <div className="h-32 flex items-center justify-center">
          <p className="text-sm text-foreground/70 text-enhanced">
            🎯 End of scrollable content - Test your gestures above!
          </p>
        </div>
      </div>
    </JarvisPanel>
  );
};
