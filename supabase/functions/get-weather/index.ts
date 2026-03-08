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
    const { city } = await req.json();
    if (!city) {
      return new Response(JSON.stringify({ error: "city is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
    if (!OPENWEATHER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Weather API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.message || "Failed to fetch weather" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = {
      city: data.name,
      country: data.sys?.country,
      temperature: data.main?.temp,
      feels_like: data.main?.feels_like,
      humidity: data.main?.humidity,
      description: data.weather?.[0]?.description,
      wind_speed: data.wind?.speed,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("get-weather error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
