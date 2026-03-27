export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface RedditListing<T> {
  kind: "Listing";
  data: {
    after: string | null;
    before: string | null;
    children: Array<{ kind: string; data: T }>;
    dist: number | null;
  };
}

export interface RedditPost {
  id: string;
  name: string;
  title: string;
  author: string;
  author_fullname?: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  selftext: string;
  selftext_html: string | null;
  score: number;
  upvote_ratio: number;
  ups: number;
  downs: number;
  num_comments: number;
  created_utc: number;
  edited: number | false;
  permalink: string;
  url: string;
  domain: string;
  is_self: boolean;
  is_video: boolean;
  over_18: boolean;
  spoiler: boolean;
  locked: boolean;
  archived: boolean;
  stickied: boolean;
  link_flair_text: string | null;
  link_flair_template_id: string | null;
  author_flair_text: string | null;
  thumbnail: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
    }>;
  };
  media?: Record<string, unknown>;
  post_hint?: string;
  num_crossposts: number;
  total_awards_received: number;
  gilded: number;
}

export interface RedditComment {
  id: string;
  name: string;
  author: string;
  author_fullname?: string;
  body: string;
  body_html: string;
  score: number;
  ups: number;
  downs: number;
  created_utc: number;
  edited: number | false;
  permalink: string;
  subreddit: string;
  link_id: string;
  link_title?: string;
  parent_id: string;
  depth: number;
  is_submitter: boolean;
  stickied: boolean;
  author_flair_text: string | null;
  total_awards_received: number;
  replies: RedditListing<RedditComment> | "" | null;
}

export interface RedditMore {
  id: string;
  name: string;
  count: number;
  depth: number;
  children: string[];
  parent_id: string;
}

export interface RedditSubreddit {
  id: string;
  name: string;
  display_name: string;
  display_name_prefixed: string;
  title: string;
  public_description: string;
  description: string;
  subscribers: number;
  accounts_active: number | null;
  created_utc: number;
  over18: boolean;
  quarantine: boolean;
  subreddit_type: string;
  submission_type: string | null;
  lang: string;
  icon_img: string;
  banner_img: string;
  community_icon: string;
  header_img: string | null;
}

export interface RedditSubredditRules {
  rules: Array<{
    kind: string;
    short_name: string;
    description: string;
    violation_reason: string;
  }>;
}

export interface RedditSubredditFlairs {
  choices: Array<{
    flair_template_id: string;
    flair_text: string;
    flair_css_class: string;
  }>;
}

export interface RedditUser {
  id: string;
  name: string;
  icon_img: string;
  subreddit?: {
    display_name: string;
    public_description: string;
    title: string;
  };
  created_utc: number;
  link_karma: number;
  comment_karma: number;
  awardee_karma: number;
  awarder_karma: number;
  total_karma: number;
  has_verified_email: boolean;
  is_gold: boolean;
  is_mod: boolean;
  is_employee: boolean;
  is_suspended?: boolean;
  snoovatar_img?: string;
}

export interface RedditMe extends RedditUser {
  inbox_count: number;
  has_mail: boolean;
  num_friends: number;
  over_18: boolean;
  pref_nightmode: boolean;
}

export interface RedditSubmitResponse {
  json: {
    errors: Array<[string, string, string]>;
    data?: {
      url: string;
      id: string;
      name: string;
    };
  };
}

export interface RedditCommentResponse {
  json: {
    errors: Array<[string, string, string]>;
    data?: {
      things: Array<{
        kind: string;
        data: RedditComment;
      }>;
    };
  };
}
