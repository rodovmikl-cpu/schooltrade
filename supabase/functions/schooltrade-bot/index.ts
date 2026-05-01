import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `אתה schooltrade bot (beta), עוזר חכם, מתקדם ובטוח לתלמידים באתר Schooltrade.

# יכולות:
- אתה יכול לחפש מידע באינטרנט בזמן אמת ולספק מידע עדכני ומדויק
- אתה יכול לנתח תמונות שמשתמשים שולחים ולתאר אותן
- **אתה כן יכול לייצר תמונות חדשות**. כשמשתמש מבקש לייצר/לצייר/ליצור תמונה — לעולם אל תסרב ואל תגיד "אני לא יכול לייצר תמונות". במקום זאת, ענה במשפט קצר אחד שאתה מתחיל לייצר את התמונה (לדוגמה: "מייצר עבורך תמונה של ___ 🎨"). מערכת היצירה תעבוד ברקע אוטומטית.
- אתה יכול לעזור בלימודים, לענות על שאלות, ולעזור ליצור מודעות למכירה

# כללים חשובים:
- שפה ראשית: עברית. שפה משנית: אנגלית. ניתן לענות בשפות אחרות.
- כשאתה מחפש מידע באינטרנט, ציין במפורש "🔍 מחפש מידע..." ולאחר מכן הצג את המקורות שמצאת
- כשאתה מתאר תמונה, היה מפורט ומדויק
- ענה בצורה ברורה, מסודרת ומועילה. השתמש ב-Markdown לעיצוב כשמתאים
- אל תמציא מידע - אם אתה לא יודע, אמור זאת

# בטיחות (היחיד שמותר לסרב לו):
- אסור תוכן 18+, אלימות גרפית, קללות או תוכן לא מתאים לקטינים
- רק במקרה כזה ענה: "אני לא יכול לעזור עם זה"
- בכל מקרה אחר — עזור! אל תסרב ליצירת תמונות לגיטימיות (חיות, נופים, דמויות, אובייקטים, פוסטרים, לוגואים וכו')
- אינך יכול לשלוט במשתמשים אחרים, לשנות הרשאות, יתרות או מערכות באתר

תהיה ידידותי, מקצועי, חכם ומועיל.`;

// Server-side image-intent detector — fallback if frontend regex misses
const detectImageIntent = (text: string): string | null => {
  if (!text || typeof text !== "string") return null;
  const t = text.trim();
  if (t.length < 3 || t.length > 600) return null;
  const hebVerbs = "(?:צייר|תצייר|ציירי|תייצר|ייצר|תיצור|צור|תכין|הכן|תעשה|עשה|תפיק|הפק|תרשום|רשום)";
  const engVerbs = "(?:generate|create|draw|make|render|produce|design|paint|illustrate|sketch|show)";
  const hebNouns = "(?:תמונה|תמונת|ציור|תרשים|איור|פוסטר|לוגו|אווטאר|אווטר|דמות|רקע)";
  const engNouns = "(?:image|picture|photo|drawing|illustration|poster|logo|avatar|render|sketch|painting|wallpaper|background)";
  const patterns: RegExp[] = [
    new RegExp(`^${hebVerbs}\\s+(?:לי\\s+|בבקשה\\s+)?${hebNouns}\\s+(?:של\\s+|עם\\s+)?(.+)$`, "i"),
    new RegExp(`^(?:אני\\s+רוצה|רציתי|אפשר|תוכל|יכול\\s+אתה|תן\\s+לי|תביא\\s+לי|הראה\\s+לי)\\s+.{0,30}?${hebNouns}\\s+(?:של\\s+|עם\\s+)?(.+)$`, "i"),
    new RegExp(`^${hebNouns}\\s+(?:של\\s+|עם\\s+)(.+)$`, "i"),
    new RegExp(`^${engVerbs}\\s+(?:me\\s+)?(?:an?\\s+|the\\s+)?${engNouns}\\s+(?:of\\s+|with\\s+|showing\\s+)?(.+)$`, "i"),
    new RegExp(`^(?:i\\s+want|can\\s+you|could\\s+you|please)\\s+.{0,30}?${engNouns}\\s+(?:of\\s+|with\\s+)?(.+)$`, "i"),
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
  }
  return null;
};

// Light unsafe-content guard for image prompts (block 18+/violence only)
const isUnsafeImagePrompt = (prompt: string): boolean => {
  const p = prompt.toLowerCase();
  const blocked = [
    "nude", "naked", "nsfw", "porn", "sex ", "erotic", "xxx",
    "עירום", "עירומה", "פורנו", "סקס", "אירוטי",
    "gore", "blood", "kill ", "murder", "weapon", " gun ",
    "דם", "רצח", "להרוג", "נשק",
  ];
  return blocked.some((w) => p.includes(w));
};

// Image generation with retry + model fallback
async function generateImageWithRetry(prompt: string, apiKey: string): Promise<{ imageUrl?: string; text: string; error?: string; status?: number }> {
  const models = ["google/gemini-2.5-flash-image", "google/gemini-3.1-flash-image-preview"];
  let lastError = "";
  let lastStatus = 500;

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    try {
      const imgResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: `Generate a high quality, safe-for-work image: ${prompt}` }],
          modalities: ["image", "text"],
          max_tokens: 8192,
        }),
      });

      if (imgResp.status === 429 || imgResp.status === 402) {
        await imgResp.text();
        return { error: imgResp.status === 429 ? "יותר מדי בקשות, נסה שוב בעוד דקה." : "נגמר המכסה ליצירת תמונות, נסה שוב מאוחר יותר.", status: imgResp.status, text: "" };
      }
      if (!imgResp.ok) {
        lastError = await imgResp.text();
        lastStatus = imgResp.status;
        console.error(`Image gen attempt ${attempt + 1} (${model}) failed:`, lastStatus, lastError);
        continue;
      }

      const data = await imgResp.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const text = data.choices?.[0]?.message?.content || "";
      const finishReason = data.choices?.[0]?.finish_reason;

      if (imageUrl) {
        return { imageUrl, text };
      }
      console.error(`Image gen attempt ${attempt + 1} (${model}) returned no image. finish_reason=${finishReason}`);
      lastError = `No image returned (finish_reason=${finishReason})`;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      console.error(`Image gen attempt ${attempt + 1} (${model}) threw:`, lastError);
    }
  }

  return { error: "לא הצלחתי ליצור תמונה כרגע, נסה לנסח את הבקשה אחרת.", status: lastStatus, text: "" };
}

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
