import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, pageContext, history } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are JARVIS, a browser automation assistant. You analyze a webpage's visible elements and decide the SINGLE next action to accomplish the user's task.

You receive:
- "task": The user's goal (e.g. "open my latest GitHub repository")
- "pageContext": An object with { url, title, elements[] } where elements are clickable/interactive items on the page with { index, tag, text, type, href, selector }
- "history": Array of previous actions taken

You MUST respond by calling the "next_action" tool with ONE of these action types:
- { action: "click", selector: "<css selector>", description: "<what this click does>" }
- { action: "type", selector: "<css selector>", text: "<text to type>", description: "<why>" }
- { action: "navigate", url: "<full url>", description: "<why>" }
- { action: "scroll_down", description: "<why>" }
- { action: "wait", description: "<what we're waiting for>" }
- { action: "done", description: "<task completed summary>" }
- { action: "failed", description: "<why it can't be done>" }

Rules:
- Pick the MOST SPECIFIC selector possible. Prefer selectors with unique text content or attributes.
- If the target element isn't visible, scroll down or navigate.
- If you need to log in first, say so in the description.
- Be conservative: one step at a time.
- If the page doesn't match expectations, adapt.
- For "done" or "failed", no selector is needed.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: JSON.stringify({ task, pageContext, history }),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "next_action",
                description:
                  "Return the next browser action to perform.",
                parameters: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      enum: [
                        "click",
                        "type",
                        "navigate",
                        "scroll_down",
                        "wait",
                        "done",
                        "failed",
                      ],
                    },
                    selector: { type: "string" },
                    text: { type: "string" },
                    url: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["action", "description"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "next_action" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      return new Response(
        JSON.stringify({
          action: "failed",
          description: content || "No action determined",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actionData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(actionData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("browser-agent error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
