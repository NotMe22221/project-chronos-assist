
import { DataVisualization } from "@/components/DataVisualization";
import { HandTrackingInterface } from "@/components/HandTrackingInterface";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-glow mb-2">JARVIS AI Assistant</h1>
          <p className="text-muted-foreground text-enhanced">
            Hand gesture control — powered by MediaPipe
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hand Tracking */}
          <div>
            <HandTrackingInterface />
          </div>
          
          {/* Data Visualization */}
          <div>
            <DataVisualization />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
