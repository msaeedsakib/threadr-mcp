import { RedditClient } from "../reddit/client.js";
import type { AuthManager } from "../auth/manager.js";
import type { RedditListing, RedditPost, RedditComment, RedditMore } from "../reddit/types.js";
import type { ToolResponse } from "../types/index.js";
import { ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { formatCommentTree } from "../formatters/comment.js";
import { buildMetadataHeader } from "./search.js";

export function normalizeCommentId(input: string): { commentId: string; postId?: string } {
  let id = input.trim();

  // Full URL or permalink: .../comments/POST_ID/.../COMMENT_ID/
  const urlMatch = id.match(/\/comments\/([a-z0-9]+)\/[^/]*\/([a-z0-9]+)/i);
  if (urlMatch) return { postId: urlMatch[1], commentId: urlMatch[2] };

  // Prefixed: t1_abc123
  if (id.startsWith("t1_")) return { commentId: id.slice(3) };

  // Bare ID
  return { commentId: id };
}

export async function getCommentThread(
  client: RedditClient,
  auth: AuthManager,
  params: {
    comment_id: string;
    depth: number;
    context: number;
  }
): Promise<ToolResponse> {
  const { commentId, postId } = normalizeCommentId(params.comment_id);
  if (!commentId) {
    return formatError(ErrorCode.INVALID_INPUT, "Comment ID is required");
  }

  const depth = Math.max(1, Math.min(10, params.depth));
  const context = Math.max(0, Math.min(8, params.context));

  // If we don't have a postId from the URL, we need to look up the comment
  // Reddit's comment endpoint requires the post ID
  // For bare comment IDs, use /api/info to get the comment first
  let actualPostId = postId;

  if (!actualPostId) {
    try {
      const infoResponse = await client.request<RedditListing<RedditComment>>({
        path: "/api/info",
        params: { id: `t1_${commentId}` },
      });

      if (infoResponse.status >= 400 || !infoResponse.data.data.children.length) {
        return formatError(ErrorCode.COMMENT_NOT_FOUND, `Comment '${commentId}' not found`, "Verify the comment ID");
      }

      const comment = infoResponse.data.data.children[0].data;
      // link_id is like "t3_abc123"
      actualPostId = comment.link_id.replace("t3_", "");
    } catch {
      return formatError(ErrorCode.COMMENT_NOT_FOUND, `Comment '${commentId}' not found`, "Verify the comment ID");
    }
  }

  try {
    const response = await client.request<
      [RedditListing<RedditPost>, RedditListing<RedditComment | RedditMore>]
    >({
      path: `/comments/${actualPostId}`,
      params: {
        comment: commentId,
        context,
        depth,
      },
    });

    if (response.status === 404) {
      return formatError(ErrorCode.COMMENT_NOT_FOUND, `Comment '${commentId}' not found`, "Verify the comment ID");
    }
    if (response.status >= 400) {
      return formatError(RedditClient.mapHttpError(response.status), `Reddit API error: ${response.status}`);
    }

    const [, commentListing] = response.data;
    const comments = commentListing.data.children;

    if (comments.length === 0) {
      return formatError(ErrorCode.COMMENT_NOT_FOUND, `Comment '${commentId}' not found`, "Verify the comment ID");
    }

    const metadata = buildMetadataHeader(1, false, null, auth.currentTier);
    const formatted = formatCommentTree(
      comments as Array<{ kind: string; data: RedditComment | RedditMore }>,
      depth
    );

    return {
      content: [{ type: "text", text: `${metadata}\n\n[Results]\n${formatted}` }],
    };
  } catch (error) {
    return formatError(
      ErrorCode.REDDIT_ERROR,
      `Failed to get comment thread: ${error instanceof Error ? error.message : "Unknown error"}`,
      "Try again later"
    );
  }
}
