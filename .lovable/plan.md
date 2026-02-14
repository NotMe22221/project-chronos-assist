

# Fix Voice Assistant with Lovable AI (Gemini)

## Problem
The ElevenLabs voice assistant is failing with "Failed to fetch" errors when trying to connect to the edge function. The edge function appears to not be reachable or deployed correctly.

## Solution
Replace ElevenLabs entirely with a combination of:
- **Browser Web Speech API** for speech recognition (listening) and text-to-speech (speaking) -- free, no API keys needed
- **Lovable AI (Gemini)** for intelligent responses via the AI gateway -- already available in your project

This eliminates the ElevenLabs dependency and connection issues while giving JARVIS a real AI brain.

## Changes

### 1. Remove ElevenLabs
- Delete `supabase/functions/elevenlabs-conversation-token/index.ts`
- Remove `@11labs/react` and `@elevenlabs/client` from dependencies
- Remove the function entry from `supabase/config.toml`

### 2. Create Lovable AI Edge Function
- New `supabase/functions/jarvis-chat/index.ts` that calls the Lovable AI gateway (`google/gemini-3-flash-preview`)
- System prompt tailored for JARVIS: concise, helpful, action-oriented responses
- Handles rate limits (429) and payment errors (402)

### 3. Rewrite Voice Assistant Hook
- `src/hooks/useVoiceAssistant.ts` -- completely fresh implementation:
  - **Web Speech API** (`SpeechRecognition`) for continuous listening
  - **Web Speech API** (`speechSynthesis`) for TTS responses
  - Built-in command detection for hand tracking / mute / unmute (using existing `FeatureToggleContext`)
  - For non-command speech, sends to Lovable AI for an intelligent response
  - JARVIS speaks the AI response back

### 4. Update Voice Assistant Component
- `src/components/VoiceAssistant.tsx` -- update to use the new hook API (microphone button instead of phone button, same message log and status indicators)

### 5. Update Index Page
- Update subtitle text to remove "ElevenLabs" reference

## Technical Details

- The Web Speech API is supported in all modern browsers (Chrome, Edge, Safari)
- Speech recognition runs continuously while active, with automatic restart on end
- TTS is non-blocking and won't interfere with hand tracking
- Lovable AI calls go through `supabase/functions/v1/jarvis-chat` using the auto-provisioned `LOVABLE_API_KEY`
- Feature toggle commands are processed locally (no AI call needed), AI is only used for general conversation

