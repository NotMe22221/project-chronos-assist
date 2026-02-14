import { useConversation } from '@11labs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';
import { supabase } from '@/integrations/supabase/client';

const AGENT_ID = 'agent_0401k3w8fx86e22sdaw6j6va5dd7';

interface ConversationMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'ai';
}

export const useVoiceAssistant = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      text: 'JARVIS online. Voice and gesture control ready.',
      timestamp: new Date(),
      type: 'ai',
    },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const { processVoiceCommand, features } = useFeatureToggle();

  // Refs for latest state inside closures
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const prevVoiceRef = useRef(features.voiceResponses);

  const conversation = useConversation({
    clientTools: {
      enableHandTracking: () => {
        if (featuresRef.current.handTracking) return 'Hand tracking is already enabled.';
        processVoiceCommand('start hand tracking');
        return 'Hand tracking enabled.';
      },
      disableHandTracking: () => {
        if (!featuresRef.current.handTracking) return 'Hand tracking is already disabled.';
        processVoiceCommand('stop hand tracking');
        return 'Hand tracking disabled.';
      },
      enableVoice: () => {
        if (featuresRef.current.voiceResponses) return 'Voice responses are already enabled.';
        processVoiceCommand('start talking');
        return 'Voice responses enabled.';
      },
      disableVoice: () => {
        if (!featuresRef.current.voiceResponses) return 'Voice responses are already disabled.';
        processVoiceCommand('stop talking');
        return 'Voice responses disabled.';
      },
    },
    onConnect: () => {
      setIsConnected(true);
      setIsConnecting(false);
      toast({ title: 'JARVIS Connected', description: 'Voice assistant is active' });
    },
    onDisconnect: () => {
      setIsConnected(false);
      setIsConnecting(false);
    },
    onMessage: (message) => {
      if (!message || typeof message !== 'object') return;

      let text = '';
      let type: 'user' | 'ai' = 'ai';

      if ('message' in message && typeof message.message === 'string') text = message.message;
      else if ('text' in message && typeof message.text === 'string') text = message.text;

      if ('source' in message) type = message.source === 'user' ? 'user' : 'ai';

      if (!text.trim()) return;

      // Regex fallback for user commands
      if (type === 'user') processVoiceCommand(text);

      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), text, timestamp: new Date(), type },
      ]);
    },
    onError: (error: unknown) => {
      console.error('Voice assistant error:', error);
      setIsConnecting(false);
      toast({
        title: 'Voice Error',
        description: typeof error === 'string' ? error : 'Connection error',
        variant: 'destructive',
      });
    },
  });

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Fetch signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: { agentId: AGENT_ID },
      });

      if (error || !data?.signed_url) {
        throw new Error(data?.error || error?.message || 'Failed to get voice token');
      }

      // Request microphone
      await navigator.mediaDevices.getUserMedia({ audio: true });

      await conversation.startSession({ signedUrl: data.signed_url });
    } catch (err) {
      setIsConnecting(false);
      console.error('Failed to start voice assistant:', err);
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast({
        title: 'Connection Error',
        description: msg.includes('Permission') ? 'Microphone access required.' : msg,
        variant: 'destructive',
      });
    }
  }, [conversation, toast]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Failed to end conversation:', err);
    }
  }, [conversation]);

  // Mute/unmute on voice toggle change
  useEffect(() => {
    if (isConnected && prevVoiceRef.current !== features.voiceResponses) {
      prevVoiceRef.current = features.voiceResponses;
      try {
        conversation.setVolume({ volume: features.voiceResponses ? 1 : 0 });
      } catch (e) {
        console.error('Volume update failed:', e);
      }
    }
  }, [features.voiceResponses, isConnected, conversation]);

  return {
    messages,
    isConnected,
    isConnecting,
    isSpeaking: conversation.isSpeaking,
    status: conversation.status,
    startConversation,
    endConversation,
  };
};
