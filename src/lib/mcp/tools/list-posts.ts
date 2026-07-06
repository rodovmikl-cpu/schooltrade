import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "list_posts",
  title: "List marketplace posts",
  description: "List the most recent Schooltrade marketplace posts (ads for items being sold or auctioned).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many posts to return (max 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    );
    const { data, error } = await supabase
      .from("posts")
      .select("id, owner_name, description, price, current_bid_price, auction_active, posting_mode, created_at, photo_url")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { posts: data },
    };
  },
});
