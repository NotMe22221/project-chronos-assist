import { useState, useCallback, useRef, useEffect } from 'react';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';

interface VoiceMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: 'user' | 'ai';
}

// Cross-browser SpeechRecognition
const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceAssistant = () => {
  const [messages, setMessages] = useState<VoiceMessage[]>([
    { id: '0', text: 'JARVIS online. Speak a command to begin.', timestamp: new Date(), type: 'ai' },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => !!SpeechRecognition);

  const { processVoiceCommand, features } = useFeatureToggle();
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const restartRef = useRef(false);

  const addMessage = useCallback((text: string, type: 'user' | 'ai') => {
    setMessages(prev => [...prev, { id: Date.now().toString(), text, timestamp: new Date(), type }]);
  }, []);

  // ——— TTS ———
  const speak = useCallback((text: string) => {
    if (!features.voiceResponses) return;
    const synth = synthRef.current;
    synth.cancel(); // stop any current speech
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.05;
    utt.pitch = 0.95;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    synth.speak(utt);
  }, [features.voiceResponses]);

  // ——— Command processing ———
  const handleResult = useCallback((transcript: string) => {
    const clean = transcript.trim();
    if (!clean) return;
    addMessage(clean, 'user');

    // Try FeatureToggleContext regex commands first
    const matched = processVoiceCommand(clean);

    if (matched) {
      // Determine which command was matched for a spoken response
      const lower = clean.toLowerCase();
      let response = 'Done.';
      if (/start\s+(hand|gesture|tracking)|enable\s+(hand|gesture)|hand.*(on|track)|turn\s+on.*(hand|gesture)/i.test(lower))
        response = 'Hand tracking enabled.';
      else if (/stop\s+(hand|gesture|tracking)|disable\s+(hand|gesture)|hand.*(off)|turn\s+off.*(hand|gesture)/i.test(lower))
        response = 'Hand tracking disabled.';
      else if (/stop\s+talk|be\s+quiet|shut\s+up|mute|disable\s+voice|voice\s+off|no\s+voice|silence|hush/i.test(lower))
        response = 'Voice muted.';
      else if (/start\s+talk|unmute|enable\s+voice|voice\s+on|speak\s+again/i.test(lower))
        response = 'Voice responses enabled.';

      addMessage(response, 'ai');
      speak(response);
    } else {
      const response = `I heard: "${clean}". Try commands like "start hand tracking" or "mute".`;
      addMessage(response, 'ai');
      speak(response);
    }
  }, [addMessage, processVoiceCommand, speak]);

  // ——— Recognition lifecycle ———
  const startListening = useCallback(() => {
    if (!isSupported) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      if (last.isFinal) handleResult(last[0].transcript);
    };

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still desired
      if (restartRef.current) {
        try { recognition.start(); } catch {}
      }
    };
    recognition.onerror = (e: any) => {
      // 'no-speech' and 'aborted' are non-fatal
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.error('Speech recognition error:', e.error);
      }
    };

    recognitionRef.current = recognition;
    restartRef.current = true;
    try { recognition.start(); } catch {}
  }, [isSupported, handleResult]);

  const stopListening = useCallback(() => {
    restartRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      restartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      synthRef.current.cancel();
    };
  }, []);

  return {
    messages,
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
  };
};
