import { AuthTier } from "../types/index.js";
import type { OAuthTokenResponse } from "../reddit/types.js";

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  username?: string;
  password?: string;
}

export class OAuthClient {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private readonly credentials: OAuthCredentials;
  private readonly tier: AuthTier;
  private readonly version: string;

  constructor(credentials: OAuthCredentials, tier: AuthTier, version = "1.0.0") {
    this.credentials = credentials;
    this.tier = tier;
    this.version = version;
  }

  getUserAgent(): string {
    if (this.tier === AuthTier.UserAuth && this.credentials.username) {
      return `threadr-mcp/${this.version} (by /u/${this.credentials.username})`;
    }
    return `threadr-mcp/${this.version}`;
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - TOKEN_REFRESH_BUFFER_MS) {
      return this.accessToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
    const basicAuth = btoa(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`
    );

    const body = new URLSearchParams();

    if (this.tier === AuthTier.UserAuth && this.credentials.username && this.credentials.password) {
      body.set("grant_type", "password");
      body.set("username", this.credentials.username);
      body.set("password", this.credentials.password);
    } else {
      body.set("grant_type", "client_credentials");
    }

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.getUserAgent(),
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`OAuth token request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OAuthTokenResponse;

    if (!data.access_token) {
      throw new Error("OAuth response missing access_token");
    }

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }
}
