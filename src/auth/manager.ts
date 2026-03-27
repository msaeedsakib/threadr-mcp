import { AuthTier, ErrorCode } from "../types/index.js";
import { formatError } from "../formatters/error.js";
import { OAuthClient } from "./oauth.js";
import type { ToolResponse } from "../types/index.js";

export class AuthManager {
  readonly currentTier: AuthTier;
  readonly oauthClient: OAuthClient | null;

  constructor(env: Record<string, string | undefined> = process.env) {
    const clientId = env.REDDIT_CLIENT_ID?.trim();
    const clientSecret = env.REDDIT_CLIENT_SECRET?.trim();
    const username = env.REDDIT_USERNAME?.trim();
    const password = env.REDDIT_PASSWORD?.trim();

    if (clientId && clientSecret && username && password) {
      this.currentTier = AuthTier.UserAuth;
      this.oauthClient = new OAuthClient(
        { clientId, clientSecret, username, password },
        AuthTier.UserAuth
      );
    } else if (clientId && clientSecret) {
      this.currentTier = AuthTier.AppOnly;
      this.oauthClient = new OAuthClient(
        { clientId, clientSecret },
        AuthTier.AppOnly
      );
    } else {
      this.currentTier = AuthTier.Anonymous;
      this.oauthClient = null;
    }

    console.error(`[threadr-mcp] Auth tier ${this.currentTier} activated`);
  }

  requireTier(tier: AuthTier): ToolResponse | null {
    if (this.currentTier >= tier) {
      return null;
    }

    const missing: string[] = [];
    if (tier >= AuthTier.AppOnly) {
      if (!process.env.REDDIT_CLIENT_ID) missing.push("REDDIT_CLIENT_ID");
      if (!process.env.REDDIT_CLIENT_SECRET) missing.push("REDDIT_CLIENT_SECRET");
    }
    if (tier >= AuthTier.UserAuth) {
      if (!process.env.REDDIT_USERNAME) missing.push("REDDIT_USERNAME");
      if (!process.env.REDDIT_PASSWORD) missing.push("REDDIT_PASSWORD");
    }

    return formatError(
      ErrorCode.AUTH_REQUIRED,
      `This tool requires Tier ${tier} authentication`,
      `Set the following environment variables: ${missing.join(", ")}`
    );
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.oauthClient) {
      return null;
    }
    return this.oauthClient.getAccessToken();
  }

  getUserAgent(): string {
    if (this.oauthClient) {
      return this.oauthClient.getUserAgent();
    }
    return "threadr-mcp/1.0.0";
  }
}
