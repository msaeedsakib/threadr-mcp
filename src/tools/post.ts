import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditListing, RedditPost, RedditComment, RedditMore } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatPost } from "../formatters/post.js";
import { formatCommentTree } from "../formatters/comment.js";
import { buildMetadataHeader } from "./search.js";

export function normalizePostId(input: string): string {
  let id = input.trim();

  // Full URL: https://reddit.com/r/sub/comments/abc123/...
  const urlMatch = id.match(/\/comments\/([a-z0-9]+)/i);
  if (urlMatch) return urlMatch[1];

  // Permalink: /r/sub/comments/abc123/...
  const permalinkMatch = id.match(/^\/r\/[^/]+\/comments\/([a-z0-9]+)/i);
  if (permalinkMatch) return permalinkMatch[1];

  // Prefixed: t3_abc123
  if (id.startsWith("t3_")) return id.slice(3);

  // Bare ID
  return id;
}

export async function getPostDetail(
  client: RedditClient,
  auth: AuthManager,
  params: {
    post_id: string;
    comment_limit: number;
    comment_depth: number;
    comment_sort: string;
  }
): Promise<ToolResponse> {
  const postId = normalizePostId(params.post_id);
  if (!postId) {
    return formatError(ErrorCode.INVALID_INPUT, "Post ID is required");
  }

  const commentLimit = Math.max(1, Math.min(200, params.comment_limit));
  const commentDepth = Math.max(1, Math.min(10, params.comment_depth));

  try {
    const response = await client.request<
      [RedditListing<RedditPost>, RedditListing<RedditComment | RedditMore>]
    >({
      path: `/comments/${postId}`,
      params: {
        sort: params.comment_sort,
        limit: commentLimit,
        depth: commentDepth,
      },
    });

    if (response.status === 404) {
      return formatError(ErrorCode.POST_NOT_FOUND, `Post '${postId}' not found`, "Verify the post ID or URL");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const [postListing, commentListing] = response.data;
    const post = postListing.data.children[0]?.data;

    if (!post) {
      return formatError(ErrorCode.POST_NOT_FOUND, `Post '${postId}' not found`, "Verify the post ID or URL");
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const postFormatted = formatPost(post);
    const comments = commentListing.data.children;
    const commentsFormatted = comments.length > 0
      ? formatCommentTree(
          comments as Array<{ kind: string; data: RedditComment | RedditMore }>,
          commentDepth
        )
      : "No comments yet.";

    return {
      content: [{
        type: "text",
        text: `${metadata}\n\n[Post]\n${postFormatted}\n\n[Comments]\n${commentsFormatted}`,
      }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get post detail: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}
