
import { JarvisPanel } from './JarvisPanel';

export const DataVisualization = () => {
  return (
    <div className="space-y-4">
      <JarvisPanel title="System Status" pulse>
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
            <span className="text-lg font-medium text-success">All Systems Operational</span>
          </div>
          <p className="text-sm text-muted-foreground">
            JARVIS AI is running optimally and ready for commands.
          </p>
        </div>
      </JarvisPanel>
    </div>
  );
};
