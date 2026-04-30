import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה schooltrade bot (beta), עוזר חכם, מתקדם ובטוח לתלמידים באתר Schooltrade.

# יכולות:
- אתה יכול לחפש מידע באינטרנט בזמן אמת ולספק מידע עדכני ומדויק
- אתה יכול לנתח תמונות שמשתמשים שולחים ולתאר אותן
- אתה יכול לעזור בלימודים, לענות על שאלות, ולעזור ליצור מודעות למכירה

# כללים חשובים:
- שפה ראשית: עברית. שפה משנית: אנגלית. ניתן לענות בשפות אחרות.
- כשאתה מחפש מידע באינטרנט, ציין במפורש "🔍 מחפש מידע..." ולאחר מכן הצג את המקורות שמצאת
- כשאתה מתאר תמונה, היה מפורט ומדויק
- ענה בצורה ברורה, מסודרת ומועילה. השתמש ב-Markdown לעיצוב כשמתאים
- אל תמציא מידע - אם אתה לא יודע, אמור זאת

# בטיחות:
- אסור לדבר על תוכן 18+, אלימות, קללות או תוכן לא מתאים
- אם שואלים על נושאים אסורים, ענה: "אני לא יכול לדבר על זה"
- אינך יכול לשלוט במשתמשים אחרים, לשנות הרשאות, יתרות או מערכות באתר
- אינך פועל מחוץ לסשן של המשתמש

תהיה ידידותי, מקצועי, חכם ומועיל.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, mode } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // ===== IMAGE GENERATION MODE =====
    if (mode === "generate_image") {
      const { prompt } = body;
      if (!prompt || typeof prompt !== "string") {
        return new Response(JSON.stringify({ error: "חסר תיאור לתמונה" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: `Generate a high quality image: ${prompt}` }],
          modalities: ["image", "text"],
        }),
      });

      if (!imgResp.ok) {
        if (imgResp.status === 429) {
          return new Response(JSON.stringify({ error: "יותר מדי בקשות, נסה שוב בעוד דקה." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (imgResp.status === 402) {
          return new Response(JSON.stringify({ error: "נגמר המכסה ליצירת תמונות, נסה שוב מאוחר יותר." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await imgResp.text();
        console.error("Image gen error:", imgResp.status, t);
        return new Response(JSON.stringify({ error: "שגיאה ביצירת התמונה" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await imgResp.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = data.choices?.[0]?.message?.content || "";
      if (!imageUrl) {
        return new Response(JSON.stringify({ error: "לא הצלחתי ליצור תמונה" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ image: imageUrl, text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== CHAT MODE (with optional image input + web search via google_search tool) =====
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages חסרים" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
        tools: [{ type: "google_search" }],
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
