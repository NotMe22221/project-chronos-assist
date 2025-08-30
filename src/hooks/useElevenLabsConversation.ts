
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
      
      // Add message to conversation history
      if (message.type === 'agent_response' || message.type === 'user_transcript') {
        const newMessage: ConversationMessage = {
          id: Date.now().toString(),
          text: message.message || '',
          timestamp: new Date(),
          type: message.type === 'user_transcript' ? 'user' : 'ai'
        };
        
        setMessages(prev => [...prev, newMessage]);
      }
    },
    onError: (error) => {
      console.error('ElevenLabs conversation error:', error);
      toast({
        title: "Conversation Error",
        description: error.message || 'Failed to maintain conversation',
        variant: "destructive"
      });
    }
  });

  const startConversation = useCallback(async () => {
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start conversation with the specific agent ID
      const id = await conversation.startSession({
        agentId: 'agent_0401k3w8fx86e22sdaw6j6va5dd7'
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
