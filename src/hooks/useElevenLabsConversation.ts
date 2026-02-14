
import { useConversation } from '@11labs/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'ai';
  isProcessing?: boolean;
}

export const useElevenLabsConversation = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: '1',
      text: 'Good evening. JARVIS is online and ready for your commands.',
      timestamp: new Date(),
      type: 'ai'
    }
  ]);
  
  const [isConnected, setIsConnected] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { processVoiceCommand, features } = useFeatureToggle();

  // Refs to always read latest state inside closures
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const prevVoiceRef = useRef(features.voiceResponses);

  const conversation = useConversation({
    clientTools: {
      enableHandTracking: () => {
        const current = featuresRef.current;
        if (current.handTracking) {
          console.log('🛠️ Client tool: hand tracking already enabled');
          return 'Hand tracking is already enabled.';
        }
        console.log('🛠️ Client tool: enabling hand tracking');
        processVoiceCommand('start hand tracking');
        return 'Hand tracking enabled.';
      },
      disableHandTracking: () => {
        const current = featuresRef.current;
        if (!current.handTracking) {
          console.log('🛠️ Client tool: hand tracking already disabled');
          return 'Hand tracking is already disabled.';
        }
        console.log('🛠️ Client tool: disabling hand tracking');
        processVoiceCommand('stop hand tracking');
        return 'Hand tracking disabled.';
      },
      enableVoice: () => {
        const current = featuresRef.current;
        if (current.voiceResponses) {
          console.log('🛠️ Client tool: voice already enabled');
          return 'Voice responses are already enabled.';
        }
        console.log('🛠️ Client tool: enabling voice');
        processVoiceCommand('start talking');
        return 'Voice responses enabled.';
      },
      disableVoice: () => {
        const current = featuresRef.current;
        if (!current.voiceResponses) {
          console.log('🛠️ Client tool: voice already disabled');
          return 'Voice responses are already disabled.';
        }
        console.log('🛠️ Client tool: disabling voice');
        processVoiceCommand('stop talking');
        return 'Voice responses disabled.';
      },
    },
    onConnect: () => {
      console.log('ElevenLabs conversation connected');
      setIsConnected(true);
      toast({
        title: "JARVIS Connected",
        description: "Voice conversation is now active",
      });
    },
    onDisconnect: () => {
      console.log('ElevenLabs conversation disconnected');
      setIsConnected(false);
      setConversationId(null);
    },
    onMessage: (message) => {
      console.log('Message received:', message);
      
      if (message && typeof message === 'object') {
        let messageText = '';
        let messageType: 'user' | 'ai' = 'ai';
        
        if ('message' in message && typeof message.message === 'string') {
          messageText = message.message;
        } else if ('text' in message && typeof message.text === 'string') {
          messageText = message.text;
        } else if (typeof message === 'string') {
          messageText = message;
        }
        
        if ('source' in message) {
          messageType = message.source === 'user' ? 'user' : 'ai';
        }
        
        if (messageText.trim()) {
          // Regex fallback for command detection on user transcripts
          if (messageType === 'user') {
            const wasCommand = processVoiceCommand(messageText);
            if (wasCommand) {
              console.log(`🎤 Voice command (regex fallback): "${messageText}"`);
            }
          }

          const newMessage: ConversationMessage = {
            id: Date.now().toString(),
            text: messageText,
            timestamp: new Date(),
            type: messageType
          };
          
          setMessages(prev => [...prev, newMessage]);
        }
      }
    },
    onError: (error: unknown) => {
      console.error('ElevenLabs conversation error:', error);
      let errorMessage = 'Failed to maintain conversation';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        errorMessage = (error as any).message;
      }
      
      toast({
        title: "Conversation Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get signed URL from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-conversation-token', {
        body: { agentId: 'agent_0401k3w8fx86e22sdaw6j6va5dd7' }
      });

      if (error || !data?.signed_url) {
        throw new Error(error?.message || 'Failed to get conversation token');
      }

      const id = await conversation.startSession({
        signedUrl: data.signed_url
      });
      
      setConversationId(id);
      console.log('Conversation started with ID:', id);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to start conversation. Please try again.",
        variant: "destructive"
      });
    }
  }, [conversation, toast]);

  const endConversation = useCallback(async () => {
    try {
      await conversation.endSession();
      setConversationId(null);
      console.log('Conversation ended');
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
  }, [conversation]);

  // Mute/unmute voice output only on actual toggle changes
  useEffect(() => {
    if (isConnected && prevVoiceRef.current !== features.voiceResponses) {
      prevVoiceRef.current = features.voiceResponses;
      try {
        conversation.setVolume({ volume: features.voiceResponses ? 1 : 0 });
      } catch (e) {
        console.error('Failed to update volume for voice toggle:', e);
      }
    }
  }, [features.voiceResponses, isConnected, conversation]);

  const setVolume = useCallback(async (volume: number) => {
    if (!features.voiceResponses) return; // Don't override mute
    try {
      await conversation.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, [conversation, features.voiceResponses]);

  return {
    messages,
    isConnected,
    conversationId,
    isSpeaking: conversation.isSpeaking,
    status: conversation.status,
    startConversation,
    endConversation,
    setVolume
  };
};
