
import { VoiceInterface } from '@/components/VoiceInterface';
import { CommandCenter } from '@/components/CommandCenter';
import { DataVisualization } from '@/components/DataVisualization';
import { HandTracking } from '@/components/HandTracking';
import { useEyeTracking } from '@/hooks/useEyeTracking';
import { useTouchNavigation } from '@/hooks/useTouchNavigation';
import { useEffect, useRef } from 'react';

const Index = () => {
  const { gazePosition } = useEyeTracking();
  const { addGestureSupport, setCallbacks } = useTouchNavigation();
  const mainRef = useRef<HTMLDivElement>(null);

  // Initialize touch gestures for the main container
  useEffect(() => {
    if (mainRef.current) {
      const cleanup = addGestureSupport(mainRef.current);
      
      // Set up swipe callbacks for navigation
      setCallbacks({
        onSwipe: (gesture) => {
          console.log('Swipe detected:', gesture);
          if (gesture.direction === 'up' || gesture.direction === 'down') {
            const scrollAmount = gesture.direction === 'up' ? -200 : 200;
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          }
        }
      });

      return cleanup;
    }
  }, [addGestureSupport, setCallbacks]);

  // Add enhanced keyframes animation to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes grid-glow {
        0% {
          opacity: 0.6;
          filter: brightness(1.2);
        }
        100% {
          opacity: 0.9;
          filter: brightness(1.8);
        }
      }
      @keyframes background-pulse {
        0% {
          background-size: 40px 40px;
          opacity: 0.6;
        }
        50% {
          background-size: 45px 45px;
          opacity: 0.8;
        }
        100% {
          background-size: 40px 40px;
          opacity: 0.6;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div 
      ref={mainRef}
      className="min-h-screen bg-background relative overflow-hidden touch-target"
      style={{
        backgroundImage: `
          linear-gradient(hsl(200 100% 60% / 0.8) 1px, transparent 1px),
          linear-gradient(90deg, hsl(200 100% 60% / 0.8) 1px, transparent 1px),
          radial-gradient(circle at 25% 25%, hsl(200 100% 50% / 0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, hsl(180 100% 50% / 0.1) 0%, transparent 50%)
        `,
        backgroundSize: '40px 40px, 40px 40px, 300px 300px, 300px 300px',
        animation: 'grid-glow 3s ease-in-out infinite alternate, background-pulse 4s ease-in-out infinite'
      }}
    >
      {/* Enhanced Grid overlay for more glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, hsl(200 100% 60% / 0.2) 0%, transparent 40%),
            radial-gradient(circle at 80% 80%, hsl(180 100% 60% / 0.2) 0%, transparent 40%),
            radial-gradient(circle at 50% 10%, hsl(200 100% 70% / 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 90%, hsl(180 100% 70% / 0.15) 0%, transparent 50%)
          `,
          backgroundSize: '600px 600px, 500px 500px, 800px 400px, 800px 400px'
        }}
      />
      
      {/* Enhanced Background overlay with subtle glow */}
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[0.5px]" />
      
      {/* Main content */}
      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        {/* Enhanced Header with more glow */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-glow mb-4 touch-target">
            <span 
              className="bg-gradient-primary bg-clip-text text-transparent"
              style={{
                filter: 'drop-shadow(0 0 20px hsl(200 100% 60% / 0.8)) drop-shadow(0 0 40px hsl(200 100% 70% / 0.4))'
              }}
            >
              JARVIS
            </span>
          </h1>
          <p className="text-muted-foreground text-lg text-glow">
            Just A Rather Very Intelligent System
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_20px_hsl(var(--success))]"></div>
            <span className="text-sm text-success font-mono text-glow">SYSTEM ONLINE - AI READY</span>
          </div>
          
          {/* Enhanced Gaze position indicator */}
          {gazePosition.x > 0 && (
            <div className="mt-2 text-xs text-primary/80 text-glow">
              Gaze: {Math.round(gazePosition.x)}, {Math.round(gazePosition.y)}
            </div>
          )}
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Voice Interface & Status */}
          <div className="space-y-6">
            <VoiceInterface />
            <div className="hidden lg:block">
              <DataVisualization />
            </div>
          </div>

          {/* Center Column - Command Center */}
          <div className="lg:col-span-1">
            <CommandCenter />
          </div>

          {/* Right Column - Hand Tracking & Additional Panels */}
          <div className="space-y-6">
            {/* Hand Tracking Component */}
            <HandTracking />
            
            {/* Mobile Status */}
            <div className="lg:hidden">
              <DataVisualization />
            </div>
            
            {/* Enhanced Quick Commands Panel */}
            <div className="jarvis-panel touch-target jarvis-glow">
              <div className="p-6">
                <h3 className="text-primary font-semibold text-glow mb-4">Voice Commands</h3>
                <div className="space-y-3">
                  {[
                    "What's the weather like?",
                    'Analyze my daily schedule',
                    'Generate a status report',
                    'What time is it?',
                    'Tell me a joke'
                  ].map((command, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gradient-panel rounded border border-primary/30 hover:border-primary/60 transition-all duration-300 cursor-pointer group touch-target gaze-hover"
                      style={{
                        boxShadow: '0 0 10px hsl(var(--primary) / 0.2)'
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full shadow-[0_0_10px_hsl(var(--secondary))]"></div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          "{command}"
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced System Status Panel */}
            <div className="jarvis-panel touch-target jarvis-glow pulse-glow">
              <div className="p-6">
                <h3 className="text-primary font-semibold text-glow mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Voice Recognition</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                      <span className="text-xs text-success text-glow">READY</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">AI Processing</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                      <span className="text-xs text-success text-glow">ACTIVE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Eye Tracking</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                      <span className="text-xs text-success text-glow">AVAILABLE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Speech Synthesis</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                      <span className="text-xs text-success text-glow">READY</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Touch Navigation</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                      <span className="text-xs text-success text-glow">ENABLED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Scrollable Content for Testing */}
        <div className="mt-16 max-w-4xl mx-auto space-y-8">
          <div className="jarvis-panel touch-target jarvis-glow">
            <div className="p-6">
              <h3 className="text-primary font-semibold text-glow mb-4">Hand Gesture Testing Area</h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>This section provides additional scrollable content to test the hand gesture controls:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Fist (✊)</strong> - Scroll up to see previous content</li>
                  <li><strong>Open Hand (🖐️)</strong> - Scroll down to see more content</li>
                  <li><strong>Peace Sign (✌️)</strong> - Click the test button in the Hand Tracking panel</li>
                </ul>
                <p>The hand tracking system uses MediaPipe Hands for real-time gesture recognition and works on both desktop and mobile browsers with camera access.</p>
              </div>
            </div>
          </div>

          <div className="jarvis-panel touch-target jarvis-glow">
            <div className="p-6">
              <h3 className="text-secondary font-semibold text-glow mb-4">AI Integration Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Voice Recognition</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                    <span className="text-xs text-success text-glow">ACTIVE</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Hand Tracking</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                    <span className="text-xs text-success text-glow">AVAILABLE</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Eye Tracking</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                    <span className="text-xs text-success text-glow">READY</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Multi-Modal Control</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-success rounded-full shadow-[0_0_15px_hsl(var(--success))]"></div>
                    <span className="text-xs text-success text-glow">INTEGRATED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="jarvis-panel touch-target jarvis-glow">
            <div className="p-6">
              <h3 className="text-primary font-semibold text-glow mb-4">Scrollable Content Demo</h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.</p>
                <div className="p-4 bg-primary/10 rounded border border-primary/20 mt-4">
                  <p className="text-primary font-medium">Hand Gesture Tip:</p>
                  <p className="text-xs mt-1">Make sure your hand is clearly visible in the camera feed and gestures are deliberate for best recognition accuracy.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="text-center mt-12 text-xs text-muted-foreground">
          <p className="text-glow">JARVIS AI Assistant - Version 2.0.0 | Full Speech-to-Speech AI • Eye Tracking • Touch Navigation</p>
          <p className="mt-2 text-primary/80 text-glow">
            🎤 Voice Commands • 👁️ Eye Tracking (Desktop) • 👆 Touch Navigation (Mobile) • 🧠 OpenAI GPT-4
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
