import { describe, expect, test } from "bun:test";
import { formatUserProfile, formatMyProfile } from "../../src/formatters/user.js";
import { mockUser, mockMe } from "../fixtures/reddit-responses.js";

describe("formatUserProfile", () => {
  test("renders all profile fields", () => {
    const result = formatUserProfile(mockUser);
    expect(result).toContain("Username: u/testuser");
    expect(result).toContain("Display Name: Test User Profile");
    expect(result).toContain("Created:");
    expect(result).toContain("Avatar:");
    expect(result).toContain("Bio: Just a test user.");
  });

  test("shows karma breakdown", () => {
    const result = formatUserProfile(mockUser);
    expect(result).toContain("Total: 17.3k");
    expect(result).toContain("Post: 5.0k");
    expect(result).toContain("Comment: 12.0k");
    expect(result).toContain("Awardee: 200");
    expect(result).toContain("Awarder: 100");
  });

  test("shows verified email flag", () => {
    const result = formatUserProfile(mockUser);
    expect(result).toContain("Verified Email");
  });

  test("shows moderator flag", () => {
    const result = formatUserProfile(mockUser);
    expect(result).toContain("Moderator");
  });

  test("shows suspended status", () => {
    const suspendedUser = { ...mockUser, is_suspended: true };
    const result = formatUserProfile(suspendedUser);
    expect(result).toContain("Suspended");
  });

  test("handles user without subreddit data", () => {
    const { subreddit, ...minimalUser } = mockUser;
    const result = formatUserProfile(minimalUser as typeof mockUser);
    expect(result).toContain("Username: u/testuser");
    expect(result).not.toContain("Display Name:");
  });
});

describe("formatMyProfile", () => {
  test("includes base profile fields", () => {
    const result = formatMyProfile(mockMe);
    expect(result).toContain("Username: u/testuser");
    expect(result).toContain("Total: 17.3k");
  });

  test("includes inbox count", () => {
    const result = formatMyProfile(mockMe);
    expect(result).toContain("Inbox: 3 unread");
  });

  test("includes mail status", () => {
    const result = formatMyProfile(mockMe);
    expect(result).toContain("Has Mail: Yes");
  });

  test("includes friends count", () => {
    const result = formatMyProfile(mockMe);
    expect(result).toContain("Friends: 15");
  });
});
