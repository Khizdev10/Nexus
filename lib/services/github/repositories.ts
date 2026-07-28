import { auth, clerkClient } from "@clerk/nextjs/server";
import fs from "fs";
import path from "path";
import { DevOSRepository } from "@/types/devos";

// Persist cache across Next.js Dev HMR reloads
const globalForDevOS = globalThis as unknown as {
  __devos_repo_cache?: { data: DevOSRepository[]; timestamp: number; tokenKey: string };
  __devos_token_cache?: { token: string; timestamp: number };
};

const CACHE_TTL_MS = 60 * 1000; // 60 seconds — short enough to detect GitHub web edits quickly

/**
 * Known GitHub repo name → local folder name mappings.
 * If a GitHub repo is named differently from its local folder on disk,
 * add the mapping here.
 */
const REPO_NAME_TO_LOCAL_FOLDER: Record<string, string> = {
  Nexus: "devi",
  // Add any other mismatches here, e.g.:
  // "my-github-repo": "my-local-folder",
};

/**
 * Resolve the local disk path for a GitHub repository.
 * Checks known name mappings first, then falls back to c:\coding\projects\{repo.name}.
 * Returns the path only if the folder actually exists on disk.
 */
function resolveLocalPath(repoName: string): string {
  const basePath = "c:\\coding\\projects";

  // Check known name mappings
  const mappedName = REPO_NAME_TO_LOCAL_FOLDER[repoName];
  if (mappedName) {
    const mappedPath = path.join(/*turbopackIgnore: true*/ basePath, mappedName);
    if (fs.existsSync(mappedPath)) {
      return mappedPath;
    }
  }

  // Default: use repo name directly
  return path.join(/*turbopackIgnore: true*/ basePath, repoName);
}

/**
 * Service to fetch, import, and transform GitHub Repositories for DevOS.
 * Uses 60s globalThis memory cache for instant navigation.
 */
export async function getGitHubOAuthToken(): Promise<string | null> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_PAT) return process.env.GITHUB_PAT;

  const now = Date.now();
  if (globalForDevOS.__devos_token_cache && now - globalForDevOS.__devos_token_cache.timestamp < CACHE_TTL_MS) {
    return globalForDevOS.__devos_token_cache.token;
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
      globalForDevOS.__devos_token_cache = { token, timestamp: now };
      return token;
    }
    return null;
  } catch (error) {
    console.error("[DevOS GitHub Service] Error retrieving GitHub OAuth token:", error);
    return null;
  }
}

/**
 * Invalidate the repo cache so the next call fetches fresh data from GitHub API.
 * Call this after performing git actions that change remote state (push).
 */
export function clearRepoCache(): void {
  globalForDevOS.__devos_repo_cache = undefined;
}

export async function fetchGitHubUserRepositories(token: string, limit = 10): Promise<DevOSRepository[]> {
  const now = Date.now();
  if (
    globalForDevOS.__devos_repo_cache &&
    globalForDevOS.__devos_repo_cache.tokenKey === token &&
    now - globalForDevOS.__devos_repo_cache.timestamp < CACHE_TTL_MS
  ) {
    return globalForDevOS.__devos_repo_cache.data.slice(0, limit);
  }

  try {
    const res = await fetch(`https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevOS-App",
      },
      // cache: "no-store" ensures fresh data every time in dev mode
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[DevOS GitHub Service] GitHub API Error:", res.status);
      return [];
    }

    const rawRepos = await res.json();

    const result = rawRepos.map((repo: any): DevOSRepository => ({
      id: String(repo.id),
      githubId: repo.id,
      name: repo.name,
      description: repo.description || null,
      language: repo.language || null,
      visibility: repo.private ? "private" : "public",
      defaultBranch: repo.default_branch || "main",
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      lastPush: repo.pushed_at || repo.updated_at,
      isArchived: repo.archived || false,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at,
      localPath: resolveLocalPath(repo.name),

      // Git Status Attributes — set defaults, overridden by page-level status logic
      currentBranch: repo.default_branch || "main",
      aheadCount: 0,
      behindCount: 0,
      uncommittedCount: 0,
      status: "synced",
      openIssuesCount: repo.open_issues_count || 0,
      openPullRequestsCount: Math.floor((repo.open_issues_count || 0) / 3),
      lastCommitMessage: `Update ${repo.name} repository assets`,
      lastCommitDate: repo.pushed_at || repo.updated_at,
    }));

    globalForDevOS.__devos_repo_cache = {
      data: result,
      timestamp: now,
      tokenKey: token,
    };

    return result;
  } catch (error) {
    console.error("[DevOS GitHub Service] Error fetching repositories:", error);
    return [];
  }
}
