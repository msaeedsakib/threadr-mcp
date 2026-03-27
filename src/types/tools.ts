import { z } from "zod";

// --- Read Tool Schemas ---

export const SearchPostsSchema = z.object({
  query: z.string().min(1, "Query is required"),
  subreddit: z.string().optional(),
  sort: z.enum(["relevance", "hot", "top", "new", "comments"]).default("relevance"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).default("all"),
  limit: z.number().min(1).max(100).default(25),
  after: z.string().optional(),
});

export const GetSubredditInfoSchema = z.object({
  subreddit: z.string().min(1, "Subreddit name is required"),
});

export const GetSubredditPostsSchema = z.object({
  subreddit: z.string().min(1, "Subreddit name is required"),
  sort: z.enum(["hot", "new", "top", "rising", "controversial"]).default("hot"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).default("day"),
  limit: z.number().min(1).max(100).default(25),
  after: z.string().optional(),
});

export const GetPostDetailSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
  comment_limit: z.number().min(1).max(200).default(25),
  comment_depth: z.number().min(1).max(10).default(3),
  comment_sort: z.enum(["best", "top", "new", "controversial", "old", "qa"]).default("best"),
});

export const GetUserProfileSchema = z.object({
  username: z.string().min(1, "Username is required"),
});

export const GetUserPostsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  sort: z.enum(["new", "hot", "top", "controversial"]).default("new"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).default("all"),
  limit: z.number().min(1).max(100).default(25),
  after: z.string().optional(),
});

export const GetUserCommentsSchema = z.object({
  username: z.string().min(1, "Username is required"),
  sort: z.enum(["new", "hot", "top", "controversial"]).default("new"),
  time_filter: z.enum(["hour", "day", "week", "month", "year", "all"]).default("all"),
  limit: z.number().min(1).max(100).default(25),
  after: z.string().optional(),
});

export const GetTrendingSubredditsSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
});

export const GetCommentThreadSchema = z.object({
  comment_id: z.string().min(1, "Comment ID is required"),
  depth: z.number().min(1).max(10).default(5),
  context: z.number().min(0).max(8).default(2),
});

export const GetMyProfileSchema = z.object({});

// --- Write Tool Schemas ---

export const CreatePostSchema = z.object({
  subreddit: z.string().min(1, "Subreddit is required"),
  title: z.string().min(1).max(300, "Title must not exceed 300 characters"),
  content: z.string().min(1, "Content is required"),
  is_self: z.boolean().default(true),
  flair_id: z.string().optional(),
  nsfw: z.boolean().default(false),
  spoiler: z.boolean().default(false),
});

export const ReplyToPostSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
  content: z.string().min(1).max(10000, "Content must be 1-10,000 characters"),
});

export const ReplyToCommentSchema = z.object({
  comment_id: z.string().min(1, "Comment ID is required"),
  content: z.string().min(1).max(10000, "Content must be 1-10,000 characters"),
});

export const VoteSchema = z.object({
  target_id: z.string().min(1, "Target ID is required"),
  direction: z.enum(["up", "down", "unvote"]),
});

export const EditPostSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
  content: z.string().min(1, "Content is required"),
});

export const EditCommentSchema = z.object({
  comment_id: z.string().min(1, "Comment ID is required"),
  content: z.string().min(1).max(10000, "Content must be 1-10,000 characters"),
});

export const DeletePostSchema = z.object({
  post_id: z.string().min(1, "Post ID is required"),
});

export const DeleteCommentSchema = z.object({
  comment_id: z.string().min(1, "Comment ID is required"),
});
