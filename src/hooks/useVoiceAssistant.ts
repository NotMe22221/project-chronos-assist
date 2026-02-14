import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';
import { supabase } from '@/integrations/supabase/client';

interface ConversationMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'ai';
}

export const useVoiceAssistant = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { id: '1', text: 'JARVIS online. Voice and gesture control ready.', timestamp: new Date(), type: 'ai' },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState('Ready');
  const { toast } = useToast();
  const { processVoiceCommand, features } = useFeatureToggle();

  const recognitionRef = useRef<any>(null);
  const featuresRef = useRef(features);
  featuresRef.current = features;

  const addMessage = useCallback((text: string, type: 'user' | 'ai') => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, timestamp: new Date(), type }]);
  }, []);

  const speak = useCallback((text: string) => {
    if (!featuresRef.current.voiceResponses) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const askJarvis = useCallback(async (userText: string) => {
    setStatus('Thinking...');
    try {
      const { data, error } = await supabase.functions.invoke('jarvis-chat', {
        body: { message: userText },
      });

      if (error) throw error;

      const reply = data?.reply || "I'm sorry, I couldn't process that.";
      addMessage(reply, 'ai');
      speak(reply);
    } catch (err) {
      console.error('Jarvis AI error:', err);
      const fallback = "I'm having trouble connecting to my systems. Please try again.";
      addMessage(fallback, 'ai');
      toast({ title: 'AI Error', description: 'Could not reach JARVIS AI.', variant: 'destructive' });
    } finally {
      setStatus(isConnected ? 'Listening' : 'Ready');
    }
  }, [addMessage, speak, toast, isConnected]);

  const handleResult = useCallback((event: SpeechRecognitionEvent) => {
    const last = event.results[event.results.length - 1];
    if (!last.isFinal) return;

    const transcript = last[0].transcript.trim();
    if (!transcript) return;

    addMessage(transcript, 'user');

    // Try local command first
    const wasCommand = processVoiceCommand(transcript);
    if (wasCommand) {
      addMessage('Command processed.', 'ai');
      speak('Done.');
    } else {
      askJarvis(transcript);
    }
  }, [addMessage, processVoiceCommand, askJarvis, speak]);

  const startConversation = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Not Supported', description: 'Speech recognition is not supported in this browser.', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setIsConnecting(false);
      toast({ title: 'Microphone Required', description: 'Please allow microphone access.', variant: 'destructive' });
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = handleResult;
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'not-allowed') {
        setIsConnected(false);
        setStatus('Ready');
        toast({ title: 'Mic Blocked', description: 'Microphone permission denied.', variant: 'destructive' });
      }
      // 'no-speech' and 'aborted' are normal — ignore
    };
    recognition.onend = () => {
      // Auto-restart if still connected
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch { /* already running */ }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsConnected(true);
    setIsConnecting(false);
    setStatus('Listening');
    toast({ title: 'JARVIS Active', description: 'Listening for your voice.' });
  }, [handleResult, toast]);

  const endConversation = useCallback(async () => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      r.stop();
    }
    window.speechSynthesis.cancel();
    setIsConnected(false);
    setIsSpeaking(false);
    setStatus('Ready');
  }, []);

  // Stop speaking when voice responses toggled off
  useEffect(() => {
    if (!features.voiceResponses) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [features.voiceResponses]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    messages,
    isConnected,
    isConnecting,
    isSpeaking,
    status,
    startConversation,
    endConversation,
  };
};
