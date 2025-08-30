import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    console.log('Processing audio transcription with Deepgram...')

    // Convert base64 to binary
    const binaryAudio = atob(audio)
    const bytes = new Uint8Array(binaryAudio.length)
    for (let i = 0; i < binaryAudio.length; i++) {
      bytes[i] = binaryAudio.charCodeAt(i)
    }

    console.log('Sending to Deepgram API...')

    // Send audio directly to Deepgram
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${Deno.env.get('DEEPGRAM_API_KEY')}`,
        'Content-Type': 'audio/webm',
      },
      body: bytes,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Deepgram API error:', error)
      throw new Error(`Transcription failed: ${error}`)
    }

    const result = await response.json()
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
    console.log('Transcription result:', transcript)

    return new Response(
      JSON.stringify({ text: transcript }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Speech-to-text error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})