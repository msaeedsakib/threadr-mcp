import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  SearchPostsSchema,
  GetSubredditInfoSchema,
  GetSubredditPostsSchema,
  GetPostDetailSchema,
  GetUserProfileSchema,
  GetUserPostsSchema,
  GetUserCommentsSchema,
  GetTrendingSubredditsSchema,
  GetCommentThreadSchema,
  GetMyProfileSchema,
  CreatePostSchema,
  ReplyToPostSchema,
  ReplyToCommentSchema,
  VoteSchema,
  EditPostSchema,
  EditCommentSchema,
  DeletePostSchema,
  DeleteCommentSchema,
} from "./types/tools.js";
import { searchPosts } from "./tools/search.js";
import { getSubredditInfo, getSubredditPosts } from "./tools/subreddit.js";
import { getPostDetail } from "./tools/post.js";
import { getUserProfile, getUserPosts, getUserComments, getMyProfile } from "./tools/user.js";
import { getTrendingSubreddits } from "./tools/trending.js";
import { getCommentThread } from "./tools/comment.js";
import {
  createPost,
  replyToPost,
  replyToComment,
  vote,
  editPost,
  editComment,
  deletePost,
  deleteComment,
} from "./tools/write.js";
import type { RedditClient } from "./reddit/client.js";
import type { AuthManager } from "./auth/manager.js";

export function createServer(
  auth: AuthManager,
  client: RedditClient
): McpServer {
  const server = new McpServer({
    name: "threadr-mcp",
    version: "1.0.0",
  });

  // --- Read Tools ---

  server.registerTool("search_posts", {
    description: "Full-text search across Reddit or within a specific subreddit",
    inputSchema: SearchPostsSchema,
  }, async (params) => searchPosts(client, auth, params));

  server.registerTool("get_subreddit_info", {
    description: "Get subreddit metadata: subscribers, rules, description, flair",
    inputSchema: GetSubredditInfoSchema,
  }, async (params) => getSubredditInfo(client, auth, params));

  server.registerTool("get_subreddit_posts", {
    description: "Get posts from a subreddit with sort options (hot, new, top, rising, controversial)",
    inputSchema: GetSubredditPostsSchema,
  }, async (params) => getSubredditPosts(client, auth, params));

  server.registerTool("get_post_detail", {
    description: "Get full post with comment tree, configurable depth and sorting",
    inputSchema: GetPostDetailSchema,
  }, async (params) => getPostDetail(client, auth, params));

  server.registerTool("get_user_profile", {
    description: "Get a Reddit user's public profile: karma, account age, badges",
    inputSchema: GetUserProfileSchema,
  }, async (params) => getUserProfile(client, auth, params));

  server.registerTool("get_user_posts", {
    description: "Get a user's submission history",
    inputSchema: GetUserPostsSchema,
  }, async (params) => getUserPosts(client, auth, params));

  server.registerTool("get_user_comments", {
    description: "Get a user's comment history",
    inputSchema: GetUserCommentsSchema,
  }, async (params) => getUserComments(client, auth, params));

  server.registerTool("get_trending_subreddits", {
    description: "Get currently popular subreddits",
    inputSchema: GetTrendingSubredditsSchema,
  }, async (params) => getTrendingSubreddits(client, auth, params));

  server.registerTool("get_comment_thread", {
    description: "Get a single comment with parent chain and replies",
    inputSchema: GetCommentThreadSchema,
  }, async (params) => getCommentThread(client, auth, params));

  server.registerTool("get_my_profile", {
    description: "Get the authenticated user's own profile (requires user auth)",
    inputSchema: GetMyProfileSchema,
  }, async () => getMyProfile(client, auth));

  // --- Write Tools ---

  server.registerTool("create_post", {
    description: "Create a text or link post in a subreddit (requires user auth)",
    inputSchema: CreatePostSchema,
  }, async (params) => createPost(client, auth, params));

  server.registerTool("reply_to_post", {
    description: "Add a top-level comment to a post (requires user auth)",
    inputSchema: ReplyToPostSchema,
  }, async (params) => replyToPost(client, auth, params));

  server.registerTool("reply_to_comment", {
    description: "Reply to a comment (requires user auth)",
    inputSchema: ReplyToCommentSchema,
  }, async (params) => replyToComment(client, auth, params));

  server.registerTool("vote", {
    description: "Upvote, downvote, or unvote on a post or comment (requires user auth)",
    inputSchema: VoteSchema,
  }, async (params) => vote(client, auth, params));

  server.registerTool("edit_post", {
    description: "Edit your own post (requires user auth)",
    inputSchema: EditPostSchema,
  }, async (params) => editPost(client, auth, params));

  server.registerTool("edit_comment", {
    description: "Edit your own comment (requires user auth)",
    inputSchema: EditCommentSchema,
  }, async (params) => editComment(client, auth, params));

  server.registerTool("delete_post", {
    description: "Delete your own post (requires user auth)",
    inputSchema: DeletePostSchema,
  }, async (params) => deletePost(client, auth, params));

  server.registerTool("delete_comment", {
    description: "Delete your own comment (requires user auth)",
    inputSchema: DeleteCommentSchema,
  }, async (params) => deleteComment(client, auth, params));

  return server;
}
