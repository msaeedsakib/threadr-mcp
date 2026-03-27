import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getPostDetail, normalizePostId } from "../../src/tools/post.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockPostDetail } from "../fixtures/reddit-responses.js";

const mockFetch = mock(() => Promise.resolve(new Response()));
let originalFetch: typeof fetch;

function setup() {
  const auth = new AuthManager({});
  const limiter = new RateLimiter(AuthTier.Anonymous);
  const client = new RedditClient(auth, limiter);
  return { auth, client };
}

function mockResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("normalizePostId", () => {
  test("extracts ID from full URL", () => {
    expect(normalizePostId("https://www.reddit.com/r/test/comments/abc123/some_title/")).toBe("abc123");
  });

  test("extracts ID from permalink", () => {
    expect(normalizePostId("/r/test/comments/abc123/some_title/")).toBe("abc123");
  });

  test("strips t3_ prefix", () => {
    expect(normalizePostId("t3_abc123")).toBe("abc123");
  });

  test("returns bare ID as-is", () => {
    expect(normalizePostId("abc123")).toBe("abc123");
  });
});

describe("getPostDetail", () => {
  test("clamps comment_limit to 1-200", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getPostDetail(client, auth, {
      post_id: "abc123",
      comment_limit: 500,
      comment_depth: 3,
      comment_sort: "best",
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("limit=200");
  });

  test("clamps comment_depth to 1-10", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getPostDetail(client, auth, {
      post_id: "abc123",
      comment_limit: 25,
      comment_depth: 20,
      comment_sort: "best",
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("depth=10");
  });

  test("returns POST_NOT_FOUND on 404", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}, 404));

    const result = await getPostDetail(client, auth, {
      post_id: "nonexistent",
      comment_limit: 25,
      comment_depth: 3,
      comment_sort: "best",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("POST_NOT_FOUND");
  });

  test("returns formatted output with post and comment tree", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    const result = await getPostDetail(client, auth, {
      post_id: "abc123",
      comment_limit: 25,
      comment_depth: 3,
      comment_sort: "best",
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("[Post]");
    expect(text).toContain("[Comments]");
    expect(text).toContain("Test Post Title");
  });

  test("normalizes URL input to bare ID", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getPostDetail(client, auth, {
      post_id: "https://reddit.com/r/test/comments/abc123/title/",
      comment_limit: 25,
      comment_depth: 3,
      comment_sort: "best",
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/comments/abc123");
  });
});
