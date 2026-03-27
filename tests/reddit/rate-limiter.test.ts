import { describe, expect, test } from "bun:test";
import { RateLimiter } from "../../src/reddit/rate-limiter.js";
import { AuthTier } from "../../src/types/index.js";

describe("RateLimiter", () => {
  describe("per-tier configuration", () => {
    test("Tier 1 starts with 10 tokens", () => {
      const limiter = new RateLimiter(AuthTier.Anonymous);
      expect(limiter.availableTokens).toBe(10);
    });

    test("Tier 2 starts with 60 tokens", () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);
      expect(limiter.availableTokens).toBe(60);
    });

    test("Tier 3 starts with 60 tokens", () => {
      const limiter = new RateLimiter(AuthTier.UserAuth);
      expect(limiter.availableTokens).toBe(60);
    });
  });

  describe("token depletion", () => {
    test("tokens decrease on acquire", async () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const initial = limiter.availableTokens;

      await limiter.acquire();
      expect(limiter.availableTokens).toBe(initial - 1);

      await limiter.acquire();
      expect(limiter.availableTokens).toBe(initial - 2);
    });

    test("depletes all tokens with repeated acquire", async () => {
      const limiter = new RateLimiter(AuthTier.Anonymous);

      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.availableTokens).toBe(0);
    });
  });

  describe("adjustFromHeaders", () => {
    test("updates remaining count from headers", () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const headers = new Headers({
        "x-ratelimit-remaining": "45",
        "x-ratelimit-reset": "30",
      });

      limiter.adjustFromHeaders(headers);
      expect(limiter.availableTokens).toBe(45);
    });

    test("caps remaining to bucket size", () => {
      const limiter = new RateLimiter(AuthTier.Anonymous);
      const headers = new Headers({
        "x-ratelimit-remaining": "100",
      });

      limiter.adjustFromHeaders(headers);
      expect(limiter.availableTokens).toBe(10);
    });

    test("ignores invalid header values", () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const initial = limiter.availableTokens;
      const headers = new Headers({
        "x-ratelimit-remaining": "invalid",
      });

      limiter.adjustFromHeaders(headers);
      expect(limiter.availableTokens).toBe(initial);
    });

    test("handles missing headers gracefully", () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);
      const initial = limiter.availableTokens;
      const headers = new Headers();

      limiter.adjustFromHeaders(headers);
      expect(limiter.availableTokens).toBe(initial);
    });
  });

  describe("delay behavior", () => {
    test("acquire delays when bucket is empty", async () => {
      const limiter = new RateLimiter(AuthTier.AppOnly);

      // Drain all tokens
      for (let i = 0; i < 60; i++) {
        await limiter.acquire();
      }

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      // Should have waited at least ~1000ms for Tier 2 refill
      expect(elapsed).toBeGreaterThanOrEqual(900);
    }, 5000);
  });
});
