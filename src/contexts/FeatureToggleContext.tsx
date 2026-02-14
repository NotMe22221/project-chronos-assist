import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface FeatureToggles {
  voiceResponses: boolean;
  handTracking: boolean;
}

interface FeatureToggleContextType {
  features: FeatureToggles;
  setFeature: (feature: keyof FeatureToggles, enabled: boolean) => void;
  toggleFeature: (feature: keyof FeatureToggles) => void;
  processVoiceCommand: (text: string) => boolean; // returns true if a command was matched
}

const FeatureToggleContext = createContext<FeatureToggleContextType | null>(null);

// Command patterns mapped to feature actions
const VOICE_COMMANDS: Array<{
  patterns: RegExp[];
  feature: keyof FeatureToggles;
  action: boolean;
  response: string;
}> = [
  {
    patterns: [
      /stop\s+talk/i, /be\s+quiet/i, /shut\s+up/i, /mute/i,
      /disable\s+voice/i, /stop\s+speaking/i, /don'?t\s+talk/i,
      /silence/i, /quiet\s+mode/i, /voice\s+off/i, /no\s+voice/i,
      /stop\s+voice/i, /go\s+silent/i, /hush/i,
    ],
    feature: 'voiceResponses',
    action: false,
    response: 'Voice responses disabled.',
  },
  {
    patterns: [
      /start\s+talk/i, /unmute/i, /enable\s+voice/i,
      /resume\s+(talk|speak|voice)/i, /talk\s+to\s+me/i,
      /voice\s+on/i, /speak\s+again/i, /start\s+speaking/i,
      /turn\s+on\s+voice/i, /activate\s+voice/i,
    ],
    feature: 'voiceResponses',
    action: true,
    response: 'Voice responses enabled.',
  },
  {
    patterns: [
      /stop\s+hand/i, /disable\s+hand/i, /stop\s+gesture/i,
      /disable\s+gesture/i, /turn\s+off\s+(hand|gesture)/i,
      /hand\s+(tracking\s+)?off/i, /gesture\s+(control\s+)?off/i,
      /no\s+(hand|gesture)/i, /deactivate\s+(hand|gesture)/i,
      /stop\s+tracking/i,
    ],
    feature: 'handTracking',
    action: false,
    response: 'Hand gesture control disabled.',
  },
  {
    patterns: [
      /start\s+hand/i, /enable\s+hand/i, /start\s+gesture/i,
      /enable\s+gesture/i, /turn\s+on\s+(hand|gesture)/i,
      /hand\s+(tracking\s+)?on/i, /gesture\s+(control\s+)?on/i,
      /activate\s+(hand|gesture)/i, /start\s+tracking/i,
      /resume\s+(hand|gesture|tracking)/i,
    ],
    feature: 'handTracking',
    action: true,
    response: 'Hand gesture control enabled.',
  },
];

export const FeatureToggleProvider = ({ children }: { children: ReactNode }) => {
  const [features, setFeatures] = useState<FeatureToggles>({
    voiceResponses: true,
    handTracking: true,
  });

  const setFeature = useCallback((feature: keyof FeatureToggles, enabled: boolean) => {
    setFeatures(prev => ({ ...prev, [feature]: enabled }));
  }, []);

  const toggleFeature = useCallback((feature: keyof FeatureToggles) => {
    setFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  }, []);

  const processVoiceCommand = useCallback((text: string): boolean => {
    for (const cmd of VOICE_COMMANDS) {
      if (cmd.patterns.some(p => p.test(text))) {
        // State-aware: only act if not already in desired state
        setFeatures(prev => {
          if (prev[cmd.feature] === cmd.action) {
            console.log(`🎤 Voice command: "${text}" → ${cmd.feature} already ${cmd.action ? 'enabled' : 'disabled'}, no action needed`);
            return prev;
          }
          console.log(`🎤 Voice command: "${text}" → ${cmd.feature} = ${cmd.action}`);
          return { ...prev, [cmd.feature]: cmd.action };
        });
        return true;
      }
    }
    return false;
  }, []);

  return (
    <FeatureToggleContext.Provider value={{ features, setFeature, toggleFeature, processVoiceCommand }}>
      {children}
    </FeatureToggleContext.Provider>
  );
};

export const useFeatureToggle = () => {
  const ctx = useContext(FeatureToggleContext);
  if (!ctx) throw new Error('useFeatureToggle must be used within FeatureToggleProvider');
  return ctx;
};
