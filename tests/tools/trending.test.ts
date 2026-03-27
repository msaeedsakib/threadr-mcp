import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getTrendingSubreddits } from "../../src/tools/trending.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockPopularSubreddits } from "../fixtures/reddit-responses.js";

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

describe("getTrendingSubreddits", () => {
  test("clamps limit to 1-50", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPopularSubreddits));

    await getTrendingSubreddits(client, auth, { limit: 100 });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("limit=50");
  });

  test("calls correct endpoint", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPopularSubreddits));

    await getTrendingSubreddits(client, auth, { limit: 10 });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/subreddits/popular");
  });

  test("returns formatted subreddit listing", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPopularSubreddits));

    const result = await getTrendingSubreddits(client, auth, { limit: 10 });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("[Metadata]");
    expect(text).toContain("results: 2");
    expect(text).toContain("[Results]");
    expect(text).toContain("r/testsubreddit");
    expect(text).toContain("r/programming");
  });
});
