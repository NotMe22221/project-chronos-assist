
import { CommandCenter } from "@/components/CommandCenter";
import { VoiceInterface } from "@/components/VoiceInterface";
import { DataVisualization } from "@/components/DataVisualization";
import { ScrollableContent } from "@/components/ScrollableContent";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 h-full">
          {/* Voice Interface */}
          <div className="lg:col-span-1">
            <VoiceInterface />
          </div>
          
          {/* Command Center */}
          <div className="lg:col-span-1">
            <CommandCenter />
          </div>
          
          {/* Data Visualization */}
          <div className="lg:col-span-1 xl:col-span-1">
            <DataVisualization />
          </div>
          
          {/* Scrollable Content for Testing */}
          <div className="lg:col-span-2 xl:col-span-3">
            <ScrollableContent />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
