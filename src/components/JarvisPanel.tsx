import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface JarvisPanelProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  pulse?: boolean;
  title?: string;
}

export const JarvisPanel = ({ 
  children, 
  className, 
  glow = false, 
  pulse = false,
  title 
}: JarvisPanelProps) => {
  return (
    <div 
      className={cn(
        "jarvis-panel relative overflow-hidden",
        glow && "jarvis-glow",
        pulse && "pulse-glow",
        className
      )}
    >
      {title && (
        <div className="border-b border-border/30 p-4">
          <h3 className="text-primary font-semibold text-glow">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
      
      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60"></div>
    </div>
  );
};