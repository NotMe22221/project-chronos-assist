
import { useConversation } from '@11labs/react';
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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

  const conversation = useConversation({
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
      
      // Handle different message types based on the actual ElevenLabs API structure
      if (message && typeof message === 'object') {
        let messageText = '';
        let messageType: 'user' | 'ai' = 'ai';
        
        // Handle the message based on its structure
        if ('message' in message && typeof message.message === 'string') {
          messageText = message.message;
        } else if ('text' in message && typeof message.text === 'string') {
          messageText = message.text;
        } else if (typeof message === 'string') {
          messageText = message;
        }
        
        // Determine message type based on source
        if ('source' in message) {
          messageType = message.source === 'user' ? 'user' : 'ai';
        }
        
        // Only add non-empty messages
        if (messageText.trim()) {
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
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error);
      let errorMessage = 'Failed to maintain conversation';
      
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
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
      
      // Start conversation with the agent ID using the correct API format
      const id = await conversation.startSession({
        signedUrl: `https://api.elevenlabs.io/v1/convai/conversation?agent_id=agent_0401k3w8fx86e22sdaw6j6va5dd7`
      });
      
      setConversationId(id);
      console.log('Conversation started with ID:', id);
      
    } catch (error) {
      console.error('Failed to start conversation:', error);
      toast({
        title: "Microphone Error",
        description: "Failed to access microphone. Please check permissions.",
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

  const setVolume = useCallback(async (volume: number) => {
    try {
      await conversation.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
    } catch (error) {
      console.error('Failed to set volume:', error);
    }
  }, [conversation]);

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
