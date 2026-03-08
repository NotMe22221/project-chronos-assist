import { useConversation } from '@elevenlabs/react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useFeatureToggle } from '@/contexts/FeatureToggleContext';

const AGENT_ID = 'agent_8001kk72b77xe6stqpfd4gcvptz9';

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
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(false);
  const { toast } = useToast();
  const { processVoiceCommand, features } = useFeatureToggle();

  const featuresRef = useRef(features);
  featuresRef.current = features;
  const prevVoiceRef = useRef(features.voiceResponses);
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  const fetchWeatherSummary = useCallback(async (rawCity: string) => {
    const city = rawCity.trim().replace(/[?.!]+$/, '');
    if (!city) return 'Please provide a city name.';

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${supabaseUrl}/functions/v1/get-weather`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ city }),
    });

    const data = await response.json();
    if (!response.ok) {
      return data?.error ? `Weather lookup failed: ${data.error}` : 'Weather lookup failed.';
    }

    return `Current weather in ${data.city}, ${data.country}: ${Math.round(data.temperature)}°C, ${data.description}. Feels like ${Math.round(data.feels_like)}°C with ${data.humidity}% humidity and wind speed of ${data.wind_speed} m/s.`;
  }, []);

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
      disconnectCall: () => {
        setPendingDisconnect(true);
        return 'Goodbye! Disconnecting now.';
      },
      openWebsite: (params: { url: string }) => {
        const url = params.url.startsWith('http') ? params.url : `https://${params.url}`;
        window.open(url, '_blank');
        return `Opening ${url}`;
      },
      getWeather: async (params: { city: string }) => {
        try {
          return await fetchWeatherSummary(params?.city || '');
        } catch (error) {
          console.error('🌤️ getWeather error:', error);
          return 'I could not retrieve weather data right now.';
        }
      },
    },
    onConnect: () => {
      setIsConnecting(false);
      toast({ title: 'JARVIS Connected', description: 'Voice assistant is active' });
    },
    onDisconnect: () => {
      setIsConnecting(false);
    },
    onMessage: (message) => {
      if (!message || typeof message !== 'object') return;

      let text = '';
      let type: 'user' | 'ai' = 'ai';

      if ('message' in message && typeof (message as any).message === 'string') text = (message as any).message;
      else if ('text' in message && typeof (message as any).text === 'string') text = (message as any).text;

      if ('source' in message) type = (message as any).source === 'user' ? 'user' : 'ai';

      if (!text.trim()) return;

      if (type === 'user') {
        processVoiceCommand(text);

        const weatherMatch = text.match(/\bweather\b(?:\s+(?:in|for))?\s+([a-zA-Z\s,.'-]+)/i);
        const city = weatherMatch?.[1]?.trim();

        if (city) {
          fetchWeatherSummary(city)
            .then((weatherSummary) => {
              setMessages((prev) => [
                ...prev,
                { id: `${Date.now()}-weather`, text: weatherSummary, timestamp: new Date(), type: 'ai' },
              ]);

              if (featuresRef.current.voiceResponses && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(weatherSummary));
              }

              conversationRef.current?.sendContextualUpdate?.(`Live weather lookup result: ${weatherSummary}`);
            })
            .catch((error) => console.error('Weather fallback failed:', error));
        }
      }

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

  const isConnected = conversation.status === 'connected';

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      console.log('Fetching conversation token...');
      const response = await fetch(
        `${supabaseUrl}/functions/v1/elevenlabs-conversation-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ agentId: AGENT_ID }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Edge function error:', response.status, errorData);
        throw new Error(`Server error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      if (!data?.signed_url) {
        console.error('No signed_url in response:', data);
        throw new Error(data?.error || 'No signed URL received');
      }

      console.log('Got signed URL, requesting microphone...');
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

  // Auto-disconnect after agent says goodbye
  useEffect(() => {
    if (pendingDisconnect && !conversation.isSpeaking) {
      setPendingDisconnect(false);
      conversation.endSession().catch(console.error);
    }
  }, [pendingDisconnect, conversation]);

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
