import { useState, useCallback, useRef } from 'react';
import { AudioRecorder, AudioPlayer } from '@/utils/AudioRecorder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'ai';
  isProcessing?: boolean;
}

export const useJarvisAI = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Good evening. JARVIS is online and ready for your commands.',
      timestamp: new Date(),
      type: 'ai'
    }
  ]);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');

  const audioRecorder = useRef<AudioRecorder>(new AudioRecorder());
  const audioPlayer = useRef<AudioPlayer>(new AudioPlayer());
  const { toast } = useToast();

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage = { ...message, id: Date.now().toString() };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  }, []);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      const base64Audio = await audioRecorder.current.blobToBase64(audioBlob);
      
      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;
      return data.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Failed to transcribe audio');
    }
  }, []);

  const sendToAI = useCallback(async (message: string, conversation: Message[] = []): Promise<string> => {
    try {
      const conversationHistory = conversation.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message,
          conversation: conversationHistory
        }
      });

      if (error) throw error;
      return data.response || 'I apologize, but I could not process that request.';
    } catch (error) {
      console.error('AI chat error:', error);
      throw new Error('Failed to get AI response');
    }
  }, []);

  const speakText = useCallback(async (text: string): Promise<void> => {
    try {
      setIsSpeaking(true);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'onyx' }
      });

      if (error) throw error;
      
      await audioPlayer.current.playBase64Audio(data.audioContent);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      throw new Error('Failed to speak text');
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      setIsListening(true);
      setTranscript('Listening...');
      await audioRecorder.current.startRecording();
    } catch (error) {
      console.error('Failed to start listening:', error);
      setIsListening(false);
      toast({
        title: "Microphone Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const stopListening = useCallback(async () => {
    if (!isListening) return;

    try {
      setIsListening(false);
      const audioBlob = await audioRecorder.current.stopRecording();
      
      setIsProcessing(true);
      setTranscript('Processing...');
      
      // Transcribe audio
      const transcribedText = await transcribeAudio(audioBlob);
      
      if (!transcribedText.trim()) {
        setTranscript('No speech detected');
        setIsProcessing(false);
        return;
      }

      setTranscript(transcribedText);
      
      // Add user message
      const userMessageId = addMessage({
        text: transcribedText,
        timestamp: new Date(),
        type: 'user'
      });

      // Add processing message
      const aiMessageId = addMessage({
        text: 'Processing your request...',
        timestamp: new Date(),
        type: 'ai',
        isProcessing: true
      });

      // Get AI response
      const aiResponse = await sendToAI(transcribedText, messages);
      
      // Update AI message with response
      updateMessage(aiMessageId, {
        text: aiResponse,
        isProcessing: false
      });

      // Speak the response
      await speakText(aiResponse);

    } catch (error) {
      console.error('Error processing voice command:', error);
      toast({
        title: "Processing Error",
        description: error instanceof Error ? error.message : 'Failed to process voice command',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  }, [isListening, transcribeAudio, addMessage, updateMessage, sendToAI, speakText, messages, toast]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      // Add user message
      addMessage({
        text: text,
        timestamp: new Date(),
        type: 'user'
      });

      setIsProcessing(true);

      // Add processing message
      const aiMessageId = addMessage({
        text: 'Processing your request...',
        timestamp: new Date(),
        type: 'ai',
        isProcessing: true
      });

      // Get AI response
      const aiResponse = await sendToAI(text, messages);
      
      // Update AI message with response
      updateMessage(aiMessageId, {
        text: aiResponse,
        isProcessing: false
      });

      // Speak the response
      await speakText(aiResponse);

    } catch (error) {
      console.error('Error sending text message:', error);
      toast({
        title: "Message Error",
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [addMessage, updateMessage, sendToAI, speakText, messages, toast]);

  const stopSpeaking = useCallback(() => {
    audioPlayer.current.stopAudio();
    setIsSpeaking(false);
  }, []);

  return {
    messages,
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    startListening,
    stopListening,
    sendTextMessage,
    stopSpeaking
  };
};