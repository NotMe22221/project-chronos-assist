import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JarvisPanel } from './JarvisPanel';
import { useJarvisAI } from '@/hooks/useJarvisAI';
import { cn } from '@/lib/utils';

export const VoiceInterface = () => {
  const {
    isListening,
    isSpeaking,
    transcript,
    startListening,
    stopListening,
    stopSpeaking
  } = useJarvisAI();

  const handleMicClick = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const handleSpeakerClick = () => {
    stopSpeaking();
  };

  return (
    <JarvisPanel title="Voice Interface" glow={isListening || isSpeaking} pulse={isListening}>
      <div className="space-y-4">
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleMicClick}
            variant={isListening ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-300",
              isListening && "animate-pulse-glow bg-gradient-primary shadow-glow"
            )}
          >
            {isListening ? (
              <Square className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
          <Button
            onClick={handleSpeakerClick}
            variant={isSpeaking ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full transition-all duration-300",
              isSpeaking && "animate-pulse-glow bg-gradient-secondary shadow-glow"
            )}
          >
            {isSpeaking ? (
              <VolumeX className="h-6 w-6" />
            ) : (
              <Volume2 className="h-6 w-6" />
            )}
          </Button>
        </div>
        
        <div className="min-h-[80px] p-4 bg-muted/30 rounded-lg border border-primary/20">
          <p className="text-sm text-muted-foreground mb-2">Transcript:</p>
          <p className="text-foreground">
            {transcript || (isListening ? "Listening..." : "Click the microphone to start")}
          </p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isListening ? "bg-primary animate-pulse" : "bg-muted"
            )}></div>
            <span className="text-xs text-muted-foreground">
              {isListening ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>
      </div>
    </JarvisPanel>
  );
};
