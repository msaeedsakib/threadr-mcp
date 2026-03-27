import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getCommentThread, normalizeCommentId } from "../../src/tools/comment.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockComment, mockPostDetail } from "../fixtures/reddit-responses.js";

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

describe("normalizeCommentId", () => {
  test("extracts from full URL", () => {
    const result = normalizeCommentId("https://reddit.com/r/test/comments/abc123/title/xyz789/");
    expect(result.postId).toBe("abc123");
    expect(result.commentId).toBe("xyz789");
  });

  test("strips t1_ prefix", () => {
    const result = normalizeCommentId("t1_xyz789");
    expect(result.commentId).toBe("xyz789");
    expect(result.postId).toBeUndefined();
  });

  test("returns bare ID", () => {
    const result = normalizeCommentId("xyz789");
    expect(result.commentId).toBe("xyz789");
    expect(result.postId).toBeUndefined();
  });
});

describe("getCommentThread", () => {
  test("clamps depth to 1-10", async () => {
    const { auth, client } = setup();
    // First call: /api/info to look up the comment
    mockFetch.mockResolvedValueOnce(mockResponse({
      kind: "Listing",
      data: {
        after: null,
        before: null,
        children: [{ kind: "t1", data: mockComment }],
        dist: 1,
      },
    }));
    // Second call: /comments/POST_ID with comment param
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getCommentThread(client, auth, {
      comment_id: "xyz789",
      depth: 20,
      context: 2,
    });

    // The second call should have depth=10
    const url = (mockFetch.mock.calls[1] as [string, RequestInit])[0];
    expect(url).toContain("depth=10");
  });

  test("clamps context to 0-8", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({
      kind: "Listing",
      data: {
        after: null,
        before: null,
        children: [{ kind: "t1", data: mockComment }],
        dist: 1,
      },
    }));
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getCommentThread(client, auth, {
      comment_id: "xyz789",
      depth: 5,
      context: 15,
    });

    const url = (mockFetch.mock.calls[1] as [string, RequestInit])[0];
    expect(url).toContain("context=8");
  });

  test("returns COMMENT_NOT_FOUND on 404", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({
      kind: "Listing",
      data: { after: null, before: null, children: [], dist: 0 },
    }, 200));

    const result = await getCommentThread(client, auth, {
      comment_id: "nonexistent",
      depth: 5,
      context: 2,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("COMMENT_NOT_FOUND");
  });

  test("uses postId from URL when available", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    await getCommentThread(client, auth, {
      comment_id: "https://reddit.com/r/test/comments/abc123/title/xyz789/",
      depth: 5,
      context: 2,
    });

    // Should only make 1 call (no info lookup needed)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/comments/abc123");
    expect(url).toContain("comment=xyz789");
  });

  test("returns formatted comment thread", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({
      kind: "Listing",
      data: {
        after: null,
        before: null,
        children: [{ kind: "t1", data: mockComment }],
        dist: 1,
      },
    }));
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostDetail));

    const result = await getCommentThread(client, auth, {
      comment_id: "xyz789",
      depth: 5,
      context: 2,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("[Metadata]");
    expect(result.content[0].text).toContain("[Results]");
  });
});
