import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditSubreddit, RedditSubredditRules, RedditListing, RedditPost } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatSubredditInfo } from "../formatters/subreddit.js";
import { formatPostListing } from "../formatters/post.js";
import { buildMetadataHeader, stripSubredditPrefix } from "./search.js";

export async function getSubredditInfo(
  client: RedditClient,
  auth: AuthManager,
  params: { subreddit: string }
): Promise<ToolResponse> {
  const subreddit = stripSubredditPrefix(params.subreddit);
  if (!subreddit) {
    return formatError(ErrorCode.INVALID_INPUT, "Subreddit name is required");
  }

  try {
    const [aboutResponse, rulesResponse] = await Promise.all([
      client.request<{ data: RedditSubreddit }>({ path: `/r/${subreddit}/about` }),
      client.request<RedditSubredditRules>({ path: `/r/${subreddit}/about/rules` }).catch(() => null),
    ]);

    if (aboutResponse.status === 404) {
      return formatError(ErrorCode.SUBREDDIT_NOT_FOUND, `Subreddit '${subreddit}' not found`, "Check the subreddit name spelling");
    }
    if (aboutResponse.status === 403) {
      return formatError(ErrorCode.SUBREDDIT_PRIVATE, `Subreddit '${subreddit}' is private or quarantined`, "Cannot access private subreddits");
    }
    if (aboutResponse.status >= 400) {
      return formatError(RedditClient.mapHttpError(aboutResponse.status), `Reddit API error: ${aboutResponse.status}`);
    }

    const sub = aboutResponse.data.data ?? aboutResponse.data as unknown as RedditSubreddit;
    const rules = rulesResponse?.data ?? undefined;

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const formatted = formatSubredditInfo(sub, rules);

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${formatted}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get subreddit info: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}

export async function getSubredditPosts(
  client: RedditClient,
  auth: AuthManager,
  params: {
    subreddit: string;
    sort: string;
    time_filter: string;
    limit: number;
    after?: string;
  }
): Promise<ToolResponse> {
  const subreddit = stripSubredditPrefix(params.subreddit);
  if (!subreddit) {
    return formatError(ErrorCode.INVALID_INPUT, "Subreddit name is required");
  }

  const limit = Math.max(1, Math.min(100, params.limit));

  const requestParams: Record<string, string | number | boolean | undefined> = {
    t: params.time_filter,
    limit,
    after: params.after,
  };

  try {
    const response = await client.request<RedditListing<RedditPost>>({
      path: `/r/${subreddit}/${params.sort}`,
      params: requestParams,
    });

    if (response.status === 404) {
      return formatError(ErrorCode.SUBREDDIT_NOT_FOUND, `Subreddit '${subreddit}' not found`, "Check the subreddit name spelling");
    }
    if (response.status === 403) {
      return formatError(ErrorCode.SUBREDDIT_PRIVATE, `Subreddit '${subreddit}' is private or quarantined`, "Cannot access private subreddits");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const listing = response.data;
    const posts = listing.data.children.map((child) => child.data);
    const nextCursor = listing.data.after;
    const hasMore = nextCursor !== null;

    const metadata = buildMetadataHeader(posts.length, hasMore, nextCursor, auth.currentTier);
    const results = posts.length > 0
      ? formatPostListing(posts)
      : "No posts found.";

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${results}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get subreddit posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}
