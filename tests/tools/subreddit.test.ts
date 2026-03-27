import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getSubredditInfo, getSubredditPosts } from "../../src/tools/subreddit.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockSubreddit, mockSubredditRules, mockPostListing } from "../fixtures/reddit-responses.js";

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

describe("getSubredditInfo", () => {
  test("strips r/ prefix", async () => {
    const { auth, client } = setup();
    mockFetch
      .mockResolvedValueOnce(mockResponse({ data: mockSubreddit }))
      .mockResolvedValueOnce(mockResponse(mockSubredditRules));

    await getSubredditInfo(client, auth, { subreddit: "r/testsubreddit" });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/r/testsubreddit/about");
  });

  test("returns SUBREDDIT_NOT_FOUND on 404", async () => {
    const { auth, client } = setup();
    mockFetch
      .mockResolvedValueOnce(mockResponse({}, 404))
      .mockResolvedValueOnce(mockResponse({}));

    const result = await getSubredditInfo(client, auth, { subreddit: "nonexistent" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("SUBREDDIT_NOT_FOUND");
  });

  test("returns SUBREDDIT_PRIVATE on 403", async () => {
    const { auth, client } = setup();
    mockFetch
      .mockResolvedValueOnce(mockResponse({}, 403))
      .mockResolvedValueOnce(mockResponse({}));

    const result = await getSubredditInfo(client, auth, { subreddit: "private_sub" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("SUBREDDIT_PRIVATE");
  });

  test("returns formatted output", async () => {
    const { auth, client } = setup();
    mockFetch
      .mockResolvedValueOnce(mockResponse({ data: mockSubreddit }))
      .mockResolvedValueOnce(mockResponse(mockSubredditRules));

    const result = await getSubredditInfo(client, auth, { subreddit: "testsubreddit" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("r/testsubreddit");
    expect(result.content[0].text).toContain("[Metadata]");
  });
});

describe("getSubredditPosts", () => {
  test("passes sort and time_filter params", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    await getSubredditPosts(client, auth, {
      subreddit: "programming",
      sort: "top",
      time_filter: "week",
      limit: 10,
    });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/r/programming/top");
    expect(url).toContain("t=week");
    expect(url).toContain("limit=10");
  });

  test("includes pagination cursor in output", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    const result = await getSubredditPosts(client, auth, {
      subreddit: "test",
      sort: "hot",
      time_filter: "day",
      limit: 25,
    });

    expect(result.content[0].text).toContain("next_cursor: t3_nextpage");
    expect(result.content[0].text).toContain("has_more: true");
  });

  test("returns formatted post listing", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    const result = await getSubredditPosts(client, auth, {
      subreddit: "test",
      sort: "hot",
      time_filter: "day",
      limit: 25,
    });

    expect(result.content[0].text).toContain("[Results]");
    expect(result.content[0].text).toContain("Test Post Title");
  });
});
