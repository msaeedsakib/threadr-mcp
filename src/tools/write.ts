import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditSubmitResponse, RedditCommentResponse } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { AuthTier, ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { normalizePostId } from "./post.js";
import { stripSubredditPrefix, buildMetadataHeader } from "./search.js";

function normalizeCommentIdForWrite(input: string): string {
  let id = input.trim();
  const urlMatch = id.match(/\/comments\/[a-z0-9]+\/[^/]*\/([a-z0-9]+)/i);
  if (urlMatch) return urlMatch[1];
  if (id.startsWith("t1_")) return id.slice(3);
  return id;
}

function requireAuth(auth: AuthManager): ToolResponse | null {
  return auth.requireTier(AuthTier.UserAuth);
}

export async function createPost(
  client: RedditClient,
  auth: AuthManager,
  params: {
    subreddit: string;
    title: string;
    content: string;
    is_self: boolean;
    flair_id?: string;
    nsfw: boolean;
    spoiler: boolean;
  }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const subreddit = stripSubredditPrefix(params.subreddit);
  if (!subreddit) {
    return formatError(ErrorCode.INVALID_INPUT, "Subreddit is required");
  }

  if (params.title.length > 300) {
    return formatError(ErrorCode.INVALID_INPUT, "Title must not exceed 300 characters");
  }

  if (!params.is_self) {
    try {
      new URL(params.content);
    } catch {
      return formatError(ErrorCode.INVALID_INPUT, "Content must be a valid URL for link posts");
    }
  }

  try {
    const body: Record<string, string> = {
      sr: subreddit,
      title: params.title,
      kind: params.is_self ? "self" : "link",
      resubmit: "true",
      api_type: "json",
    };

    if (params.is_self) {
      body.text = params.content;
    } else {
      body.url = params.content;
    }

    if (params.flair_id) body.flair_id = params.flair_id;
    if (params.nsfw) body.nsfw = "true";
    if (params.spoiler) body.spoiler = "true";

    const response = await client.request<RedditSubmitResponse>({
      method: "POST",
      path: "/api/submit",
      body,
    });

    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const result = response.data.json;
    if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors.map((e) => e[1]).join("; ");
      return formatError(ErrorCode.REDDIT_ERROR, errorMsg);
    }

    const data = result.data!;
    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const text = [
      `Post created successfully.`,
      `ID: ${data.name}`,
      `URL: ${data.url}`,
    ].join("\n");

    return { content: [{ type: "text", text: `${metadata}\n\n[Results]\n${text}` }] };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to create post: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function replyToPost(
  client: RedditClient,
  auth: AuthManager,
  params: { post_id: string; content: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const postId = normalizePostId(params.post_id);
  if (!postId) return formatError(ErrorCode.INVALID_INPUT, "Post ID is required");
  if (params.content.length < 1 || params.content.length > 10000) {
    return formatError(ErrorCode.INVALID_INPUT, "Content must be 1-10,000 characters");
  }

  try {
    const response = await client.request<RedditCommentResponse>({
      method: "POST",
      path: "/api/comment",
      body: { thing_id: `t3_${postId}`, text: params.content, api_type: "json" },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.POST_LOCKED, "Post is locked or archived", "Cannot comment on locked posts");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const result = response.data.json;
    if (result.errors?.length) {
      const errorMsg = result.errors.map((e) => e[1]).join("; ");
      if (errorMsg.includes("THREAD_LOCKED")) return formatError(ErrorCode.POST_LOCKED, "Post is locked", "Cannot comment on locked posts");
      if (errorMsg.includes("ARCHIVED")) return formatError(ErrorCode.POST_ARCHIVED, "Post is archived", "Cannot comment on archived posts");
      return formatError(ErrorCode.REDDIT_ERROR, errorMsg);
    }

    const comment = result.data?.things?.[0]?.data;
    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const text = comment
      ? `Comment posted successfully.\nID: ${comment.name}\nPermalink: https://www.reddit.com${comment.permalink}`
      : "Comment posted successfully.";

    return { content: [{ type: "text", text: `${metadata}\n\n[Results]\n${text}` }] };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to reply to post: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function replyToComment(
  client: RedditClient,
  auth: AuthManager,
  params: { comment_id: string; content: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const commentId = normalizeCommentIdForWrite(params.comment_id);
  if (!commentId) return formatError(ErrorCode.INVALID_INPUT, "Comment ID is required");
  if (params.content.length < 1 || params.content.length > 10000) {
    return formatError(ErrorCode.INVALID_INPUT, "Content must be 1-10,000 characters");
  }

  try {
    const response = await client.request<RedditCommentResponse>({
      method: "POST",
      path: "/api/comment",
      body: { thing_id: `t1_${commentId}`, text: params.content, api_type: "json" },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.POST_LOCKED, "Post is locked or archived", "Cannot reply to comments on locked posts");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const result = response.data.json;
    if (result.errors?.length) {
      const errorMsg = result.errors.map((e) => e[1]).join("; ");
      return formatError(ErrorCode.REDDIT_ERROR, errorMsg);
    }

    const comment = result.data?.things?.[0]?.data;
    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const text = comment
      ? `Reply posted successfully.\nID: ${comment.name}\nPermalink: https://www.reddit.com${comment.permalink}`
      : "Reply posted successfully.";

    return { content: [{ type: "text", text: `${metadata}\n\n[Results]\n${text}` }] };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to reply to comment: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function vote(
  client: RedditClient,
  auth: AuthManager,
  params: { target_id: string; direction: "up" | "down" | "unvote" }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const targetId = params.target_id.trim();
  if (!targetId.startsWith("t3_") && !targetId.startsWith("t1_")) {
    return formatError(ErrorCode.INVALID_INPUT, "Target ID must be a fullname with t3_ or t1_ prefix");
  }

  const dirMap: Record<string, string> = { up: "1", down: "-1", unvote: "0" };
  const dir = dirMap[params.direction];

  try {
    const response = await client.request({
      method: "POST",
      path: "/api/vote",
      body: { id: targetId, dir, api_type: "json" },
    });

    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\nVote recorded: ${params.direction} on ${targetId}` }],
    };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to vote: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function editPost(
  client: RedditClient,
  auth: AuthManager,
  params: { post_id: string; content: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const postId = normalizePostId(params.post_id);
  if (!postId) return formatError(ErrorCode.INVALID_INPUT, "Post ID is required");

  try {
    const response = await client.request({
      method: "POST",
      path: "/api/editusertext",
      body: { thing_id: `t3_${postId}`, text: params.content, api_type: "json" },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.NOT_AUTHOR, "Cannot edit post you did not author", "Can only edit your own posts");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\nPost t3_${postId} updated successfully.` }],
    };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to edit post: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function editComment(
  client: RedditClient,
  auth: AuthManager,
  params: { comment_id: string; content: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const commentId = normalizeCommentIdForWrite(params.comment_id);
  if (!commentId) return formatError(ErrorCode.INVALID_INPUT, "Comment ID is required");
  if (params.content.length < 1 || params.content.length > 10000) {
    return formatError(ErrorCode.INVALID_INPUT, "Content must be 1-10,000 characters");
  }

  try {
    const response = await client.request({
      method: "POST",
      path: "/api/editusertext",
      body: { thing_id: `t1_${commentId}`, text: params.content, api_type: "json" },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.NOT_AUTHOR, "Cannot edit comment you did not author", "Can only edit your own comments");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\nComment t1_${commentId} updated successfully.` }],
    };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to edit comment: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function deletePost(
  client: RedditClient,
  auth: AuthManager,
  params: { post_id: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const postId = normalizePostId(params.post_id);
  if (!postId) return formatError(ErrorCode.INVALID_INPUT, "Post ID is required");

  try {
    const response = await client.request({
      method: "POST",
      path: "/api/del",
      body: { id: `t3_${postId}` },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.NOT_AUTHOR, "Cannot delete post you did not author", "Can only delete your own posts");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\nPost t3_${postId} deleted successfully.` }],
    };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to delete post: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}

export async function deleteComment(
  client: RedditClient,
  auth: AuthManager,
  params: { comment_id: string }
): Promise<ToolResponse> {
  const tierError = requireAuth(auth);
  if (tierError) return tierError;

  const commentId = normalizeCommentIdForWrite(params.comment_id);
  if (!commentId) return formatError(ErrorCode.INVALID_INPUT, "Comment ID is required");

  try {
    const response = await client.request({
      method: "POST",
      path: "/api/del",
      body: { id: `t1_${commentId}` },
    });

    if (response.status === 403) {
      return formatError(ErrorCode.NOT_AUTHOR, "Cannot delete comment you did not author", "Can only delete your own comments");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\nComment t1_${commentId} deleted successfully.` }],
    };
  } catch (error) {
    return formatError(ErrorCode.REDDIT_ERROR, `Failed to delete comment: ${error instanceof Error ? error.message : "Unknown error"}`, "Try again later");
  }
}
