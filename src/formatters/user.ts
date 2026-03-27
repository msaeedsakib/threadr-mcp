import type { RedditUser, RedditMe } from "../reddit/types.js";
import { formatRelativeTime, formatISOTime, formatScore } from "./post.js";

export function formatUserProfile(user: RedditUser): string {
  const lines: string[] = [
    `Username: u/${user.name}`,
  ];

  if (user.subreddit?.title) {
    lines.push(`Display Name: ${user.subreddit.title}`);
  }

  lines.push(`Created: ${formatRelativeTime(user.created_utc)} (${formatISOTime(user.created_utc)})`);
  lines.push("");
  lines.push("Karma:");
  lines.push(`  Total: ${formatScore(user.total_karma)}`);
  lines.push(`  Post: ${formatScore(user.link_karma)}`);
  lines.push(`  Comment: ${formatScore(user.comment_karma)}`);
  lines.push(`  Awardee: ${formatScore(user.awardee_karma)}`);
  lines.push(`  Awarder: ${formatScore(user.awarder_karma)}`);

  lines.push("");

  const flags: string[] = [];
  if (user.has_verified_email) flags.push("Verified Email");
  if (user.is_gold) flags.push("Gold");
  if (user.is_mod) flags.push("Moderator");
  if (user.is_employee) flags.push("Reddit Employee");
  if (user.is_suspended) flags.push("Suspended");

  if (flags.length > 0) {
    lines.push(`Status: ${flags.join(", ")}`);
  }

  if (user.icon_img) {
    lines.push(`Avatar: ${user.icon_img}`);
  }

  if (user.subreddit?.public_description) {
    lines.push(`Bio: ${user.subreddit.public_description}`);
  }

  return lines.join("\n");
}

export function formatMyProfile(me: RedditMe): string {
  const base = formatUserProfile(me);
  const extra: string[] = [
    "",
    `Inbox: ${me.inbox_count} unread`,
    `Has Mail: ${me.has_mail ? "Yes" : "No"}`,
    `Friends: ${me.num_friends}`,
  ];

  return base + extra.join("\n");
}
