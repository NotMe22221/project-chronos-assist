
import { VoiceInterface } from '@/components/VoiceInterface';
import { CommandCenter } from '@/components/CommandCenter';
import { DataVisualization } from '@/components/DataVisualization';
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

  // Add the keyframes animation to document head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes grid-glow {
        0% {
          filter: brightness(1) contrast(1);
        }
        100% {
          filter: brightness(1.2) contrast(1.1);
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
          linear-gradient(rgba(0, 100, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 100, 255, 0.1) 1px, transparent 1px),
          radial-gradient(circle at 50% 50%, rgba(0, 100, 255, 0.3) 0%, transparent 70%)
        `,
        backgroundSize: '50px 50px, 50px 50px, 100% 100%',
        backgroundPosition: '0 0, 0 0, center',
        animation: 'grid-glow 4s ease-in-out infinite alternate'
      }}
    >
      {/* Background overlay for better readability */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px]" />
      
      {/* Main content */}
      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-glow mb-4 touch-target">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              JARVIS
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Just A Rather Very Intelligent System
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-xs text-success font-mono">SYSTEM ONLINE - AI READY</span>
          </div>
          
          {/* Gaze position indicator (only visible when eye tracking is active) */}
          {gazePosition.x > 0 && (
            <div className="mt-2 text-xs text-primary/60">
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

          {/* Right Column - Additional Panels */}
          <div className="space-y-6">
            {/* Mobile Status */}
            <div className="lg:hidden">
              <DataVisualization />
            </div>
            
            {/* Quick Commands Panel */}
            <div className="jarvis-panel touch-target">
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
                      className="p-3 bg-gradient-panel rounded border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group touch-target gaze-hover"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full"></div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          "{command}"
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Status Panel */}
            <div className="jarvis-panel touch-target">
              <div className="p-6">
                <h3 className="text-primary font-semibold text-glow mb-4">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Voice Recognition</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">READY</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">AI Processing</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">ACTIVE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Eye Tracking</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">AVAILABLE</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Speech Synthesis</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">READY</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Touch Navigation</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success rounded-full"></div>
                      <span className="text-xs text-success">ENABLED</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-xs text-muted-foreground">
          <p>JARVIS AI Assistant - Version 2.0.0 | Full Speech-to-Speech AI • Eye Tracking • Touch Navigation</p>
          <p className="mt-2 text-primary/60">
            🎤 Voice Commands • 👁️ Eye Tracking (Desktop) • 👆 Touch Navigation (Mobile) • 🧠 OpenAI GPT-4
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
