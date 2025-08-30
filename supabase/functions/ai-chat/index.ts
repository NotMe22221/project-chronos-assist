
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, conversation } = await req.json()
    
    if (!message) {
      throw new Error('No message provided')
    }

    console.log('Processing AI chat request:', message)

    // Build conversation history for Cohere
    let conversationHistory = '';
    if (conversation && conversation.length > 0) {
      conversationHistory = conversation.map((msg: any) => 
        `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
      ).join('\n') + '\n';
    }

    const prompt = `You are JARVIS, an advanced AI assistant inspired by Marvel's Iron Man. You are sophisticated, helpful, and have a touch of wit. Keep responses concise but informative. You can help with analysis, information, commands, and general assistance. Always respond in character as JARVIS.

${conversationHistory}Human: ${message}
Assistant:`;

    const apiKey = Deno.env.get('COHERE_API_KEY')
    if (!apiKey) {
      throw new Error('Cohere API key not configured')
    }

    console.log('Sending request to Cohere...')

    const response = await fetch('https://api.cohere.ai/v1/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'command',
        prompt: prompt,
        max_tokens: 300,
        temperature: 0.7,
        stop_sequences: ['Human:', 'Assistant:'],
        return_likelihoods: 'NONE'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Cohere API error:', response.status, errorText)
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid Cohere API key')
      } else if (response.status === 429) {
        throw new Error('Cohere API rate limit exceeded')
      }
      
      throw new Error(`Cohere API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.generations || !data.generations[0] || !data.generations[0].text) {
      throw new Error('Invalid response from Cohere API')
    }
    
    const aiResponse = data.generations[0].text.trim()

    console.log('AI response received successfully')

    return new Response(JSON.stringify({ 
      response: aiResponse,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('AI chat error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process AI chat request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
