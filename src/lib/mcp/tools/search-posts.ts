declare const process: { env: Record<string, string | undefined> };
import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_posts",
  title: "Search marketplace posts",
  description: "Search Schooltrade marketplace posts by keyword in description or seller name.",
  inputSchema: {
    query: z.string().min(1).describe("Keyword to search for (Hebrew or English)."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    const like = `%${query}%`;
    const { data, error } = await supabase
      .from("posts")
      .select("id, owner_name, description, price, current_bid_price, auction_active, created_at, photo_url")
      .or(`description.ilike.${like},owner_name.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { posts: data, query },
    };
  },
});
