import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripGutenbergWrapper = (text: string) => {
  const startMarkers = [
    "*** START OF THE PROJECT GUTENBERG EBOOK",
    "*** START OF THIS PROJECT GUTENBERG EBOOK",
    "***START OF THE PROJECT GUTENBERG EBOOK",
  ];
  const endMarkers = [
    "*** END OF THE PROJECT GUTENBERG EBOOK",
    "*** END OF THIS PROJECT GUTENBERG EBOOK",
    "***END OF THE PROJECT GUTENBERG EBOOK",
  ];

  let start = -1;
  for (const marker of startMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      const lineEnd = text.indexOf("\n", idx);
      start = lineEnd >= 0 ? lineEnd + 1 : idx + marker.length;
      break;
    }
  }

  let end = text.length;
  for (const marker of endMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= 0) {
      end = idx;
      break;
    }
  }

  return text.slice(start >= 0 ? start : 0, end)
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "חסר מקור לספר" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const target = new URL(url);
    if (target.hostname !== "www.gutenberg.org" || !target.pathname.startsWith("/cache/epub/")) {
      return new Response(JSON.stringify({ error: "מקור הספר אינו מאושר" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(target.toString(), {
      headers: { "User-Agent": "SchooltradeBooks/1.0" },
    });

    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "לא ניתן לטעון את הספר כרגע" }), {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await upstream.text();
    const content = stripGutenbergWrapper(raw);

    return new Response(JSON.stringify({ content, length: content.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("book-content error:", e);
    return new Response(JSON.stringify({ error: "שגיאה בטעינת תוכן הספר" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
