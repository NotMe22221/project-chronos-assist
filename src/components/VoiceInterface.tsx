
import { Mic, Square, Volume2, VolumeX, Phone, PhoneOff, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JarvisPanel } from './JarvisPanel';
import { useElevenLabsConversation } from '@/hooks/useElevenLabsConversation';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { useState } from 'react';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';

export const VoiceInterface = () => {
  const { features, toggleFeature } = useFeatureToggle();
  const {
    isConnected,
    isSpeaking,
    status,
    startConversation,
    endConversation,
    setVolume
  } = useElevenLabsConversation();
  
  const [volumeLevel, setVolumeLevel] = useState([0.8]);

  const handleConnectionToggle = async () => {
    if (isConnected) {
      await endConversation();
    } else {
      await startConversation();
    }
  };

  const handleVolumeChange = async (value: number[]) => {
    setVolumeLevel(value);
    await setVolume(value[0]);
  };

  return (
    <JarvisPanel title="Voice Interface" glow={isConnected || isSpeaking} pulse={isSpeaking}>
      <div className="space-y-4">
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleConnectionToggle}
            variant={isConnected ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-300",
              isConnected && "animate-pulse-glow bg-gradient-primary shadow-glow"
            )}
          >
            {isConnected ? (
              <PhoneOff className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
          
          <Button
            variant={isSpeaking ? "default" : "outline"}
            size="lg"
            disabled={!isConnected}
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-300",
              isSpeaking && "animate-pulse-glow bg-gradient-secondary shadow-glow"
            )}
          >
            {isSpeaking ? (
              <Volume2 className="h-6 w-6" />
            ) : (
              <VolumeX className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        {/* Volume Control */}
        {isConnected && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground drop-shadow-lg">Volume</label>
            <Slider
              value={volumeLevel}
              onValueChange={handleVolumeChange}
              max={1}
              min={0}
              step={0.1}
              className="w-full"
            />
          </div>
        )}
        
        <div className="min-h-[80px] p-4 bg-background/90 backdrop-blur-sm rounded-lg border border-primary/20 shadow-lg">
          <p className="text-sm font-medium text-foreground/80 mb-2 drop-shadow">Status:</p>
          <p className="text-foreground font-medium drop-shadow-lg">
            {isConnected 
              ? `Connected - ${isSpeaking ? 'JARVIS is speaking...' : 'Ready for voice commands'}` 
              : 'Click to connect and start talking to JARVIS'
            }
          </p>
          <p className="text-xs text-foreground/70 mt-2 drop-shadow">
            Connection Status: {status}
          </p>
        </div>

        {/* Feature Toggle Indicators */}
        <div className="flex items-center justify-between p-2 bg-muted/10 rounded border border-border/20">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-primary animate-pulse" : "bg-muted"
            )}></div>
            <span className="text-xs font-medium text-foreground drop-shadow-lg">
              {isConnected ? "CONNECTED" : "DISCONNECTED"}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFeature('voiceResponses')}
            className={cn(
              "h-7 px-2 text-xs",
              features.voiceResponses ? "text-success" : "text-destructive"
            )}
          >
            <Power className="h-3 w-3 mr-1" />
            Voice {features.voiceResponses ? 'ON' : 'MUTED'}
          </Button>
        </div>
      </div>
    </JarvisPanel>
  );
};
