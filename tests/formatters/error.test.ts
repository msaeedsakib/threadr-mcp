import { describe, expect, test } from "bun:test";
import { formatError } from "../../src/formatters/error.js";
import { ErrorCode } from "../../src/types/index.js";

describe("formatError", () => {
  test("returns structured error with all fields", () => {
    const result = formatError(
      ErrorCode.AUTH_REQUIRED,
      "This tool requires Tier 3 authentication",
      "Set REDDIT_USERNAME and REDDIT_PASSWORD environment variables"
    );

    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");

    const text = result.content[0].text;
    expect(text).toContain("[Error]");
    expect(text).toContain("code: AUTH_REQUIRED");
    expect(text).toContain("message: This tool requires Tier 3 authentication");
    expect(text).toContain("recovery_hint: Set REDDIT_USERNAME and REDDIT_PASSWORD");
  });

  test("omits recovery_hint when not provided", () => {
    const result = formatError(
      ErrorCode.REDDIT_ERROR,
      "Reddit API returned 500"
    );

    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain("[Error]");
    expect(text).toContain("code: REDDIT_ERROR");
    expect(text).toContain("message: Reddit API returned 500");
    expect(text).not.toContain("recovery_hint:");
  });

  test("handles all error codes", () => {
    for (const code of Object.values(ErrorCode)) {
      const result = formatError(code, `Test message for ${code}`, "Test hint");
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain(`code: ${code}`);
    }
  });

  test("formats SUBREDDIT_NOT_FOUND error", () => {
    const result = formatError(
      ErrorCode.SUBREDDIT_NOT_FOUND,
      "Subreddit 'nonexistent' does not exist",
      "Check the subreddit name spelling"
    );

    const text = result.content[0].text;
    expect(text).toContain("code: SUBREDDIT_NOT_FOUND");
    expect(text).toContain("recovery_hint: Check the subreddit name spelling");
  });

  test("formats RATE_LIMITED error", () => {
    const result = formatError(
      ErrorCode.RATE_LIMITED,
      "Reddit API rate limit exceeded",
      "Try again in 30 seconds"
    );

    const text = result.content[0].text;
    expect(text).toContain("code: RATE_LIMITED");
    expect(text).toContain("recovery_hint: Try again in 30 seconds");
  });

  test("formats INVALID_INPUT error", () => {
    const result = formatError(
      ErrorCode.INVALID_INPUT,
      "Parameter 'query' is required and cannot be empty"
    );

    const text = result.content[0].text;
    expect(text).toContain("code: INVALID_INPUT");
    expect(text).toContain("message: Parameter 'query' is required");
  });

  test("content array has exactly one text entry", () => {
    const result = formatError(ErrorCode.POST_NOT_FOUND, "Not found", "Check ID");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      type: "text",
      text: expect.stringContaining("[Error]"),
    });
  });
});
