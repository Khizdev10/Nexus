import { auth, clerkClient } from "@clerk/nextjs/server";
import fs from "fs";
import path from "path";
import { DevOSRepository } from "@/types/devos";

// Persist cache across Next.js Dev HMR reloads
const globalForDevOS = globalThis as unknown as {
  __devos_repo_cache?: { data: DevOSRepository[]; timestamp: number; tokenKey: string };
  __devos_token_cache?: { token: string; timestamp: number };
};

const CACHE_TTL_MS = 1000; // 1 second cache TTL for instant live updates

/**
 * Known GitHub repo name -> local folder name mappings.
 */
const REPO_NAME_TO_LOCAL_FOLDER: Record<string, string> = {
  Nexus: "devi",
  nexus: "devi",
  devi: "devi",
};

/**
 * Resolve the local disk path for a GitHub repository.
 * Strictly maps to its specific local folder on disk (`c:\coding\projects\<repoName>`).
 */
function resolveLocalPath(repoName: string): string {
  const basePath = "c:\\coding\\projects";

  // 1. Check explicit mapping if defined (e.g. Nexus -> devi)
  const mapped = REPO_NAME_TO_LOCAL_FOLDER[repoName];
  if (mapped) {
    const mappedPath = path.join(/*turbopackIgnore: true*/ basePath, mapped);
    if (fs.existsSync(mappedPath)) return mappedPath;
  }

  // 2. Check exact repoName folder on hard drive
  const directPath = path.join(/*turbopackIgnore: true*/ basePath, repoName);
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  return directPath;
}

/**
 * Service to fetch, import, and transform GitHub Repositories for Nexus.
 * Multi-User Isolated Token Resolution:
 * 1. Checks logged-in Clerk user's GitHub OAuth token first (Per-User Security).
 * 2. Uses GITHUB_PAT env variable ONLY as local fallback for single-user dev mode.
 */
export async function getGitHubOAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (globalForDevOS.__devos_token_cache && now - globalForDevOS.__devos_token_cache.timestamp < CACHE_TTL_MS) {
    return globalForDevOS.__devos_token_cache.token;
  }

  // 1. Prioritize Authenticated User's GitHub OAuth Token (Multi-User Isolation)
  try {
    const { userId } = await auth();
    if (userId) {
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
    }
  } catch (error) {
    console.warn("[Nexus GitHub Service] Clerk OAuth token not found, checking local PAT fallback...");
  }

  // 2. Fallback to process.env.GITHUB_PAT for single-user local development mode
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GITHUB_PAT) return process.env.GITHUB_PAT;

  return null;
}

/**
 * Invalidate the repo cache so the next call fetches fresh data from GitHub API.
 */
export function clearRepoCache(): void {
  globalForDevOS.__devos_repo_cache = undefined;
}

export async function fetchGitHubUserRepositories(token: string, limit = 100): Promise<DevOSRepository[]> {
  const now = Date.now();
  if (
    globalForDevOS.__devos_repo_cache &&
    globalForDevOS.__devos_repo_cache.tokenKey === token &&
    now - globalForDevOS.__devos_repo_cache.timestamp < CACHE_TTL_MS
  ) {
    return globalForDevOS.__devos_repo_cache.data;
  }

  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Nexus-App",
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 30 },
    });

    let currentUsername = "";
    if (userRes.ok) {
      const userData = await userRes.json();
      currentUsername = userData.login;
    }

    const res = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=${limit}&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Nexus-App",
          Accept: "application/vnd.github.v3+json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Nexus GitHub API] Error ${res.status}: ${errorText}`);
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const rawRepos = await res.json();
    if (!Array.isArray(rawRepos)) return [];

    const repos: DevOSRepository[] = rawRepos.map((repo: any) => {
      const localPath = resolveLocalPath(repo.name);

      let role: DevOSRepository["role"] = "owner";
      if (repo.owner && currentUsername && repo.owner.login !== currentUsername) {
        if (repo.permissions?.admin || repo.permissions?.push) {
          role = "collaborator";
        } else {
          role = "organization_member";
        }
      }

      return {
        id: repo.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        githubId: repo.id || 0,
        name: repo.name,
        ownerLogin: repo.owner?.login || "",
        role,
        description: repo.description || null,
        language: repo.language || "TypeScript",
        visibility: repo.private ? "private" : "public",
        defaultBranch: repo.default_branch || "main",
        cloneUrl: repo.clone_url || "",
        sshUrl: repo.ssh_url || "",
        lastPush: repo.pushed_at || repo.updated_at || new Date().toISOString(),
        isArchived: repo.archived || false,
        createdAt: repo.created_at || new Date().toISOString(),
        updatedAt: repo.updated_at || new Date().toISOString(),
        localPath,

        // Real-time Git & Sync Status
        currentBranch: repo.default_branch || "main",
        aheadCount: 0,
        behindCount: 0,
        uncommittedCount: 0,
        status: "synced",
        openIssuesCount: repo.open_issues_count || 0,
        openPullRequestsCount: 0,
      };
    });

    globalForDevOS.__devos_repo_cache = {
      data: repos,
      timestamp: now,
      tokenKey: token,
    };

    return repos;
  } catch (error) {
    console.error("[Nexus GitHub Service] Exception fetching repos:", error);
    return [];
  }
}
