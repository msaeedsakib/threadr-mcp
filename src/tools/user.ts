import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditUser, RedditMe, RedditListing, RedditPost, RedditComment } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { AuthTier, ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatUserProfile, formatMyProfile } from "../formatters/user.js";
import { formatPostListing } from "../formatters/post.js";
import { formatCommentListing } from "../formatters/comment.js";
import { buildMetadataHeader } from "./search.js";

function stripUserPrefix(name: string): string {
  return name.replace(/^u\//, "").trim();
}

export async function getUserProfile(
  client: RedditClient,
  auth: AuthManager,
  params: { username: string }
): Promise<ToolResponse> {
  const username = stripUserPrefix(params.username);
  if (!username) {
    return formatError(ErrorCode.INVALID_INPUT, "Username is required");
  }

  try {
    const response = await client.request<{ data: RedditUser }>({
      path: `/user/${username}/about`,
    });

    if (response.status === 404) {
      return formatError(ErrorCode.USER_NOT_FOUND, `User '${username}' not found`, "Check the username spelling");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const user = response.data.data ?? response.data as unknown as RedditUser;
    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const formatted = formatUserProfile(user);

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${formatted}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get user profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}

export async function getUserPosts(
  client: RedditClient,
  auth: AuthManager,
  params: {
    username: string;
    sort: string;
    time_filter: string;
    limit: number;
    after?: string;
  }
): Promise<ToolResponse> {
  const username = stripUserPrefix(params.username);
  if (!username) {
    return formatError(ErrorCode.INVALID_INPUT, "Username is required");
  }

  const limit = Math.max(1, Math.min(100, params.limit));

  try {
    const response = await client.request<RedditListing<RedditPost>>({
      path: `/user/${username}/submitted`,
      params: {
        sort: params.sort,
        t: params.time_filter,
        limit,
        after: params.after,
      },
    });

    if (response.status === 404) {
      return formatError(ErrorCode.USER_NOT_FOUND, `User '${username}' not found`, "Check the username spelling");
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
      `Failed to get user posts: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}

export async function getUserComments(
  client: RedditClient,
  auth: AuthManager,
  params: {
    username: string;
    sort: string;
    time_filter: string;
    limit: number;
    after?: string;
  }
): Promise<ToolResponse> {
  const username = stripUserPrefix(params.username);
  if (!username) {
    return formatError(ErrorCode.INVALID_INPUT, "Username is required");
  }

  const limit = Math.max(1, Math.min(100, params.limit));

  try {
    const response = await client.request<RedditListing<RedditComment>>({
      path: `/user/${username}/comments`,
      params: {
        sort: params.sort,
        t: params.time_filter,
        limit,
        after: params.after,
      },
    });

    if (response.status === 404) {
      return formatError(ErrorCode.USER_NOT_FOUND, `User '${username}' not found`, "Check the username spelling");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const listing = response.data;
    const comments = listing.data.children.map((child) => child.data);
    const nextCursor = listing.data.after;
    const hasMore = nextCursor !== null;

    const metadata = buildMetadataHeader(comments.length, hasMore, nextCursor, auth.currentTier);
    const results = comments.length > 0
      ? formatCommentListing(comments)
      : "No comments found.";

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${results}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get user comments: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}

export async function getMyProfile(
  client: RedditClient,
  auth: AuthManager
): Promise<ToolResponse> {
  const tierError = auth.requireTier(AuthTier.UserAuth);
  if (tierError) return tierError;

  try {
    const response = await client.request<RedditMe>({
      path: "/api/v1/me",
    });

    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const formatted = formatMyProfile(response.data);

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${formatted}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get profile: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}
