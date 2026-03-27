import type {
  RedditListing,
  RedditPost,
  RedditComment,
  RedditSubreddit,
  RedditUser,
  RedditMe,
  RedditMore,
  OAuthTokenResponse,
  RedditSubredditRules,
  RedditSubmitResponse,
  RedditCommentResponse,
} from "../../src/reddit/types.js";

export const mockOAuthToken: OAuthTokenResponse = {
  access_token: "mock_access_token_123",
  token_type: "bearer",
  expires_in: 3600,
  scope: "*",
};

export const mockPost: RedditPost = {
  id: "abc123",
  name: "t3_abc123",
  title: "Test Post Title",
  author: "testauthor",
  author_fullname: "t2_user123",
  subreddit: "testsubreddit",
  subreddit_name_prefixed: "r/testsubreddit",
  selftext: "This is the body of the test post with some content.",
  selftext_html: "<p>This is the body of the test post with some content.</p>",
  score: 1234,
  upvote_ratio: 0.95,
  ups: 1300,
  downs: 66,
  num_comments: 89,
  created_utc: 1711584000,
  edited: false,
  permalink: "/r/testsubreddit/comments/abc123/test_post_title/",
  url: "https://www.reddit.com/r/testsubreddit/comments/abc123/test_post_title/",
  domain: "self.testsubreddit",
  is_self: true,
  is_video: false,
  over_18: false,
  spoiler: false,
  locked: false,
  archived: false,
  stickied: false,
  link_flair_text: "Discussion",
  link_flair_template_id: "flair_123",
  author_flair_text: null,
  thumbnail: "self",
  num_crossposts: 0,
  total_awards_received: 2,
  gilded: 1,
};

export const mockComment: RedditComment = {
  id: "xyz789",
  name: "t1_xyz789",
  author: "commenter1",
  author_fullname: "t2_comm1",
  body: "This is a test comment.",
  body_html: "<p>This is a test comment.</p>",
  score: 42,
  ups: 45,
  downs: 3,
  created_utc: 1711587600,
  edited: false,
  permalink: "/r/testsubreddit/comments/abc123/test_post_title/xyz789/",
  subreddit: "testsubreddit",
  link_id: "t3_abc123",
  link_title: "Test Post Title",
  parent_id: "t3_abc123",
  depth: 0,
  is_submitter: false,
  stickied: false,
  author_flair_text: null,
  total_awards_received: 0,
  replies: "",
};

export const mockNestedComment: RedditComment = {
  ...mockComment,
  id: "reply1",
  name: "t1_reply1",
  author: "replier1",
  body: "This is a reply.",
  body_html: "<p>This is a reply.</p>",
  parent_id: "t1_xyz789",
  depth: 1,
  score: 10,
  replies: "",
};

export const mockMore: RedditMore = {
  id: "more1",
  name: "t1_more1",
  count: 5,
  depth: 2,
  children: ["child1", "child2", "child3", "child4", "child5"],
  parent_id: "t1_reply1",
};

export const mockSubreddit: RedditSubreddit = {
  id: "sub123",
  name: "t5_sub123",
  display_name: "testsubreddit",
  display_name_prefixed: "r/testsubreddit",
  title: "Test Subreddit",
  public_description: "A subreddit for testing purposes.",
  description: "A longer description of the test subreddit with **markdown**.",
  subscribers: 150000,
  accounts_active: 1234,
  created_utc: 1300000000,
  over18: false,
  quarantine: false,
  subreddit_type: "public",
  submission_type: "any",
  lang: "en",
  icon_img: "https://styles.redditmedia.com/icon.png",
  banner_img: "",
  community_icon: "",
  header_img: null,
};

export const mockSubredditRules: RedditSubredditRules = {
  rules: [
    {
      kind: "all",
      short_name: "Be respectful",
      description: "Treat others with respect. No personal attacks.",
      violation_reason: "Disrespectful behavior",
    },
    {
      kind: "link",
      short_name: "No spam",
      description: "Do not post spam or self-promote excessively.",
      violation_reason: "Spam",
    },
  ],
};

export const mockUser: RedditUser = {
  id: "user456",
  name: "testuser",
  icon_img: "https://styles.redditmedia.com/avatar.png",
  subreddit: {
    display_name: "u_testuser",
    public_description: "Just a test user.",
    title: "Test User Profile",
  },
  created_utc: 1400000000,
  link_karma: 5000,
  comment_karma: 12000,
  awardee_karma: 200,
  awarder_karma: 100,
  total_karma: 17300,
  has_verified_email: true,
  is_gold: false,
  is_mod: true,
  is_employee: false,
};

export const mockMe: RedditMe = {
  ...mockUser,
  inbox_count: 3,
  has_mail: true,
  num_friends: 15,
  over_18: true,
  pref_nightmode: false,
};

export const mockPostListing: RedditListing<RedditPost> = {
  kind: "Listing",
  data: {
    after: "t3_nextpage",
    before: null,
    children: [
      { kind: "t3", data: mockPost },
      { kind: "t3", data: { ...mockPost, id: "def456", name: "t3_def456", title: "Second Post", score: 567 } },
    ],
    dist: 2,
  },
};

export const mockCommentListing: RedditListing<RedditComment> = {
  kind: "Listing",
  data: {
    after: null,
    before: null,
    children: [
      { kind: "t1", data: mockComment },
      {
        kind: "t1",
        data: {
          ...mockComment,
          id: "comm2",
          name: "t1_comm2",
          author: "commenter2",
          body: "Another comment here.",
          score: 15,
        },
      },
    ],
    dist: 2,
  },
};

export const mockUserCommentListing: RedditListing<RedditComment> = {
  kind: "Listing",
  data: {
    after: "t1_nextcomm",
    before: null,
    children: [
      { kind: "t1", data: mockComment },
    ],
    dist: 1,
  },
};

export const mockSearchResults: RedditListing<RedditPost> = {
  kind: "Listing",
  data: {
    after: "t3_searchnext",
    before: null,
    children: [
      { kind: "t3", data: { ...mockPost, title: "Search Result Post", subreddit: "programming" } },
    ],
    dist: 1,
  },
};

export const mockPopularSubreddits: RedditListing<RedditSubreddit> = {
  kind: "Listing",
  data: {
    after: null,
    before: null,
    children: [
      { kind: "t5", data: mockSubreddit },
      {
        kind: "t5",
        data: {
          ...mockSubreddit,
          id: "sub456",
          display_name: "programming",
          display_name_prefixed: "r/programming",
          title: "Programming",
          subscribers: 5000000,
        },
      },
    ],
    dist: 2,
  },
};

export const mockPostDetail = [
  mockPostListing,
  {
    kind: "Listing",
    data: {
      after: null,
      before: null,
      children: [
        {
          kind: "t1",
          data: {
            ...mockComment,
            replies: {
              kind: "Listing" as const,
              data: {
                after: null,
                before: null,
                children: [
                  { kind: "t1", data: mockNestedComment },
                  { kind: "more", data: mockMore },
                ],
                dist: null,
              },
            },
          },
        },
      ],
      dist: 1,
    },
  },
];

export const mockSubmitResponse: RedditSubmitResponse = {
  json: {
    errors: [],
    data: {
      url: "https://www.reddit.com/r/testsubreddit/comments/new123/my_new_post/",
      id: "new123",
      name: "t3_new123",
    },
  },
};

export const mockCommentResponse: RedditCommentResponse = {
  json: {
    errors: [],
    data: {
      things: [
        {
          kind: "t1",
          data: {
            ...mockComment,
            id: "newcomm",
            name: "t1_newcomm",
            body: "My new comment",
          },
        },
      ],
    },
  },
};

export const mockError404 = {
  status: 404,
  body: { message: "Not Found", error: 404 },
};

export const mockError403 = {
  status: 403,
  body: { reason: "private", message: "Forbidden", error: 403 },
};

export const mockError429 = {
  status: 429,
  body: { message: "Too Many Requests", error: 429 },
  headers: { "Retry-After": "5" },
};
