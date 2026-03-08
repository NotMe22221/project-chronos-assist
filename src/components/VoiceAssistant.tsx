import { useRef, useEffect } from 'react';
import { Phone, PhoneOff, Mic, Volume2, VolumeX, Bot, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JarvisPanel } from './JarvisPanel';
import { useVoiceAssistant } from '@/hooks/useVoiceAssistant';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';
import { cn } from '@/lib/utils';

export const VoiceAssistant = () => {
  const { features, toggleFeature } = useFeatureToggle();
  const {
    messages,
    isConnected,
    isConnecting,
    isSpeaking,
    status,
    startConversation,
    endConversation,
    agentPending,
    agentRunning,
    confirmAgentStep,
  } = useVoiceAssistant();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleToggle = async () => {
    if (isConnected) await endConversation();
    else await startConversation();
  };

  return (
    <JarvisPanel
      title="JARVIS Voice Assistant"
      glow={isConnected || isSpeaking}
      pulse={isSpeaking}
      className="h-full"
    >
      <div className="space-y-4">
        {/* Connection & Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToggle}
              disabled={isConnecting}
              size="lg"
              className={cn(
                'h-14 w-14 rounded-full transition-all duration-300',
                isConnected
                  ? 'bg-destructive hover:bg-destructive/80 shadow-glow'
                  : 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90',
                isConnecting && 'animate-pulse',
              )}
            >
              {isConnected ? <PhoneOff className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </Button>
            <div>
              <p className="text-sm font-medium text-foreground text-enhanced">
                {isConnecting
                  ? 'Connecting...'
                  : isConnected
                  ? isSpeaking
                    ? 'JARVIS is speaking...'
                    : 'Listening for commands'
                  : 'Click to activate'}
              </p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleFeature('voiceResponses')}
            className={cn(
              'h-8 px-2 text-xs gap-1',
              features.voiceResponses ? 'text-success' : 'text-destructive',
            )}
          >
            {features.voiceResponses ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {features.voiceResponses ? 'ON' : 'MUTED'}
          </Button>
        </div>

        {/* Listening indicator */}
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <div className="relative flex items-center justify-center">
              <Mic className="h-4 w-4 text-primary" />
              {!isSpeaking && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-xs text-primary font-medium text-enhanced">
              {isSpeaking ? 'Speaking — say something to interrupt' : 'Microphone active — speak naturally'}
            </span>
          </div>
        )}

        {/* Browser Agent Confirmation */}
        {agentPending && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-accent-foreground" />
              <span className="text-xs font-semibold text-accent-foreground">Step {agentPending.step}</span>
            </div>
            <p className="text-sm text-foreground">{agentPending.action.description}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {agentPending.action.action}: {agentPending.action.selector || agentPending.action.url || ''}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1 bg-success hover:bg-success/80"
                onClick={() => confirmAgentStep(true)}
              >
                <Check className="h-3 w-3" /> Execute
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1"
                onClick={() => confirmAgentStep(false)}
              >
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Agent running indicator */}
        {agentRunning && !agentPending && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <Bot className="h-4 w-4 text-accent-foreground animate-pulse" />
            <span className="text-xs text-accent-foreground font-medium">Browser agent working...</span>
          </div>
        )}

        {/* Message log */}
        <div className="h-64 overflow-y-auto space-y-2 p-3 bg-background/20 rounded-lg border border-border/30 backdrop-blur-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'p-2.5 rounded-lg max-w-[85%] text-sm backdrop-blur-sm',
                msg.type === 'ai'
                  ? 'bg-primary/10 border border-primary/20 mr-auto'
                  : 'bg-secondary/10 border border-secondary/20 ml-auto',
              )}
            >
              <p className="text-foreground text-enhanced whitespace-pre-wrap break-words">{msg.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{msg.timestamp.toLocaleTimeString()}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Feature status */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            'flex items-center gap-2 p-2 rounded border text-xs font-medium text-enhanced',
            features.handTracking
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-muted/20 border-border/30 text-muted-foreground',
          )}>
            <div className={cn('w-2 h-2 rounded-full', features.handTracking ? 'bg-success animate-pulse' : 'bg-muted')} />
            Hand Tracking {features.handTracking ? 'ON' : 'OFF'}
          </div>
          <div className={cn(
            'flex items-center gap-2 p-2 rounded border text-xs font-medium text-enhanced',
            features.voiceResponses
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-muted/20 border-border/30 text-muted-foreground',
          )}>
            <div className={cn('w-2 h-2 rounded-full', features.voiceResponses ? 'bg-success animate-pulse' : 'bg-muted')} />
            Voice {features.voiceResponses ? 'ON' : 'MUTED'}
          </div>
        </div>
      </div>
    </JarvisPanel>
  );
};
