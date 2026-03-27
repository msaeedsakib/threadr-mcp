import { describe, expect, test } from "bun:test";
import { formatSubredditInfo, formatSubredditListing } from "../../src/formatters/subreddit.js";
import { mockSubreddit, mockSubredditRules } from "../fixtures/reddit-responses.js";

describe("formatSubredditInfo", () => {
  test("renders all metadata fields", () => {
    const result = formatSubredditInfo(mockSubreddit);
    expect(result).toContain("Name: r/testsubreddit");
    expect(result).toContain("Title: Test Subreddit");
    expect(result).toContain("Description: A subreddit for testing purposes.");
    expect(result).toContain("Subscribers: 150.0k");
    expect(result).toContain("Active Users: 1.2k");
    expect(result).toContain("Created:");
    expect(result).toContain("Type: public");
    expect(result).toContain("Submission Type: any");
  });

  test("shows NSFW flag", () => {
    const nsfwSub = { ...mockSubreddit, over18: true };
    const result = formatSubredditInfo(nsfwSub);
    expect(result).toContain("NSFW");
  });

  test("shows quarantine flag", () => {
    const quarantinedSub = { ...mockSubreddit, quarantine: true };
    const result = formatSubredditInfo(quarantinedSub);
    expect(result).toContain("Quarantined");
  });

  test("renders rules list", () => {
    const result = formatSubredditInfo(mockSubreddit, mockSubredditRules);
    expect(result).toContain("Rules:");
    expect(result).toContain("Be respectful:");
    expect(result).toContain("No spam:");
  });

  test("renders flair list", () => {
    const flairs = {
      choices: [
        { flair_template_id: "f1", flair_text: "Discussion", flair_css_class: "" },
        { flair_template_id: "f2", flair_text: "Question", flair_css_class: "" },
      ],
    };
    const result = formatSubredditInfo(mockSubreddit, undefined, flairs);
    expect(result).toContain("Flairs:");
    expect(result).toContain("[f1] Discussion");
    expect(result).toContain("[f2] Question");
  });

  test("handles null active users", () => {
    const sub = { ...mockSubreddit, accounts_active: null };
    const result = formatSubredditInfo(sub);
    expect(result).not.toContain("Active Users:");
  });
});

describe("formatSubredditListing", () => {
  test("renders subreddit listing for trending", () => {
    const result = formatSubredditListing([mockSubreddit]);
    expect(result).toContain("r/testsubreddit");
    expect(result).toContain("Subscribers: 150.0k");
    expect(result).toContain("Description:");
  });

  test("separates entries with ---", () => {
    const subs = [
      mockSubreddit,
      { ...mockSubreddit, display_name: "programming", subscribers: 5000000 },
    ];
    const result = formatSubredditListing(subs);
    expect(result).toContain("---");
    expect(result).toContain("r/testsubreddit");
    expect(result).toContain("r/programming");
  });
});
