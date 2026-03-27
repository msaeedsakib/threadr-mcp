import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditListing, RedditPost } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatPostListing } from "../formatters/post.js";

function buildMetadataHeader(
  resultCount: number,
  hasMore: boolean,
  nextCursor: string | null,
  authTier: number
): string {
  const lines = [
    "[Metadata]",
    `results: ${resultCount}`,
    `has_more: ${hasMore}`,
    `next_cursor: ${nextCursor ?? "null"}`,
    `auth_tier: ${authTier}`,
  ];
  return lines.join("\n");
}

export function stripSubredditPrefix(name: string): string {
  return name.replace(/^r\//, "").trim();
}

export async function searchPosts(
  client: RedditClient,
  auth: AuthManager,
  params: {
    query: string;
    subreddit?: string;
    sort: string;
    time_filter: string;
    limit: number;
    after?: string;
  }
): Promise<ToolResponse> {
  const query = params.query.trim();
  if (!query) {
    return formatError(ErrorCode.INVALID_INPUT, "Query is required and cannot be empty");
  }

  const limit = Math.max(1, Math.min(100, params.limit));
  const subreddit = params.subreddit ? stripSubredditPrefix(params.subreddit) : undefined;
  const path = subreddit ? `/r/${subreddit}/search` : "/search";

  const requestParams: Record<string, string | number | boolean | undefined> = {
    q: query,
    sort: params.sort,
    t: params.time_filter,
    limit,
    after: params.after,
    restrict_sr: subreddit ? true : undefined,
  };

  try {
    const response = await client.request<RedditListing<RedditPost>>({
      path,
      params: requestParams,
    });

    if (response.status >= 400) {
      const errorCode = RedditClient.mapHttpError(response.status);
      return formatError(errorCode, `Reddit API error: ${response.status}`);
    }

    const listing = response.data;
    const posts = listing.data.children.map((child) => child.data);
    const nextCursor = listing.data.after;
    const hasMore = nextCursor !== null;

    const metadata = buildMetadataHeader(posts.length, hasMore, nextCursor, auth.currentTier);
    const results = posts.length > 0
      ? formatPostListing(posts)
      : "No results found.";

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${results}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to search posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}

export { buildMetadataHeader };
