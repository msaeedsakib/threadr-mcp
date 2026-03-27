#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { AuthManager } from "./auth/manager.js";
import { RateLimiter } from "./reddit/rate-limiter.js";
import { RedditClient } from "./reddit/client.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const auth = new AuthManager();
  const rateLimiter = new RateLimiter(auth.currentTier);
  const client = new RedditClient(auth, rateLimiter);
  const server = createServer(auth, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[threadr-mcp] Fatal error:", error);
  process.exit(1);
});
