import { describe, expect, test } from "bun:test";
import { AuthManager } from "../../src/auth/manager.js";
import { AuthTier } from "../../src/types/index.js";

describe("AuthManager", () => {
  describe("tier detection", () => {
    test("detects Tier 3 with all four env vars", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
        REDDIT_USERNAME: "user",
        REDDIT_PASSWORD: "pass",
      });
      expect(manager.currentTier).toBe(AuthTier.UserAuth);
      expect(manager.oauthClient).not.toBeNull();
    });

    test("detects Tier 2 with only client_id and secret", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
      });
      expect(manager.currentTier).toBe(AuthTier.AppOnly);
      expect(manager.oauthClient).not.toBeNull();
    });

    test("detects Tier 1 with no env vars", () => {
      const manager = new AuthManager({});
      expect(manager.currentTier).toBe(AuthTier.Anonymous);
      expect(manager.oauthClient).toBeNull();
    });

    test("detects Tier 1 when only client_id is set", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
      });
      expect(manager.currentTier).toBe(AuthTier.Anonymous);
    });

    test("ignores whitespace-only env vars", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "  ",
        REDDIT_CLIENT_SECRET: "  ",
      });
      expect(manager.currentTier).toBe(AuthTier.Anonymous);
    });

    test("detects Tier 2 when username set without password", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
        REDDIT_USERNAME: "user",
      });
      expect(manager.currentTier).toBe(AuthTier.AppOnly);
    });
  });

  describe("requireTier", () => {
    test("returns null when tier is sufficient", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
        REDDIT_USERNAME: "user",
        REDDIT_PASSWORD: "pass",
      });
      expect(manager.requireTier(AuthTier.Anonymous)).toBeNull();
      expect(manager.requireTier(AuthTier.AppOnly)).toBeNull();
      expect(manager.requireTier(AuthTier.UserAuth)).toBeNull();
    });

    test("returns error when tier is insufficient", () => {
      const manager = new AuthManager({});
      const result = manager.requireTier(AuthTier.UserAuth);
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain("AUTH_REQUIRED");
      expect(result!.content[0].text).toContain("Tier 3");
    });

    test("includes missing env var names in recovery hint", () => {
      const manager = new AuthManager({});
      const result = manager.requireTier(AuthTier.AppOnly);
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toContain("REDDIT_CLIENT_ID");
      expect(result!.content[0].text).toContain("REDDIT_CLIENT_SECRET");
    });

    test("Tier 2 manager fails requireTier(3)", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
      });
      const result = manager.requireTier(AuthTier.UserAuth);
      expect(result).not.toBeNull();
      expect(result!.isError).toBe(true);
      expect(result!.content[0].text).toContain("Tier 3");
    });
  });

  describe("getUserAgent", () => {
    test("returns user agent with username for Tier 3", () => {
      const manager = new AuthManager({
        REDDIT_CLIENT_ID: "id",
        REDDIT_CLIENT_SECRET: "secret",
        REDDIT_USERNAME: "testuser",
        REDDIT_PASSWORD: "pass",
      });
      expect(manager.getUserAgent()).toContain("threadr-mcp/");
      expect(manager.getUserAgent()).toContain("testuser");
    });

    test("returns user agent without username for Tier 1", () => {
      const manager = new AuthManager({});
      expect(manager.getUserAgent()).toBe("threadr-mcp/1.0.0");
    });
  });

  describe("getAccessToken", () => {
    test("returns null for anonymous tier", async () => {
      const manager = new AuthManager({});
      const token = await manager.getAccessToken();
      expect(token).toBeNull();
    });
  });
});
