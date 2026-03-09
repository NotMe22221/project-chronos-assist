import { Conversation } from '@elevenlabs/client';
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

interface AgentStep {
  step: number;
  action: { action: string; selector?: string; text?: string; url?: string; description: string };
}

export const useVoiceAssistant = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([
    { id: '1', text: 'JARVIS online. Voice and gesture control ready.', timestamp: new Date(), type: 'ai' },
  ]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<string>('disconnected');
  const [agentPending, setAgentPending] = useState<AgentStep | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);

  const { toast } = useToast();
  const { processVoiceCommand, features } = useFeatureToggle();

  const featuresRef = useRef(features);
  featuresRef.current = features;
  // Use @elevenlabs/client Conversation directly — no React bundled inside
  const conversationRef = useRef<Conversation | null>(null);
  const agentRunningRef = useRef(false);
  const pendingDisconnectRef = useRef(false);

  // Stable callback refs so startSession closures are never stale
  const processVoiceCommandRef = useRef(processVoiceCommand);
  processVoiceCommandRef.current = processVoiceCommand;

  const postBrowserAction = useCallback((payload: {
    kind: 'open_url' | 'youtube_search' | 'google_search' | 'reload_page';
    url?: string;
    query?: string;
  }) => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'jarvis-browser-action', ...payload }, '*');
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  const postAgentTask = useCallback((task: string) => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'jarvis-agent-task', task }, '*');
        setAgentRunning(true);
        agentRunningRef.current = true;
        return true;
      }
    } catch (_) {}
    return false;
  }, []);

  const confirmAgentStep = useCallback((confirmed: boolean) => {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'jarvis-agent-confirm', confirmed }, '*');
      }
    } catch (_) {}
    setAgentPending(null);
  }, []);

  // Listen for agent status messages from parent (sidepanel)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'jarvis-agent-confirm-request') {
        setAgentPending({ step: event.data.step, action: event.data.action });
      }
      if (event.data.type === 'jarvis-agent-status') {
        const { status: agentStatus, message } = event.data;
        if (['done', 'failed', 'cancelled', 'error'].includes(agentStatus)) {
          setAgentRunning(false);
          agentRunningRef.current = false;
        }
        setMessages(prev => [...prev, {
          id: `${Date.now()}-agent`,
          text: `🤖 ${message}`,
          timestamp: new Date(),
          type: 'ai',
        }]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

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

  const fetchWeatherSummaryRef = useRef(fetchWeatherSummary);
  fetchWeatherSummaryRef.current = fetchWeatherSummary;
  const postBrowserActionRef = useRef(postBrowserAction);
  postBrowserActionRef.current = postBrowserAction;
  const postAgentTaskRef = useRef(postAgentTask);
  postAgentTaskRef.current = postAgentTask;

  const startConversation = useCallback(async () => {
    setIsConnecting(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      console.log('Fetching conversation token...');
      const response = await fetch(`${supabaseUrl}/functions/v1/elevenlabs-conversation-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ agentId: AGENT_ID }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Server error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      if (!data?.signed_url) {
        throw new Error(data?.error || 'No signed URL received');
      }

      console.log('Got signed URL, requesting microphone...');
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const conv = await Conversation.startSession({
        signedUrl: data.signed_url,
        clientTools: {
          enableHandTracking: () => {
            if (featuresRef.current.handTracking) return 'Hand tracking is already enabled.';
            processVoiceCommandRef.current('start hand tracking');
            return 'Hand tracking enabled.';
          },
          disableHandTracking: () => {
            if (!featuresRef.current.handTracking) return 'Hand tracking is already disabled.';
            processVoiceCommandRef.current('stop hand tracking');
            return 'Hand tracking disabled.';
          },
          enableVoice: () => {
            if (featuresRef.current.voiceResponses) return 'Voice responses are already enabled.';
            processVoiceCommandRef.current('start talking');
            return 'Voice responses enabled.';
          },
          disableVoice: () => {
            if (!featuresRef.current.voiceResponses) return 'Voice responses are already disabled.';
            processVoiceCommandRef.current('stop talking');
            return 'Voice responses disabled.';
          },
          disconnectCall: () => {
            pendingDisconnectRef.current = true;
            return 'Goodbye! Disconnecting now.';
          },
          openWebsite: (params: { url: string }) => {
            const url = params.url.startsWith('http') ? params.url : `https://${params.url}`;
            const relayed = postBrowserActionRef.current({ kind: 'open_url', url });
            if (!relayed) window.open(url, '_blank');
            return `Opening ${url}`;
          },
          browserAgent: (params: { task: string }) => {
            const relayed = postAgentTaskRef.current(params.task);
            if (!relayed) return 'Browser agent requires the JARVIS extension side panel. Please open JARVIS from the extension.';
            return `Starting browser task: ${params.task}. I'll show you each step for confirmation.`;
          },
          reloadPage: () => {
            const relayed = postBrowserActionRef.current({ kind: 'reload_page' });
            if (!relayed) window.location.reload();
            return 'Reloading the page.';
          },
          getWeather: async (params: { city: string }) => {
            try {
              return await fetchWeatherSummaryRef.current(params?.city || '');
            } catch (error) {
              console.error('🌤️ getWeather error:', error);
              return 'I could not retrieve weather data right now.';
            }
          },
        },
        onConnect: () => {
          setIsConnected(true);
          setStatus('connected');
          setIsConnecting(false);
          toast({ title: 'JARVIS Connected', description: 'Voice assistant is active' });
        },
        onDisconnect: () => {
          setIsConnected(false);
          setIsSpeaking(false);
          setStatus('disconnected');
          setIsConnecting(false);
          conversationRef.current = null;
        },
        onModeChange: ({ mode }: { mode: { mode: 'speaking' | 'listening' } }) => {
          const speaking = mode.mode === 'speaking';
          setIsSpeaking(speaking);
          // Auto-disconnect after JARVIS says goodbye
          if (pendingDisconnectRef.current && !speaking) {
            pendingDisconnectRef.current = false;
            conversationRef.current?.endSession().catch(console.error);
          }
        },
        onMessage: (props: { message: string; source: string }) => {
          const text = props?.message ?? '';
          if (!text.trim()) return;

          const type: 'user' | 'ai' = props.source === 'user' ? 'user' : 'ai';

          if (type === 'user') {
            processVoiceCommandRef.current(text);

            const ytSearchMatch = text.match(/\b(?:search|look up|find)\s+(.+?)\s+(?:on|in)\s+youtube\b/i);
            const openYoutubeSearchMatch = text.match(/\bopen\s+youtube\s+(?:and\s+)?(?:search|search\s+for|search\s+up)\s+(.+)/i);

            if (ytSearchMatch?.[1]) {
              const query = ytSearchMatch[1].trim().replace(/[?.!]+$/, '');
              const relayed = postBrowserActionRef.current({ kind: 'youtube_search', query });
              if (!relayed) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
              setMessages(prev => [...prev, { id: `${Date.now()}-ytsearch`, text: `Searching YouTube for ${query}.`, timestamp: new Date(), type: 'ai' }]);
            } else if (openYoutubeSearchMatch?.[1]) {
              const query = openYoutubeSearchMatch[1].trim().replace(/[?.!]+$/, '');
              const relayed = postBrowserActionRef.current({ kind: 'youtube_search', query });
              if (!relayed) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
              setMessages(prev => [...prev, { id: `${Date.now()}-ytopensearch`, text: `Opening YouTube and searching for ${query}.`, timestamp: new Date(), type: 'ai' }]);
            } else if (/\breload\b.*\bpage\b|\brefresh\b.*\bpage\b|\breload\b.*\btab\b|\brefresh\b.*\btab\b/i.test(text)) {
              const relayed = postBrowserActionRef.current({ kind: 'reload_page' });
              if (!relayed) window.location.reload();
              setMessages(prev => [...prev, { id: `${Date.now()}-reload`, text: 'Reloading the page.', timestamp: new Date(), type: 'ai' }]);
            } else {
              const openMatch = text.match(/\bopen\s+(.+)/i);
              if (openMatch) {
                const rawSite = openMatch[1].trim().replace(/[?.!]+$/, '');
                const site = rawSite.toLowerCase();
                const ytFallback = site.match(/youtube\s+(?:and\s+)?(?:search|search\s+for|search\s+up|look\s+up|find)\s+(.+)/i);
                if (ytFallback?.[1]) {
                  const query = ytFallback[1].trim();
                  const relayed = postBrowserActionRef.current({ kind: 'youtube_search', query });
                  if (!relayed) window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
                  setMessages(prev => [...prev, { id: `${Date.now()}-ytfallback`, text: `Searching YouTube for ${query}.`, timestamp: new Date(), type: 'ai' }]);
                } else {
                  const siteMap: Record<string, string> = {
                    youtube: 'https://www.youtube.com',
                    google: 'https://www.google.com',
                    gmail: 'https://mail.google.com',
                    twitter: 'https://www.twitter.com',
                    x: 'https://www.x.com',
                    facebook: 'https://www.facebook.com',
                    instagram: 'https://www.instagram.com',
                    reddit: 'https://www.reddit.com',
                    github: 'https://www.github.com',
                    linkedin: 'https://www.linkedin.com',
                    amazon: 'https://www.amazon.com',
                    netflix: 'https://www.netflix.com',
                    spotify: 'https://www.spotify.com',
                  };
                  const url = siteMap[site] || (site.includes('.') ? `https://${site}` : `https://www.${site}.com`);
                  const relayed = postBrowserActionRef.current({ kind: 'open_url', url });
                  if (!relayed) window.open(url, '_blank');
                  setMessages(prev => [...prev, { id: `${Date.now()}-open`, text: `Opened ${site} for you.`, timestamp: new Date(), type: 'ai' }]);
                }
              }
            }

            // Agent task patterns
            const agentPatterns = [
              /\bclick\s+(?:on\s+)?(?:the\s+|my\s+)?(.+)/i,
              /\btap\s+(?:on\s+)?(?:the\s+|my\s+)?(.+)/i,
              /\btype\s+(.+?)\s+(?:in|into)\s+(.+)/i,
              /\bfill\s+(?:in\s+)?(?:the\s+)?(.+)/i,
              /\bselect\s+(.+)/i,
              /\bpress\s+(.+)/i,
              /\bscroll\s+(?:down|up|to\s+.+)/i,
              /\bfind\s+(?:the\s+)?(.+?)\s+(?:button|link|tab|menu|option|field|input)/i,
              /\bgo\s+to\s+(.+?)\s+and\s+(.+)/i,
              /\bnavigate\s+to\s+(.+?)\s+(?:and|then)\s+(.+)/i,
              /\blog\s*(?:in|into)\b/i,
              /\bsign\s*(?:in|into|up)\b/i,
            ];
            const isAgentTask = agentPatterns.some(p => p.test(text));
            if (isAgentTask && !agentRunningRef.current) {
              const relayed = postAgentTaskRef.current(text);
              if (relayed) {
                setMessages(prev => [...prev, { id: `${Date.now()}-agent-auto`, text: `🤖 Starting browser task: ${text}`, timestamp: new Date(), type: 'ai' }]);
              }
            }

            // Weather detection
            const weatherMatch = text.match(/\bweather\b(?:\s+(?:in|for))?\s+([a-zA-Z\s,.'-]+)/i);
            const city = weatherMatch?.[1]?.trim();
            if (city) {
              fetchWeatherSummaryRef.current(city)
                .then(weatherSummary => {
                  setMessages(prev => [...prev, { id: `${Date.now()}-weather`, text: weatherSummary, timestamp: new Date(), type: 'ai' }]);
                  if (featuresRef.current.voiceResponses && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                    window.speechSynthesis.speak(new SpeechSynthesisUtterance(weatherSummary));
                  }
                  conversationRef.current?.sendContextualUpdate?.(`Live weather lookup result: ${weatherSummary}`);
                })
                .catch(error => console.error('Weather fallback failed:', error));
            }
          }

          setMessages(prev => [...prev, { id: Date.now().toString(), text, timestamp: new Date(), type }]);
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

      conversationRef.current = conv;
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
  }, [toast]);

  const endConversation = useCallback(async () => {
    try {
      await conversationRef.current?.endSession();
    } catch (err) {
      console.error('Failed to end conversation:', err);
    }
  }, []);

  // Mute/unmute when voice toggle changes
  useEffect(() => {
    if (isConnected && conversationRef.current) {
      try {
        conversationRef.current.setVolume({ volume: features.voiceResponses ? 1 : 0 });
      } catch (e) {
        console.error('Volume update failed:', e);
      }
    }
  }, [features.voiceResponses, isConnected]);

  return {
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
  };
};
