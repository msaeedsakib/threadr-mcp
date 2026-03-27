import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { getUserProfile, getUserPosts, getUserComments, getMyProfile } from "../../src/tools/user.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockUser, mockMe, mockPostListing, mockUserCommentListing } from "../fixtures/reddit-responses.js";

const mockFetch = mock(() => Promise.resolve(new Response()));
let originalFetch: typeof fetch;

function setup(tier: AuthTier = AuthTier.Anonymous) {
  const envVars: Record<string, string> = {};
  if (tier >= AuthTier.AppOnly) {
    envVars.REDDIT_CLIENT_ID = "id";
    envVars.REDDIT_CLIENT_SECRET = "secret";
  }
  if (tier >= AuthTier.UserAuth) {
    envVars.REDDIT_USERNAME = "user";
    envVars.REDDIT_PASSWORD = "pass";
  }
  const auth = new AuthManager(envVars);
  if (auth.oauthClient) {
    auth.getAccessToken = mock(() => Promise.resolve("mock_token"));
  }
  const limiter = new RateLimiter(tier);
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

describe("getUserProfile", () => {
  test("strips u/ prefix", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({ data: mockUser }));

    await getUserProfile(client, auth, { username: "u/testuser" });

    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain("/user/testuser/about");
  });

  test("returns USER_NOT_FOUND on 404", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}, 404));

    const result = await getUserProfile(client, auth, { username: "nonexistent" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("USER_NOT_FOUND");
  });

  test("returns formatted profile", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({ data: mockUser }));

    const result = await getUserProfile(client, auth, { username: "testuser" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("u/testuser");
  });
});

describe("getUserPosts", () => {
  test("includes pagination in response", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockPostListing));

    const result = await getUserPosts(client, auth, {
      username: "testuser",
      sort: "new",
      time_filter: "all",
      limit: 25,
    });

    expect(result.content[0].text).toContain("has_more: true");
    expect(result.content[0].text).toContain("next_cursor: t3_nextpage");
  });
});

describe("getUserComments", () => {
  test("returns formatted comment listing", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockUserCommentListing));

    const result = await getUserComments(client, auth, {
      username: "testuser",
      sort: "new",
      time_filter: "all",
      limit: 25,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("[Results]");
  });
});

describe("getMyProfile", () => {
  test("returns AUTH_REQUIRED for Tier 1", async () => {
    const { auth, client } = setup(AuthTier.Anonymous);

    const result = await getMyProfile(client, auth);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  test("returns AUTH_REQUIRED for Tier 2", async () => {
    const { auth, client } = setup(AuthTier.AppOnly);

    const result = await getMyProfile(client, auth);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  test("returns profile for Tier 3", async () => {
    const { auth, client } = setup(AuthTier.UserAuth);
    mockFetch.mockResolvedValueOnce(mockResponse(mockMe));

    const result = await getMyProfile(client, auth);
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("u/testuser");
    expect(result.content[0].text).toContain("Inbox:");
  });
});
