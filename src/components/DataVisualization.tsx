import { useState, useEffect } from 'react';
import { JarvisPanel } from './JarvisPanel';
import { Activity, Cpu, Database, Wifi } from 'lucide-react';

interface MetricData {
  label: string;
  value: number;
  max: number;
  icon: React.ReactNode;
  color: string;
}

export const DataVisualization = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([
    {
      label: 'CPU Usage',
      value: 45,
      max: 100,
      icon: <Cpu className="h-4 w-4" />,
      color: 'primary'
    },
    {
      label: 'Memory',
      value: 68,
      max: 100,
      icon: <Database className="h-4 w-4" />,
      color: 'secondary'
    },
    {
      label: 'Network',
      value: 32,
      max: 100,
      icon: <Wifi className="h-4 w-4" />,
      color: 'accent'
    },
    {
      label: 'AI Load',
      value: 78,
      max: 100,
      icon: <Activity className="h-4 w-4" />,
      color: 'primary'
    },
  ]);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        value: Math.max(10, Math.min(95, metric.value + (Math.random() - 0.5) * 10))
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getBarColor = (value: number, colorType: string) => {
    if (value > 80) return 'bg-destructive';
    if (value > 60) return 'bg-warning';
    return colorType === 'primary' ? 'bg-primary' : 
           colorType === 'secondary' ? 'bg-secondary' : 'bg-accent';
  };

  return (
    <div className="space-y-4">
      <JarvisPanel title="System Metrics" pulse>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-primary">{metric.icon}</div>
                  <span className="text-sm font-medium">{metric.label}</span>
                </div>
                <span className="text-sm text-primary font-mono">
                  {Math.round(metric.value)}%
                </span>
              </div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-1000 rounded-full",
                    getBarColor(metric.value, metric.color)
                  )}
                  style={{ width: `${(metric.value / metric.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </JarvisPanel>

      <JarvisPanel title="Data Streams" glow>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((stream) => (
            <div 
              key={stream}
              className="flex items-center space-x-3 p-2 bg-gradient-panel rounded border border-primary/10"
            >
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="flex-1 h-1 bg-muted/30 rounded overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary animate-data-stream"
                  style={{ animationDelay: `${stream * 0.5}s` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                STREAM_{stream.toString().padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>
      </JarvisPanel>
    </div>
  );
};

import { cn } from '@/lib/utils';