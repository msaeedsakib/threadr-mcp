import { AuthTier, ErrorCode } from "../types/index.js";
import type { AuthManager } from "../auth/manager.js";
import type { RateLimiter } from "./rate-limiter.js";

const OAUTH_BASE = "https://oauth.reddit.com";
const PUBLIC_BASE = "https://www.reddit.com";
const REQUEST_TIMEOUT_MS = 10_000;

export interface RedditRequestOptions {
  method?: "GET" | "POST";
  path: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, string>;
}

export interface RedditResponse<T = unknown> {
  data: T;
  status: number;
}

export class RedditClient {
  private readonly auth: AuthManager;
  private readonly rateLimiter: RateLimiter;

  constructor(auth: AuthManager, rateLimiter: RateLimiter) {
    this.auth = auth;
    this.rateLimiter = rateLimiter;
  }

  async request<T = unknown>(options: RedditRequestOptions): Promise<RedditResponse<T>> {
    await this.rateLimiter.acquire();

    const method = options.method ?? "GET";
    const isAuthenticated = this.auth.currentTier >= AuthTier.AppOnly;
    const baseUrl = isAuthenticated ? OAUTH_BASE : PUBLIC_BASE;

    let url: string;
    if (method === "GET") {
      const filteredParams: Record<string, string> = {};
      if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
          if (value !== undefined && value !== null) {
            filteredParams[key] = String(value);
          }
        }
      }
      const queryString = new URLSearchParams(filteredParams).toString();
      const path = isAuthenticated ? options.path : `${options.path}.json`;
      url = queryString ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
    } else {
      url = `${baseUrl}${options.path}`;
    }

    const headers: Record<string, string> = {
      "User-Agent": this.auth.getUserAgent(),
      "Accept": "application/json",
    };

    if (isAuthenticated) {
      const token = await this.auth.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    let fetchBody: string | undefined;
    if (method === "POST" && options.body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      fetchBody = new URLSearchParams(options.body).toString();
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response = await fetch(url, {
        method,
        headers,
        body: fetchBody,
        signal: controller.signal,
      });

      this.rateLimiter.adjustFromHeaders(response.headers);

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter ? parseFloat(retryAfter) * 1000 : 5000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));

        response = await fetch(url, {
          method,
          headers,
          body: fetchBody,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        this.rateLimiter.adjustFromHeaders(response.headers);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json")) {
        const text = await response.text();
        throw new Error(`Reddit returned non-JSON response (${response.status}): ${text.slice(0, 100)}`);
      }

      const data = (await response.json()) as T;

      return { data, status: response.status };
    } finally {
      clearTimeout(timeout);
    }
  }

  static mapHttpError(status: number, body?: { reason?: string }): ErrorCode {
    switch (status) {
      case 401:
        return ErrorCode.AUTH_FAILED;
      case 403:
        if (body?.reason === "private") return ErrorCode.SUBREDDIT_PRIVATE;
        if (body?.reason === "banned") return ErrorCode.SUBREDDIT_BANNED;
        return ErrorCode.SUBREDDIT_PRIVATE;
      case 404:
        return ErrorCode.POST_NOT_FOUND;
      case 429:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.REDDIT_ERROR;
    }
  }
}
