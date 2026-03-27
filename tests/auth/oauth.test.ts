import { describe, expect, test, mock, beforeEach } from "bun:test";
import { OAuthClient } from "../../src/auth/oauth.js";
import { AuthTier } from "../../src/types/index.js";

const mockFetch = mock(() => Promise.resolve(new Response()));

beforeEach(() => {
  mockFetch.mockReset();
});

function createMockResponse(data: object, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OAuthClient", () => {
  describe("getUserAgent", () => {
    test("includes username for Tier 3", () => {
      const client = new OAuthClient(
        { clientId: "id", clientSecret: "secret", username: "testuser", password: "pass" },
        AuthTier.UserAuth,
        "1.2.3"
      );
      expect(client.getUserAgent()).toBe("threadr-mcp/1.2.3 (by /u/testuser)");
    });

    test("excludes username for Tier 2", () => {
      const client = new OAuthClient(
        { clientId: "id", clientSecret: "secret" },
        AuthTier.AppOnly,
        "1.0.0"
      );
      expect(client.getUserAgent()).toBe("threadr-mcp/1.0.0");
    });
  });

  describe("getAccessToken - client credentials grant", () => {
    test("acquires token with client credentials", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as typeof fetch;

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          access_token: "test_token_123",
          token_type: "bearer",
          expires_in: 3600,
          scope: "*",
        })
      );

      const client = new OAuthClient(
        { clientId: "my_client_id", clientSecret: "my_secret" },
        AuthTier.AppOnly
      );

      const token = await client.getAccessToken();
      expect(token).toBe("test_token_123");

      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://www.reddit.com/api/v1/access_token");
      expect(options.method).toBe("POST");
      expect(options.headers).toBeDefined();

      const headers = options.headers as Record<string, string>;
      const expectedAuth = btoa("my_client_id:my_secret");
      expect(headers["Authorization"]).toBe(`Basic ${expectedAuth}`);

      const body = options.body as string;
      expect(body).toContain("grant_type=client_credentials");

      globalThis.fetch = originalFetch;
    });
  });

  describe("getAccessToken - password grant", () => {
    test("acquires token with username and password", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as typeof fetch;

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          access_token: "user_token_456",
          token_type: "bearer",
          expires_in: 3600,
          scope: "*",
        })
      );

      const client = new OAuthClient(
        { clientId: "cid", clientSecret: "csecret", username: "user1", password: "pass1" },
        AuthTier.UserAuth
      );

      const token = await client.getAccessToken();
      expect(token).toBe("user_token_456");

      const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string;
      expect(body).toContain("grant_type=password");
      expect(body).toContain("username=user1");
      expect(body).toContain("password=pass1");

      globalThis.fetch = originalFetch;
    });
  });

  describe("token caching and refresh", () => {
    test("returns cached token on subsequent calls", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as typeof fetch;

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          access_token: "cached_token",
          token_type: "bearer",
          expires_in: 3600,
          scope: "*",
        })
      );

      const client = new OAuthClient(
        { clientId: "id", clientSecret: "secret" },
        AuthTier.AppOnly
      );

      const token1 = await client.getAccessToken();
      const token2 = await client.getAccessToken();

      expect(token1).toBe("cached_token");
      expect(token2).toBe("cached_token");
      expect(mockFetch).toHaveBeenCalledTimes(1);

      globalThis.fetch = originalFetch;
    });
  });

  describe("error handling", () => {
    test("throws on 401 response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as typeof fetch;

      mockFetch.mockResolvedValueOnce(
        new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
      );

      const client = new OAuthClient(
        { clientId: "bad_id", clientSecret: "bad_secret" },
        AuthTier.AppOnly
      );

      await expect(client.getAccessToken()).rejects.toThrow("OAuth token request failed: 401");

      globalThis.fetch = originalFetch;
    });

    test("throws on missing access_token in response", async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = mockFetch as typeof fetch;

      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: "invalid_grant" })
      );

      const client = new OAuthClient(
        { clientId: "id", clientSecret: "secret" },
        AuthTier.AppOnly
      );

      await expect(client.getAccessToken()).rejects.toThrow("OAuth response missing access_token");

      globalThis.fetch = originalFetch;
    });
  });
});
