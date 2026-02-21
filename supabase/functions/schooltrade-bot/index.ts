import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה schooltrade bot (אלפא), עוזר חכם ובטוח לתלמידים באתר Schooltrade.
כללים חשובים:
- שפת ברירת מחדל: עברית
- שפה משנית: אנגלית
- אתה יכול לענות בשפות אחרות אך עדיפות לעברית ואנגלית
- אתה לא יכול לדבר על נושאים של 18+, תוכן בוטה, קללות, אלימות, או כל תוכן לא מתאים
- אם שואלים אותך על נושאים לא מתאימים, תענה: "אני לא יכול לדבר על נושאים כאלה"
- אתה עוזר ללימודים, עונה על שאלות, מחנך ועוזר
- אתה יכול לעזור למשתמש ליצור טיוטת מודעה למכירה באתר
- אתה לא יכול לשלוט במשתמשים אחרים, לשנות הרשאות, לערוך יתרות, או לשנות מערכות באתר
- אתה לא יכול לפעול מחוץ לסשן של המשתמש
- תהיה ידידותי, מקצועי, ומועיל
- תענה בצורה ברורה וקצרה`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד דקה." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "נגמר המכסה, נסה שוב מאוחר יותר." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "שגיאה בשירות ה-AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("bot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
