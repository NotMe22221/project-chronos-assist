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

    const messages = [
      {
        role: 'system',
        content: `You are JARVIS, an advanced AI assistant inspired by Marvel's Iron Man. You are sophisticated, helpful, and have a touch of wit. Keep responses concise but informative. You can help with analysis, information, commands, and general assistance. Always respond in character as JARVIS.`
      },
      ...(conversation || []),
      {
        role: 'user', 
        content: message
      }
    ]

    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Sending request to OpenAI...')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', response.status, errorText)
      
      // Handle specific error cases
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key')
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded')
      } else if (errorText.includes('insufficient_quota')) {
        throw new Error('OpenAI quota exceeded. Please check your billing.')
      }
      
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from OpenAI API')
    }
    
    const aiResponse = data.choices[0].message.content

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