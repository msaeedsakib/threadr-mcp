import { AuthTier } from "../types/index.js";

export interface RateLimiterConfig {
  bucketSize: number;
  refillRateMs: number;
}

const TIER_CONFIGS: Record<AuthTier, RateLimiterConfig> = {
  [AuthTier.Anonymous]: { bucketSize: 10, refillRateMs: 6000 },
  [AuthTier.AppOnly]: { bucketSize: 60, refillRateMs: 1000 },
  [AuthTier.UserAuth]: { bucketSize: 60, refillRateMs: 1000 },
};

export class RateLimiter {
  private tokens: number;
  private readonly bucketSize: number;
  private readonly refillRateMs: number;
  private lastRefill: number;

  constructor(tier: AuthTier) {
    const config = TIER_CONFIGS[tier];
    this.bucketSize = config.bucketSize;
    this.refillRateMs = config.refillRateMs;
    this.tokens = this.bucketSize;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitMs = this.refillRateMs;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    this.refill();
    this.tokens -= 1;
  }

  adjustFromHeaders(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining !== null) {
      const parsed = parseFloat(remaining);
      if (!isNaN(parsed)) {
        this.tokens = Math.min(Math.floor(parsed), this.bucketSize);
        this.lastRefill = Date.now();
      }
    }

    if (reset !== null) {
      const resetSeconds = parseFloat(reset);
      if (!isNaN(resetSeconds) && resetSeconds > 0) {
        this.lastRefill = Date.now();
      }
    }
  }

  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillRateMs);

    if (newTokens > 0) {
      this.tokens = Math.min(this.tokens + newTokens, this.bucketSize);
      this.lastRefill = now;
    }
  }
}
