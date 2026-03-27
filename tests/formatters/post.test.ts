import { describe, expect, test } from "bun:test";
import { formatPost, formatPostListing, formatRelativeTime, formatScore } from "../../src/formatters/post.js";
import { mockPost } from "../fixtures/reddit-responses.js";

describe("formatScore", () => {
  test("formats numbers under 1000 as-is", () => {
    expect(formatScore(42)).toBe("42");
    expect(formatScore(999)).toBe("999");
  });

  test("formats thousands with k suffix", () => {
    expect(formatScore(1234)).toBe("1.2k");
    expect(formatScore(45300)).toBe("45.3k");
  });

  test("formats millions with M suffix", () => {
    expect(formatScore(1500000)).toBe("1.5M");
  });
});

describe("formatRelativeTime", () => {
  test("returns 'just now' for recent timestamps", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 30)).toBe("just now");
  });

  test("returns minutes for timestamps under an hour", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 300)).toBe("5 minutes ago");
  });

  test("returns hours for timestamps under a day", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 7200)).toBe("2 hours ago");
  });

  test("returns days for timestamps under a month", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 259200)).toBe("3 days ago");
  });
});

describe("formatPost", () => {
  test("includes all required field labels", () => {
    const result = formatPost(mockPost);
    expect(result).toContain("Title: Test Post Title");
    expect(result).toContain("Author: testauthor");
    expect(result).toContain("Subreddit: r/testsubreddit");
    expect(result).toContain("Score:");
    expect(result).toContain("Comments: 89");
    expect(result).toContain("Created:");
    expect(result).toContain("URL:");
    expect(result).toContain("Body:");
  });

  test("shows flair when present", () => {
    const result = formatPost(mockPost);
    expect(result).toContain("Flair: Discussion");
  });

  test("shows NSFW flag when set", () => {
    const nsfwPost = { ...mockPost, over_18: true };
    const result = formatPost(nsfwPost);
    expect(result).toContain("NSFW");
  });

  test("shows awards count", () => {
    const result = formatPost(mockPost);
    expect(result).toContain("Awards: 2");
  });

  test("shows deleted author as [deleted]", () => {
    const deletedPost = { ...mockPost, author: "[deleted]" };
    const result = formatPost(deletedPost);
    expect(result).toContain("Author: [deleted]");
  });

  test("includes ISO timestamp in parentheses", () => {
    const result = formatPost(mockPost);
    expect(result).toMatch(/\(\d{4}-\d{2}-\d{2}T/);
  });
});

describe("formatPostListing", () => {
  test("separates posts with ---", () => {
    const posts = [mockPost, { ...mockPost, id: "def", title: "Second" }];
    const result = formatPostListing(posts);
    expect(result).toContain("---");
  });

  test("truncates selftext at 500 chars", () => {
    const longPost = { ...mockPost, selftext: "x".repeat(600) };
    const result = formatPostListing([longPost]);
    expect(result).toContain("[truncated]");
    expect(result).not.toContain("x".repeat(600));
  });

  test("does not truncate short selftext", () => {
    const result = formatPostListing([mockPost]);
    expect(result).not.toContain("[truncated]");
  });

  test("uses score shorthand", () => {
    const result = formatPostListing([mockPost]);
    expect(result).toContain("1.2k");
  });
});
