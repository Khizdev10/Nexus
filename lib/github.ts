import { auth, clerkClient } from "@clerk/nextjs/server";

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  private: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubCommit {
  sha: string;
  html_url: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    avatar_url: string;
    html_url: string;
  } | null;
}

export interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const globalForGitHub = globalThis as unknown as {
  __github_user_repos_cache?: { data: GitHubRepo[]; timestamp: number; tokenKey: string };
  __github_commits_cache?: Map<string, { data: GitHubCommit[]; timestamp: number }>;
  __github_token_cache?: { token: string; timestamp: number };
};

if (!globalForGitHub.__github_commits_cache) {
  globalForGitHub.__github_commits_cache = new Map();
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export async function getUserGitHubToken(): Promise<string | null> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_PAT) return process.env.GITHUB_PAT;

  const now = Date.now();
  if (globalForGitHub.__github_token_cache && now - globalForGitHub.__github_token_cache.timestamp < CACHE_TTL_MS) {
    return globalForGitHub.__github_token_cache.token;
  }

  try {
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    let tokens = await client.users.getUserOauthAccessToken(userId, "github");

    if (!tokens || !tokens.data || tokens.data.length === 0) {
      tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");
    }

    if (tokens && tokens.data && tokens.data.length > 0) {
      const token = tokens.data[0].token;
      globalForGitHub.__github_token_cache = { token, timestamp: now };
      return token;
    }
    return null;
  } catch (error) {
    console.error("Error retrieving GitHub OAuth token from Clerk:", error);
    return null;
  }
}

export async function getUserRepositories(token: string, limit = 20): Promise<GitHubRepo[]> {
  const now = Date.now();
  if (
    globalForGitHub.__github_user_repos_cache &&
    globalForGitHub.__github_user_repos_cache.tokenKey === token &&
    now - globalForGitHub.__github_user_repos_cache.timestamp < CACHE_TTL_MS
  ) {
    return globalForGitHub.__github_user_repos_cache.data.slice(0, limit);
  }

  try {
    const res = await fetch(`https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Nexus-App",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("Failed to fetch GitHub repos:", res.status, res.statusText);
      return [];
    }

    const repos: GitHubRepo[] = await res.json();
    globalForGitHub.__github_user_repos_cache = {
      data: repos,
      timestamp: now,
      tokenKey: token,
    };
    return repos;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return [];
  }
}

export async function getRepoCommits(
  token: string,
  owner: string,
  repo: string,
  perPage = 30
): Promise<GitHubCommit[]> {
  const cacheKey = `${owner}/${repo}/${perPage}`;
  const now = Date.now();
  const commitsCache = globalForGitHub.__github_commits_cache!;
  const cached = commitsCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Nexus-App",
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error(`Failed to fetch commits for ${owner}/${repo}:`, res.status);
      return [];
    }

    const commits: GitHubCommit[] = await res.json();
    commitsCache.set(cacheKey, { data: commits, timestamp: now });
    return commits;
  } catch (error) {
    console.error("Error fetching commits:", error);
    return [];
  }
}

export function generateContributionData(commits: GitHubCommit[]) {
  const commitCounts: Record<string, number> = {};
  commits.forEach((c) => {
    const dateStr = c.commit.author.date.split("T")[0];
    commitCounts[dateStr] = (commitCounts[dateStr] || 0) + 1;
  });

  const today = new Date();
  const days: ContributionDay[] = [];

  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = commitCounts[dateStr] || 0;

    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (count >= 1 && count <= 2) level = 1;
    else if (count >= 3 && count <= 5) level = 2;
    else if (count >= 6 && count <= 9) level = 3;
    else if (count >= 10) level = 4;

    days.push({
      date: dateStr,
      count,
      level,
    });
  }

  const weeks: ContributionDay[][] = [];
  let currentWeek: ContributionDay[] = [];

  const firstDate = new Date(days[0].date);
  const dayOfWeek = firstDate.getDay();

  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek.push({ date: "", count: 0, level: 0 });
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", count: 0, level: 0 });
    }
    weeks.push(currentWeek);
  }

  let totalCommits = 0;
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  days.forEach((day) => {
    totalCommits += day.count;
    if (day.count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  });

  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
    } else {
      if (i === days.length - 1) continue;
      break;
    }
  }

  return {
    weeks,
    totalCommits,
    currentStreak,
    longestStreak,
  };
}
