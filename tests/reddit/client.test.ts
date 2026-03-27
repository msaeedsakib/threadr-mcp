import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { RedditClient } from "../../src/reddit/client.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier, ErrorCode } from "../../src/types/index.js";

const mockFetch = mock(() => Promise.resolve(new Response()));
let originalFetch: typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
  originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createMockResponse(data: object, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("RedditClient", () => {
  describe("URL construction", () => {
    test("uses oauth.reddit.com for authenticated tiers", async () => {
      const auth = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
      });
      // Mock getAccessToken to avoid real OAuth
      auth.getAccessToken = mock(() => Promise.resolve("mock_token"));
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({ data: "test" }));

      await client.request({ path: "/r/test/about" });

      const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
      expect(url).toStartWith("https://oauth.reddit.com/r/test/about");
    });

    test("uses www.reddit.com with .json for anonymous tier", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({ data: "test" }));

      await client.request({ path: "/r/test/about" });

      const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
      expect(url).toStartWith("https://www.reddit.com/r/test/about.json");
    });

    test("appends query params for GET requests", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({
        path: "/search",
        params: { q: "test query", sort: "new", limit: 25 },
      });

      const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
      expect(url).toContain("q=test+query");
      expect(url).toContain("sort=new");
      expect(url).toContain("limit=25");
    });

    test("filters undefined params", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({
        path: "/search",
        params: { q: "test", after: undefined },
      });

      const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
      expect(url).toContain("q=test");
      expect(url).not.toContain("after");
    });
  });

  describe("auth headers", () => {
    test("attaches Bearer token for authenticated tiers", async () => {
      const auth = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
      });
      auth.getAccessToken = mock(() => Promise.resolve("my_token_123"));
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({ path: "/r/test/about" });

      const headers = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer my_token_123");
    });

    test("no Authorization header for anonymous", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({ path: "/r/test/about" });

      const headers = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
      expect(headers["Authorization"]).toBeUndefined();
    });
  });

  describe("User-Agent", () => {
    test("includes User-Agent header", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({ path: "/r/test/about" });

      const headers = (mockFetch.mock.calls[0] as [string, RequestInit])[1].headers as Record<string, string>;
      expect(headers["User-Agent"]).toContain("threadr-mcp/");
    });
  });

  describe("429 retry", () => {
    test("retries on 429 with Retry-After header", async () => {
      const auth = new AuthManager({});
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const client = new RedditClient(auth, limiter);

      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: 429 }), {
            status: 429,
            headers: { "Content-Type": "application/json", "retry-after": "0.1" },
          })
        )
        .mockResolvedValueOnce(createMockResponse({ data: "success" }));

      const result = await client.request({ path: "/test" });
      expect(result.data).toEqual({ data: "success" });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 10000);
  });

  describe("POST requests", () => {
    test("sends form-encoded body for POST", async () => {
      const auth = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
        REDDIT_USERNAME: "user",
        REDDIT_PASSWORD: "pass",
      });
      auth.getAccessToken = mock(() => Promise.resolve("token"));
      const limiter = new RateLimiter(AuthTier.UserAuth);
      const client = new RedditClient(auth, limiter);

      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.request({
        method: "POST",
        path: "/api/submit",
        body: { sr: "test", title: "My Post", kind: "self" },
      });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(options.method).toBe("POST");
      expect(options.headers).toBeDefined();
      const headers = options.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      const body = options.body as string;
      expect(body).toContain("sr=test");
      expect(body).toContain("title=My+Post");
    });
  });

  describe("mapHttpError", () => {
    test("maps 401 to AUTH_FAILED", () => {
      expect(RedditClient.mapHttpError(401)).toBe(ErrorCode.AUTH_FAILED);
    });

    test("maps 403 private to SUBREDDIT_PRIVATE", () => {
      expect(RedditClient.mapHttpError(403, { reason: "private" })).toBe(ErrorCode.SUBREDDIT_PRIVATE);
    });

    test("maps 403 banned to SUBREDDIT_BANNED", () => {
      expect(RedditClient.mapHttpError(403, { reason: "banned" })).toBe(ErrorCode.SUBREDDIT_BANNED);
    });

    test("maps 404 to POST_NOT_FOUND", () => {
      expect(RedditClient.mapHttpError(404)).toBe(ErrorCode.POST_NOT_FOUND);
    });

    test("maps 429 to RATE_LIMITED", () => {
      expect(RedditClient.mapHttpError(429)).toBe(ErrorCode.RATE_LIMITED);
    });

    test("maps 500 to REDDIT_ERROR", () => {
      expect(RedditClient.mapHttpError(500)).toBe(ErrorCode.REDDIT_ERROR);
    });
  });
});
