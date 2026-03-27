import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditListing, RedditSubreddit } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatSubredditListing } from "../formatters/subreddit.js";
import { buildMetadataHeader } from "./search.js";

export async function getTrendingSubreddits(
  client: RedditClient,
  auth: AuthManager,
  params: { limit: number }
): Promise<ToolResponse> {
  const limit = Math.max(1, Math.min(50, params.limit));

  try {
    const response = await client.request<RedditListing<RedditSubreddit>>({
      path: "/subreddits/popular",
      params: { limit },
    });

    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const listing = response.data;
    const subreddits = listing.data.children.map((child) => child.data);

    const metadata = buildMetadataHeader(subreddits.length, false, null, auth.currentTier);
    const results = subreddits.length > 0
      ? formatSubredditListing(subreddits)
      : "No trending subreddits found.";

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${results}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get trending subreddits: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}
