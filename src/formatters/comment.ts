import type { RedditComment, RedditMore, RedditListing } from "../reddit/types.js";
import { formatRelativeTime, formatISOTime, formatScore } from "./post.js";

const COMMENT_BODY_TRUNCATE_LENGTH = 2000;

function truncateBody(text: string): string {
  if (text.length <= COMMENT_BODY_TRUNCATE_LENGTH) return text;
  return text.slice(0, COMMENT_BODY_TRUNCATE_LENGTH) + " [truncated]";
}

function indentPrefix(depth: number): string {
  return "| ".repeat(depth);
}

function formatSingleComment(comment: RedditComment): string {
  const prefix = indentPrefix(comment.depth);
  const opTag = comment.is_submitter ? " [OP]" : "";
  const editedTag = comment.edited
    ? ` (edited ${formatRelativeTime(comment.edited)})`
    : "";

  const lines = [
    `${prefix}[${comment.author}${opTag}] ${formatScore(comment.score)} points | ${formatRelativeTime(comment.created_utc)} (${formatISOTime(comment.created_utc)})${editedTag}`,
    `${prefix}${truncateBody(comment.body)}`,
  ];

  return lines.join("\n");
}

export function formatCommentTree(
  comments: Array<{ kind: string; data: RedditComment | RedditMore }>,
  maxDepth: number = 10
): string {
  const parts: string[] = [];

  for (const child of comments) {
    if (child.kind === "more") {
      const more = child.data as RedditMore;
      if (more.count > 0) {
        const prefix = indentPrefix(more.depth);
        parts.push(`${prefix}[${more.count} more replies]`);
      }
      continue;
    }

    const comment = child.data as RedditComment;
    parts.push(formatSingleComment(comment));

    if (comment.replies && typeof comment.replies === "object" && comment.depth < maxDepth) {
      const replies = comment.replies as RedditListing<RedditComment>;
      if (replies.data?.children?.length > 0) {
        const nested = formatCommentTree(
          replies.data.children as Array<{ kind: string; data: RedditComment | RedditMore }>,
          maxDepth
        );
        if (nested) parts.push(nested);
      }
    }
  }

  return parts.join("\n\n");
}

export function formatCommentListing(comments: RedditComment[]): string {
  return comments.map((comment) => {
    const lines = [
      `[${comment.author}] ${formatScore(comment.score)} points | ${formatRelativeTime(comment.created_utc)} (${formatISOTime(comment.created_utc)})`,
      `Subreddit: r/${comment.subreddit}`,
    ];

    if (comment.link_title) {
      lines.push(`Post: ${comment.link_title}`);
    }

    lines.push(`Body: ${truncateBody(comment.body)}`);
    lines.push(`Permalink: https://www.reddit.com${comment.permalink}`);

    return lines.join("\n");
  }).join("\n\n---\n\n");
}
