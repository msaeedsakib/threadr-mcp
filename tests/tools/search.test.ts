import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { searchPosts, stripSubredditPrefix } from "../../src/tools/search.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockPostListing } from "../fixtures/reddit-responses.js";

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

describe("stripSubredditPrefix", () => {
  test("strips r/ prefix", () => {
    expect(stripSubredditPrefix("r/programming")).toBe("programming");
  });

  test("passes through names without prefix", () => {
    expect(stripSubredditPrefix("programming")).toBe("programming");
  });
});

describe("searchPosts", () => {
  test("returns error for empty query", async () => {
    const { auth, client } = setup();
    const result = await searchPosts(client, auth, {
      query: "  ",
      sort: "relevance",
      time_filter: "all",
      limit: 25,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("INVALID_INPUT");
  });

  test("calls correct Reddit endpoint", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    await searchPosts(client, auth, {
      query: "typescript",
      sort: "relevance",
      time_filter: "all",
      limit: 25,
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/search");
    expect(url).toContain("q=typescript");
  });

  test("scopes to subreddit with r/ prefix stripped", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    await searchPosts(client, auth, {
      query: "test",
      subreddit: "r/programming",
      sort: "new",
      time_filter: "week",
      limit: 10,
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/r/programming/search");
    expect(url).toContain("restrict_sr=true");
  });

  test("clamps limit to valid range", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    await searchPosts(client, auth, {
      query: "test",
      sort: "relevance",
      time_filter: "all",
      limit: 500,
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("limit=100");
  });

  test("passes pagination cursor", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    await searchPosts(client, auth, {
      query: "test",
      sort: "relevance",
      time_filter: "all",
      limit: 25,
      after: "t3_abc123",
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("after=t3_abc123");
  });

  test("returns formatted output with metadata", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    const result = await searchPosts(client, auth, {
      query: "test",
      sort: "relevance",
      time_filter: "all",
      limit: 25,
    });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("[Metadata]");
    expect(text).toContain("results: 2");
    expect(text).toContain("has_more: true");
    expect(text).toContain("next_cursor: t3_nextpage");
    expect(text).toContain("[Results]");
    expect(text).toContain("Test Post Title");
  });
});
