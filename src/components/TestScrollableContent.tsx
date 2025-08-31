import { JarvisPanel } from './JarvisPanel';
import { Scroll, Zap, Cpu, Eye, Brain, Hand } from 'lucide-react';

/**
 * Test Scrollable Content Component
 * 
 * This component provides extensive scrollable content to test
 * the hand tracking scroll gestures (fist = scroll up, open hand = scroll down)
 */
export const TestScrollableContent = () => {
  return (
    <JarvisPanel title="Scrollable Test Content" className="h-full">
      <div className="space-y-6">
        {/* Instructions Header */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center space-x-2 mb-2">
            <Scroll className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Test Your Hand Gestures Here!</h3>
          </div>
          <p className="text-xs text-primary/80">
            Use your hand gestures to scroll through this content. Make a fist to scroll up, 
            open your hand to scroll down, and use the peace sign to click buttons.
          </p>
        </div>

        {/* Test Content Sections */}
        <div className="space-y-4">
          <div className="p-4 bg-gradient-panel rounded-lg border border-border/30">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-5 w-5 text-accent" />
              <h4 className="text-sm font-medium text-enhanced">AI Assistant Features</h4>
            </div>
            <p className="text-xs text-foreground/90 text-enhanced mb-3">
              Your AI assistant now includes advanced hand tracking capabilities powered by MediaPipe Hands. 
              This technology enables natural gesture-based interaction without requiring any additional hardware.
            </p>
            <ul className="text-xs text-foreground/80 space-y-1">
              <li>• Real-time hand detection and landmark tracking</li>
              <li>• Gesture recognition with visual feedback</li>
              <li>• Smooth scrolling integration</li>
              <li>• Button interaction via gestures</li>
              <li>• Cross-platform browser compatibility</li>
            </ul>
          </div>

          <div className="p-4 bg-gradient-panel rounded-lg border border-border/30">
            <div className="flex items-center space-x-2 mb-3">
              <Hand className="h-5 w-5 text-secondary" />
              <h4 className="text-sm font-medium text-enhanced">Gesture Technology</h4>
            </div>
            <p className="text-xs text-foreground/90 text-enhanced mb-3">
              The hand tracking system uses computer vision to analyze your hand position and finger states 
              in real-time. Each gesture is carefully detected and mapped to specific actions.
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2 bg-background/20 rounded">
                <strong className="text-primary">Fist Detection:</strong> Analyzes when all fingers are closed
              </div>
              <div className="p-2 bg-background/20 rounded">
                <strong className="text-secondary">Open Hand:</strong> Detects when all 5 fingers are extended
              </div>
              <div className="p-2 bg-background/20 rounded">
                <strong className="text-accent">Peace Sign:</strong> Identifies index and middle finger extension
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-panel rounded-lg border border-border/30">
            <div className="flex items-center space-x-2 mb-3">
              <Eye className="h-5 w-5 text-warning" />
              <h4 className="text-sm font-medium text-enhanced">Computer Vision Pipeline</h4>
            </div>
            <p className="text-xs text-foreground/90 text-enhanced mb-3">
              The system processes video frames through multiple stages to achieve accurate hand detection:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Camera input capture (640x480 resolution)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-secondary rounded-full"></div>
                <span>MediaPipe hand landmark detection</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span>21-point hand skeleton mapping</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>Gesture classification and action triggering</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-panel rounded-lg border border-border/30">
            <div className="flex items-center space-x-2 mb-3">
              <Cpu className="h-5 w-5 text-success" />
              <h4 className="text-sm font-medium text-enhanced">Performance Optimization</h4>
            </div>
            <p className="text-xs text-foreground/90 text-enhanced mb-3">
              The hand tracking system is optimized for real-time performance across different devices:
            </p>
            <ul className="text-xs text-foreground/80 space-y-1">
              <li>• Model complexity balanced for accuracy vs speed</li>
              <li>• Single hand detection to reduce computational load</li>
              <li>• Confidence thresholds to filter false positives</li>
              <li>• Smooth gesture transitions with cooldown periods</li>
              <li>• Error handling for robust operation</li>
            </ul>
          </div>

          <div className="p-4 bg-gradient-panel rounded-lg border border-border/30">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-medium text-enhanced">Integration Benefits</h4>
            </div>
            <p className="text-xs text-foreground/90 text-enhanced mb-3">
              Hand gesture controls complement your existing AI assistant features:
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-2 bg-primary/10 rounded border border-primary/20">
                <strong>Accessibility:</strong> Hands-free navigation for users with mobility limitations
              </div>
              <div className="p-2 bg-secondary/10 rounded border border-secondary/20">
                <strong>Convenience:</strong> Quick actions without touching the interface
              </div>
              <div className="p-2 bg-accent/10 rounded border border-accent/20">
                <strong>Innovation:</strong> Natural interaction paradigm for modern applications
              </div>
            </div>
          </div>

          {/* More test content to enable longer scrolling */}
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="p-3 bg-muted/20 rounded border border-border/20">
                <h5 className="text-sm font-medium text-enhanced mb-2">
                  Test Section {i + 1} - Keep Scrolling!
                </h5>
                <p className="text-xs text-foreground/80">
                  This is additional scrollable content to test your hand gesture controls. 
                  Try making a fist to scroll up and opening your hand to scroll down. 
                  The peace sign should click the test button above.
                </p>
                {i % 3 === 0 && (
                  <div className="mt-2 p-2 bg-primary/5 rounded text-xs text-primary">
                    💡 Tip: Make sure your hand is well-lit and clearly visible to the camera for best results.
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Final section */}
          <div className="p-4 bg-gradient-primary rounded-lg text-primary-foreground">
            <h4 className="text-sm font-semibold mb-2">🎉 End of Scrollable Content</h4>
            <p className="text-xs opacity-90">
              Congratulations! You've reached the end of the test content. 
              Try scrolling back up using your fist gesture, or test the peace sign click gesture 
              with the test button at the top.
            </p>
          </div>
        </div>
      </div>
    </JarvisPanel>
  );
};