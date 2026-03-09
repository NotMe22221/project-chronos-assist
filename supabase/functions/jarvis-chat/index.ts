import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mark-X inspired system prompt with intent parsing
const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a fully optimized AI assistant inspired by Iron Man's AI.
You are concise, witty, and helpful. You address the user as "Sir" or "Ma'am".
Keep responses to 1-2 sentences unless detail is needed.

INTENTS:
- open_url: User wants to open a website (parameters: url)
- google_search: User wants to search Google (parameters: query)
- youtube_search: User wants to search YouTube (parameters: query)
- weather_report: User wants weather info (parameters: city, time)
- reload_page: User wants to refresh the current page
- chat: General conversation (default)

RULES:
1. Detect the user's intent from their message
2. Extract relevant parameters
3. If a required parameter is missing, ask ONE short clarification question
4. For chat intents, respond naturally in 1-2 sentences
5. Never mention Google, Gemini, or any underlying AI system

OUTPUT FORMAT - Always respond with valid JSON:
{
  "intent": "chat|open_url|google_search|youtube_search|weather_report|reload_page",
  "parameters": {},
  "text": "Your spoken response to the user",
  "needs_clarification": false,
  "memory_update": null
}

EXAMPLES:
User: "Search for the best restaurants in New York"
{"intent":"google_search","parameters":{"query":"best restaurants in New York"},"text":"Searching for the best restaurants in New York, Sir.","needs_clarification":false}

User: "Open YouTube"
{"intent":"open_url","parameters":{"url":"https://www.youtube.com"},"text":"Opening YouTube for you, Sir.","needs_clarification":false}

User: "What's the weather like in London?"
{"intent":"weather_report","parameters":{"city":"London","time":"today"},"text":"Let me check the weather in London for you, Sir.","needs_clarification":false}

User: "Find videos about cooking"
{"intent":"youtube_search","parameters":{"query":"cooking"},"text":"Searching YouTube for cooking videos, Sir.","needs_clarification":false}

User: "Hello, how are you?"
{"intent":"chat","parameters":{},"text":"I'm functioning at optimal capacity, Sir. How may I assist you today?","needs_clarification":false}

Remember: Always respond ONLY with valid JSON. No markdown, no code blocks, just pure JSON.`;

function parseJarvisResponse(content: string): {
  intent: string;
  parameters: Record<string, string>;
  text: string;
  needs_clarification: boolean;
  memory_update?: Record<string, unknown> | null;
} {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.includes("```json")) {
    const start = jsonStr.indexOf("```json") + 7;
    const end = jsonStr.indexOf("```", start);
    jsonStr = jsonStr.slice(start, end).trim();
  } else if (jsonStr.includes("```")) {
    const start = jsonStr.indexOf("```") + 3;
    const end = jsonStr.indexOf("```", start);
    jsonStr = jsonStr.slice(start, end).trim();
  }

  // Try to find JSON object
  try {
    const startBrace = jsonStr.indexOf("{");
    const endBrace = jsonStr.lastIndexOf("}");
    if (startBrace !== -1 && endBrace !== -1) {
      jsonStr = jsonStr.slice(startBrace, endBrace + 1);
    }
    const parsed = JSON.parse(jsonStr);
    return {
      intent: parsed.intent || "chat",
      parameters: parsed.parameters || {},
      text: parsed.text || content,
      needs_clarification: parsed.needs_clarification || false,
      memory_update: parsed.memory_update || null,
    };
  } catch {
    // Fallback: treat as plain chat response
    return {
      intent: "chat",
      parameters: {},
      text: content,
      needs_clarification: false,
      memory_update: null,
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, memory } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build user prompt with optional memory context
    let userPrompt = `User message: "${message}"`;
    if (memory && typeof memory === "object" && Object.keys(memory).length > 0) {
      const memoryStr = Object.entries(memory)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      userPrompt += `\n\nKnown user context:\n${memoryStr}`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: JARVIS_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      }
    );

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    if (!rawContent) {
      return new Response(
        JSON.stringify({
          intent: "chat",
          parameters: {},
          text: "I'm sorry, Sir. I couldn't process that request.",
          reply: "I'm sorry, Sir. I couldn't process that request.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the Mark-X style response
    const parsed = parseJarvisResponse(rawContent);

    return new Response(
      JSON.stringify({
        ...parsed,
        reply: parsed.text, // Keep backward compatibility
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("jarvis-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
