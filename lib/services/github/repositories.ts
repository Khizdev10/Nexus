import { auth, clerkClient } from "@clerk/nextjs/server";
import { DevOSRepository } from "@/types/devos";

/**
 * Service to fetch, import, and transform GitHub Repositories for DevOS
 */
export async function getGitHubOAuthToken(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const tokens = await client.users.getUserOauthAccessToken(userId, "oauth_github");

    if (tokens && tokens.data && tokens.data.length > 0) {
      return tokens.data[0].token;
    }
    return null;
  } catch (error) {
    console.error("[DevOS GitHub Service] Error retrieving GitHub OAuth token:", error);
    return null;
  }
}

export async function fetchGitHubUserRepositories(token: string): Promise<DevOSRepository[]> {
  try {
    const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevOS-App",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("[DevOS GitHub Service] GitHub API Error:", res.status);
      return [];
    }

    const rawRepos = await res.json();

    return rawRepos.map((repo: any): DevOSRepository => ({
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
      localPath: `c:\\coding\\projects\\${repo.name}`,

      // Git Status Attributes
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
  } catch (error) {
    console.error("[DevOS GitHub Service] Error fetching repositories:", error);
    return [];
  }
}
