import type { RedditPost } from "../reddit/types.js";

const SELFTEXT_TRUNCATE_LENGTH = 500;

export function formatRelativeTime(utcSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - utcSeconds;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
}

export function formatISOTime(utcSeconds: number): string {
  return new Date(utcSeconds * 1000).toISOString();
}

export function formatScore(score: number): string {
  if (Math.abs(score) >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return String(score);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + " [truncated]";
}

function formatFlags(post: RedditPost): string {
  const flags: string[] = [];
  if (post.over_18) flags.push("NSFW");
  if (post.spoiler) flags.push("Spoiler");
  if (post.locked) flags.push("Locked");
  if (post.archived) flags.push("Archived");
  if (post.stickied) flags.push("Stickied");
  return flags.length > 0 ? `Flags: ${flags.join(", ")}` : "";
}

export function formatPost(post: RedditPost): string {
  const lines: string[] = [
    `Title: ${post.title}`,
    `Author: ${post.author}`,
    `Subreddit: r/${post.subreddit}`,
    `Score: ${formatScore(post.score)} (${post.upvote_ratio * 100}% upvoted)`,
    `Comments: ${post.num_comments}`,
    `Created: ${formatRelativeTime(post.created_utc)} (${formatISOTime(post.created_utc)})`,
    `URL: ${post.url}`,
    `Permalink: https://www.reddit.com${post.permalink}`,
    `Type: ${post.is_self ? "self" : "link"}${post.domain ? ` (${post.domain})` : ""}`,
  ];

  if (post.link_flair_text) {
    lines.push(`Flair: ${post.link_flair_text}`);
  }

  if (post.edited) {
    lines.push(`Edited: ${formatRelativeTime(post.edited)} (${formatISOTime(post.edited)})`);
  }

  const flags = formatFlags(post);
  if (flags) lines.push(flags);

  if (post.total_awards_received > 0) {
    lines.push(`Awards: ${post.total_awards_received}`);
  }

  if (post.is_self && post.selftext) {
    lines.push("");
    lines.push(`Body:\n${post.selftext}`);
  }

  return lines.join("\n");
}

export function formatPostListing(posts: RedditPost[]): string {
  return posts.map((post) => {
    const lines: string[] = [
      `Title: ${post.title}`,
      `Author: ${post.author}`,
      `Subreddit: r/${post.subreddit}`,
      `Score: ${formatScore(post.score)} | Comments: ${post.num_comments}`,
      `Created: ${formatRelativeTime(post.created_utc)} (${formatISOTime(post.created_utc)})`,
      `URL: ${post.url}`,
    ];

    if (post.link_flair_text) {
      lines.push(`Flair: ${post.link_flair_text}`);
    }

    const flags = formatFlags(post);
    if (flags) lines.push(flags);

    if (post.is_self && post.selftext) {
      lines.push(`Body: ${truncateText(post.selftext, SELFTEXT_TRUNCATE_LENGTH)}`);
    }

    return lines.join("\n");
  }).join("\n\n---\n\n");
}
