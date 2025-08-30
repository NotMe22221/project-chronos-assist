import { VoiceInterface } from '@/components/VoiceInterface';
import { CommandCenter } from '@/components/CommandCenter';
import { DataVisualization } from '@/components/DataVisualization';
import jarvisBg from '@/assets/jarvis-bg.jpg';

const Index = () => {
  return (
    <div 
      className="min-h-screen bg-background relative overflow-hidden"
      style={{
        backgroundImage: `url(${jarvisBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" />
      
      {/* Main content */}
      <div className="relative z-10 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-glow mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              JARVIS
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Just A Rather Very Intelligent System
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <span className="text-xs text-success font-mono">SYSTEM ONLINE</span>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {/* Left Column - Voice Interface & Data */}
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
            {/* Mobile Data Visualization */}
            <div className="lg:hidden">
              <DataVisualization />
            </div>
            
            {/* Quick Commands Panel */}
            <div className="jarvis-panel jarvis-glow">
              <div className="p-6">
                <h3 className="text-primary font-semibold text-glow mb-4">Quick Commands</h3>
                <div className="space-y-3">
                  {[
                    'Check system status',
                    'Analyze data patterns',
                    'Generate report',
                    'Monitor network activity',
                    'Run diagnostics'
                  ].map((command, index) => (
                    <div 
                      key={index}
                      className="p-3 bg-gradient-panel rounded border border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-secondary rounded-full group-hover:animate-pulse"></div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                          {command}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Status Panel */}
            <div className="jarvis-panel">
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
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="text-xs text-warning">PENDING</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Speech Synthesis</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="text-xs text-warning">PENDING</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-xs text-muted-foreground">
          <p>JARVIS AI Assistant - Version 1.0.0 | Ready for voice commands and API integration</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;