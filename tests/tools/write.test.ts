import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { createPost, replyToPost, replyToComment, vote, editPost, editComment, deletePost, deleteComment } from "../../src/tools/write.js";
import { AuthManager } from "../../src/auth/manager.js";
import { RedditClient } from "../../src/reddit/client.js";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";
import { mockSubmitResponse, mockCommentResponse } from "../fixtures/reddit-responses.js";

const mockFetch = mock(() => Promise.resolve(new Response()));
let originalFetch: typeof fetch;

function setup(tier: AuthTier = AuthTier.UserAuth) {
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

describe("auth gating", () => {
  test("createPost returns AUTH_REQUIRED for Tier 1", async () => {
    const { auth, client } = setup(AuthTier.Anonymous);
    const result = await createPost(client, auth, {
      subreddit: "test", title: "Title", content: "Body", is_self: true, nsfw: false, spoiler: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  test("replyToPost returns AUTH_REQUIRED for Tier 2", async () => {
    const { auth, client } = setup(AuthTier.AppOnly);
    const result = await replyToPost(client, auth, { post_id: "abc", content: "text" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  test("vote returns AUTH_REQUIRED for Tier 1", async () => {
    const { auth, client } = setup(AuthTier.Anonymous);
    const result = await vote(client, auth, { target_id: "t3_abc", direction: "up" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });

  test("deletePost returns AUTH_REQUIRED for Tier 2", async () => {
    const { auth, client } = setup(AuthTier.AppOnly);
    const result = await deletePost(client, auth, { post_id: "abc" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_REQUIRED");
  });
});

describe("createPost", () => {
  test("validates title length", async () => {
    const { auth, client } = setup();
    const result = await createPost(client, auth, {
      subreddit: "test", title: "x".repeat(301), content: "Body", is_self: true, nsfw: false, spoiler: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("300 characters");
  });

  test("validates URL for link posts", async () => {
    const { auth, client } = setup();
    const result = await createPost(client, auth, {
      subreddit: "test", title: "Title", content: "not a url", is_self: false, nsfw: false, spoiler: false,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("valid URL");
  });

  test("creates post successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockSubmitResponse));

    const result = await createPost(client, auth, {
      subreddit: "r/test", title: "My Post", content: "Body text", is_self: true, nsfw: false, spoiler: false,
    });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Post created successfully");
    expect(result.content[0].text).toContain("t3_new123");

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    const body = options.body as string;
    expect(body).toContain("sr=test");
    expect(body).toContain("kind=self");
  });
});

describe("replyToPost", () => {
  test("validates content length", async () => {
    const { auth, client } = setup();
    const result = await replyToPost(client, auth, { post_id: "abc", content: "" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("1-10,000");
  });

  test("replies successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockCommentResponse));

    const result = await replyToPost(client, auth, { post_id: "t3_abc123", content: "My comment" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Comment posted successfully");
  });
});

describe("replyToComment", () => {
  test("replies to comment successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse(mockCommentResponse));

    const result = await replyToComment(client, auth, { comment_id: "t1_xyz", content: "My reply" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Reply posted successfully");
  });
});

describe("vote", () => {
  test("validates target_id prefix", async () => {
    const { auth, client } = setup();
    const result = await vote(client, auth, { target_id: "abc123", direction: "up" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("t3_ or t1_");
  });

  test("maps direction to correct dir value", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    await vote(client, auth, { target_id: "t3_abc", direction: "down" });

    const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string;
    expect(body).toContain("dir=-1");
  });

  test("records vote successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const result = await vote(client, auth, { target_id: "t3_abc", direction: "up" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Vote recorded: up on t3_abc");
  });
});

describe("editPost", () => {
  test("handles NOT_AUTHOR error on 403", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}, 403));

    const result = await editPost(client, auth, { post_id: "abc", content: "new body" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("NOT_AUTHOR");
  });

  test("edits post successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const result = await editPost(client, auth, { post_id: "abc123", content: "updated body" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("updated successfully");
  });
});

describe("editComment", () => {
  test("validates content length", async () => {
    const { auth, client } = setup();
    const result = await editComment(client, auth, { comment_id: "xyz", content: "x".repeat(10001) });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("1-10,000");
  });
});

describe("deletePost", () => {
  test("handles NOT_AUTHOR on 403", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}, 403));

    const result = await deletePost(client, auth, { post_id: "abc" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("NOT_AUTHOR");
  });

  test("deletes post successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const result = await deletePost(client, auth, { post_id: "abc123" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("deleted successfully");
  });
});

describe("deleteComment", () => {
  test("deletes comment successfully", async () => {
    const { auth, client } = setup();
    mockFetch.mockResolvedValueOnce(mockResponse({}));

    const result = await deleteComment(client, auth, { comment_id: "xyz789" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("deleted successfully");
  });
});
