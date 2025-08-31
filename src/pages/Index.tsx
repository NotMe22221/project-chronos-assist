
import { CommandCenter } from "@/components/CommandCenter";
import { VoiceInterface } from "@/components/VoiceInterface";
import { DataVisualization } from "@/components/DataVisualization";
import { HandTrackingInterface } from "@/components/HandTrackingInterface";
import { TestScrollableContent } from "@/components/TestScrollableContent";
import { ScrollableContent } from "@/components/ScrollableContent";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header with title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-glow mb-2">AI Assistant with Hand Tracking</h1>
          <p className="text-muted-foreground text-enhanced">
            Speech-to-speech AI + Hand gesture control powered by MediaPipe
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 h-full">
          {/* Voice Interface */}
          <div className="lg:col-span-1">
            <VoiceInterface />
          </div>
          
          {/* Command Center */}
          <div className="lg:col-span-1">
            <CommandCenter />
          </div>
          
          {/* Hand Tracking Interface - NEW FEATURE */}
          <div className="lg:col-span-1">
            <HandTrackingInterface />
          </div>
          
          {/* Data Visualization */}
          <div className="lg:col-span-1">
            <DataVisualization />
          </div>
          
          {/* Test Scrollable Content - For gesture testing */}
          <div className="lg:col-span-1">
            <TestScrollableContent />
          </div>
          
          {/* Original Scrollable Content */}
          <div className="lg:col-span-1">
            <ScrollableContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
