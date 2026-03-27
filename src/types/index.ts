export enum AuthTier {
  Anonymous = 1,
  AppOnly = 2,
  UserAuth = 3,
}

export enum ErrorCode {
  AUTH_REQUIRED = "AUTH_REQUIRED",
  SUBREDDIT_NOT_FOUND = "SUBREDDIT_NOT_FOUND",
  SUBREDDIT_PRIVATE = "SUBREDDIT_PRIVATE",
  SUBREDDIT_BANNED = "SUBREDDIT_BANNED",
  POST_NOT_FOUND = "POST_NOT_FOUND",
  POST_ARCHIVED = "POST_ARCHIVED",
  POST_LOCKED = "POST_LOCKED",
  COMMENT_NOT_FOUND = "COMMENT_NOT_FOUND",
  USER_NOT_FOUND = "USER_NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  INVALID_INPUT = "INVALID_INPUT",
  NOT_AUTHOR = "NOT_AUTHOR",
  REDDIT_ERROR = "REDDIT_ERROR",
  AUTH_FAILED = "AUTH_FAILED",
}

export interface ThreadrError {
  code: ErrorCode;
  message: string;
  recoveryHint: string;
}

export interface PaginationMeta {
  nextCursor: string | null;
  resultCount: number;
  hasMore: boolean;
}

export interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}
