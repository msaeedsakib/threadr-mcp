import { describe, expect, test } from "bun:test";
import { formatCommentTree, formatCommentListing } from "../../src/formatters/comment.js";
import { mockComment, mockNestedComment, mockMore } from "../fixtures/reddit-responses.js";
import type { RedditComment, RedditMore } from "../../src/reddit/types.js";

describe("formatCommentTree", () => {
  test("renders top-level comment without indentation prefix", () => {
    const result = formatCommentTree([{ kind: "t1", data: mockComment }]);
    expect(result).toContain("[commenter1]");
    expect(result).toContain("This is a test comment.");
    expect(result).not.toStartWith("| ");
  });

  test("renders nested comment with indentation", () => {
    const result = formatCommentTree([{ kind: "t1", data: mockNestedComment }]);
    expect(result).toContain("| [replier1]");
    expect(result).toContain("| This is a reply.");
  });

  test("shows [N more replies] for more objects", () => {
    const result = formatCommentTree([{ kind: "more", data: mockMore }]);
    expect(result).toContain("[5 more replies]");
  });

  test("shows is_op flag", () => {
    const opComment: RedditComment = { ...mockComment, is_submitter: true };
    const result = formatCommentTree([{ kind: "t1", data: opComment }]);
    expect(result).toContain("[OP]");
  });

  test("truncates body at 2000 chars", () => {
    const longComment: RedditComment = { ...mockComment, body: "x".repeat(2500) };
    const result = formatCommentTree([{ kind: "t1", data: longComment }]);
    expect(result).toContain("[truncated]");
  });

  test("shows deleted/removed content as-is", () => {
    const deletedComment: RedditComment = { ...mockComment, author: "[deleted]", body: "[removed]" };
    const result = formatCommentTree([{ kind: "t1", data: deletedComment }]);
    expect(result).toContain("[deleted]");
    expect(result).toContain("[removed]");
  });

  test("renders nested replies from Listing", () => {
    const commentWithReplies: RedditComment = {
      ...mockComment,
      replies: {
        kind: "Listing" as const,
        data: {
          after: null,
          before: null,
          children: [{ kind: "t1", data: mockNestedComment }],
          dist: null,
        },
      },
    };
    const result = formatCommentTree([{ kind: "t1", data: commentWithReplies }]);
    expect(result).toContain("[commenter1]");
    expect(result).toContain("| [replier1]");
  });

  test("skips more objects with count 0", () => {
    const emptyMore: RedditMore = { ...mockMore, count: 0 };
    const result = formatCommentTree([{ kind: "more", data: emptyMore }]);
    expect(result).toBe("");
  });
});

describe("formatCommentListing", () => {
  test("formats flat comment list with subreddit and post info", () => {
    const result = formatCommentListing([mockComment]);
    expect(result).toContain("[commenter1]");
    expect(result).toContain("Subreddit: r/testsubreddit");
    expect(result).toContain("Post: Test Post Title");
    expect(result).toContain("Body: This is a test comment.");
    expect(result).toContain("Permalink:");
  });

  test("separates multiple comments with ---", () => {
    const result = formatCommentListing([
      mockComment,
      { ...mockComment, id: "comm2", body: "Second comment" },
    ]);
    expect(result).toContain("---");
  });
});
