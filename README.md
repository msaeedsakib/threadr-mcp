# threadr-mcp

A Model Context Protocol (MCP) server that gives AI agents full access to Reddit search, browse, read, post, comment, vote, edit, and delete. Works with Claude Code, Claude Desktop, VS Code, Cursor, and any MCP-compatible client.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Quick Start

**No Reddit API keys required.** Anonymous access works out of the box with basic rate limits.

### Claude Code

```bash
claude mcp add threadr-mcp -- npx -y threadr-mcp
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "threadr-mcp": {
      "command": "npx",
      "args": ["-y", "threadr-mcp"]
    }
  }
}
```

### VS Code / Cursor

Add to your MCP settings:

```json
{
  "threadr-mcp": {
    "command": "npx",
    "args": ["-y", "threadr-mcp"]
  }
}
```

## Authentication

Threadr supports three tiers of access. Higher tiers unlock more features and higher rate limits.

### Tier 1: Anonymous (default)

No configuration needed. All read tools work immediately. Rate limited to ~10 requests/minute.

### Tier 2: App-Only

Higher rate limits (~60 req/min), access to NSFW content. Read-only.

1. Go to [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
2. Create a new app (select **script** type)
3. Note the **client ID** (under the app name) and **client secret**

```json
{
  "mcpServers": {
    "threadr-mcp": {
      "command": "npx",
      "args": ["-y", "threadr-mcp"],
      "env": {
        "REDDIT_CLIENT_ID": "your_client_id",
        "REDDIT_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

### Tier 3: User Auth

Full access including write operations (post, comment, vote, edit, delete).

```json
{
  "mcpServers": {
    "threadr-mcp": {
      "command": "npx",
      "args": ["-y", "threadr-mcp"],
      "env": {
        "REDDIT_CLIENT_ID": "your_client_id",
        "REDDIT_CLIENT_SECRET": "your_client_secret",
        "REDDIT_USERNAME": "your_username",
        "REDDIT_PASSWORD": "your_password"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Tier | Description |
|---|---|---|---|
| `REDDIT_CLIENT_ID` | Tier 2+ | 2, 3 | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Tier 2+ | 2, 3 | Reddit app client secret |
| `REDDIT_USERNAME` | Tier 3 | 3 | Reddit account username |
| `REDDIT_PASSWORD` | Tier 3 | 3 | Reddit account password |

## Tools

### Read Tools (all tiers)

| Tool | Description | Key Parameters |
|---|---|---|
| `search_posts` | Full-text search across Reddit or within a subreddit | `query`, `subreddit?`, `sort`, `time_filter`, `limit`, `after` |
| `get_subreddit_info` | Subreddit metadata: subscribers, rules, description, flair | `subreddit` |
| `get_subreddit_posts` | Posts from a subreddit with sort options | `subreddit`, `sort` (hot/new/top/rising/controversial), `limit`, `after` |
| `get_post_detail` | Full post with comment tree, configurable depth | `post_id`, `comment_limit`, `comment_depth`, `comment_sort` |
| `get_user_profile` | User profile: karma, account age, badges | `username` |
| `get_user_posts` | User's submission history | `username`, `sort`, `time_filter`, `limit`, `after` |
| `get_user_comments` | User's comment history | `username`, `sort`, `time_filter`, `limit`, `after` |
| `get_trending_subreddits` | Currently popular subreddits | `limit` |
| `get_comment_thread` | Single comment with parent chain and replies | `comment_id`, `depth`, `context` |
| `get_my_profile` | Authenticated user's own profile (Tier 3) | — |

### Write Tools (Tier 3 only)

| Tool | Description | Key Parameters |
|---|---|---|
| `create_post` | Create a text or link post | `subreddit`, `title`, `content`, `is_self?`, `flair_id?`, `nsfw?`, `spoiler?` |
| `reply_to_post` | Add a top-level comment to a post | `post_id`, `content` |
| `reply_to_comment` | Reply to a comment | `comment_id`, `content` |
| `vote` | Upvote, downvote, or unvote | `target_id`, `direction` (up/down/unvote) |
| `edit_post` | Edit your own post | `post_id`, `content` |
| `edit_comment` | Edit your own comment | `comment_id`, `content` |
| `delete_post` | Delete your own post | `post_id` |
| `delete_comment` | Delete your own comment | `comment_id` |

## Pagination

Listing tools support cursor-based pagination. Responses include `next_cursor` when more results are available. Pass it as the `after` parameter to get the next page.

## Rate Limiting

Threadr includes a built-in rate limiter that respects Reddit's API limits:

- **Tier 1 (anonymous):** 10 requests/minute
- **Tier 2/3 (authenticated):** 60 requests/minute

Requests are queued when the limit is reached, not rejected.

## Development

```bash
git clone https://github.com/msaeedsakib/threadr-mcp.git
cd threadr-mcp
bun install
bun run build
bun test
```

## License

MIT
