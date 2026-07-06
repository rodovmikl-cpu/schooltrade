import { defineMcp } from "@lovable.dev/mcp-js";
import listPosts from "./tools/list-posts";
import searchPosts from "./tools/search-posts";
import listSchoolNews from "./tools/list-school-news";
import listBooks from "./tools/list-books";

export default defineMcp({
  name: "schooltrade-mcp",
  title: "Schooltrade",
  version: "0.1.0",
  instructions:
    "Tools for the Schooltrade school marketplace. Use `list_posts` or `search_posts` to browse ads for items being sold or auctioned, `list_school_news` for the latest school announcements, and `list_books` for the library. All content is in Hebrew.",
  tools: [listPosts, searchPosts, listSchoolNews, listBooks],
});
