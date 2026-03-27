import type { RedditSubreddit, RedditSubredditRules, RedditSubredditFlairs } from "../reddit/types.js";
import { formatRelativeTime, formatISOTime, formatScore } from "./post.js";

export function formatSubredditInfo(
  sub: RedditSubreddit,
  rules?: RedditSubredditRules,
  flairs?: RedditSubredditFlairs
): string {
  const lines: string[] = [
    `Name: r/${sub.display_name}`,
    `Title: ${sub.title}`,
  ];

  if (sub.public_description) {
    lines.push(`Description: ${sub.public_description}`);
  }

  lines.push(`Subscribers: ${formatScore(sub.subscribers)}`);

  if (sub.accounts_active !== null) {
    lines.push(`Active Users: ${formatScore(sub.accounts_active)}`);
  }

  lines.push(`Created: ${formatRelativeTime(sub.created_utc)} (${formatISOTime(sub.created_utc)})`);
  lines.push(`Type: ${sub.subreddit_type}`);

  const flags: string[] = [];
  if (sub.over18) flags.push("NSFW");
  if (sub.quarantine) flags.push("Quarantined");
  if (flags.length > 0) {
    lines.push(`Flags: ${flags.join(", ")}`);
  }

  if (sub.submission_type) {
    lines.push(`Submission Type: ${sub.submission_type}`);
  }

  if (rules?.rules && rules.rules.length > 0) {
    lines.push("");
    lines.push("Rules:");
    for (const rule of rules.rules) {
      lines.push(`  ${rule.short_name}: ${rule.description}`);
    }
  }

  if (flairs?.choices && flairs.choices.length > 0) {
    lines.push("");
    lines.push("Flairs:");
    for (const flair of flairs.choices) {
      lines.push(`  [${flair.flair_template_id}] ${flair.flair_text}`);
    }
  }

  return lines.join("\n");
}

export function formatSubredditListing(subreddits: RedditSubreddit[]): string {
  return subreddits.map((sub) => {
    const lines: string[] = [
      `r/${sub.display_name}`,
      `Subscribers: ${formatScore(sub.subscribers)}`,
    ];

    if (sub.public_description) {
      lines.push(`Description: ${sub.public_description}`);
    }

    const flags: string[] = [];
    if (sub.over18) flags.push("NSFW");
    if (sub.quarantine) flags.push("Quarantined");
    if (flags.length > 0) {
      lines.push(`Flags: ${flags.join(", ")}`);
    }

    return lines.join("\n");
  }).join("\n\n---\n\n");
}
