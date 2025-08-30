import { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JarvisPanel } from './JarvisPanel';

export const VoiceInterface = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');

  const toggleListening = () => {
    setIsListening(!isListening);
    // Future: Initialize speech recognition
  };

  const toggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
    // Future: Initialize text-to-speech
  };

  return (
    <JarvisPanel title="Voice Interface" glow={isListening || isSpeaking} pulse={isListening}>
      <div className="space-y-4">
        <div className="flex justify-center space-x-4">
          <Button
            onClick={toggleListening}
            variant={isListening ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full",
              isListening && "animate-pulse-glow bg-gradient-primary"
            )}
          >
            {isListening ? (
              <Mic className="h-6 w-6" />
            ) : (
              <MicOff className="h-6 w-6" />
            )}
          </Button>
          <Button
            onClick={toggleSpeaking}
            variant={isSpeaking ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-16 w-16 rounded-full",
              isSpeaking && "animate-pulse-glow bg-gradient-secondary"
            )}
          >
            {isSpeaking ? (
              <Volume2 className="h-6 w-6" />
            ) : (
              <VolumeX className="h-6 w-6" />
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

// Import cn from utils
import { cn } from '@/lib/utils';