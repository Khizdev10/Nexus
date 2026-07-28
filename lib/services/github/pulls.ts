export interface DevOSPullRequest {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  authorName: string;
  authorAvatarUrl: string;
  headBranch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string | null;
  htmlUrl: string;
  body?: string;
  isDraft: boolean;
}

export async function fetchGitHubRepoPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all"
): Promise<DevOSPullRequest[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "DevOS-App",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      console.error(`[DevOS Pulls Service] GitHub API Error for ${owner}/${repo}:`, res.status);
      return [];
    }

    const rawPulls = await res.json();

    return rawPulls.map((item: any): DevOSPullRequest => {
      let state: DevOSPullRequest["state"] = item.state;
      if (item.merged_at) state = "merged";

      return {
        id: item.id,
        number: item.number,
        title: item.title,
        state,
        authorName: item.user?.login || "Developer",
        authorAvatarUrl: item.user?.avatar_url || "",
        headBranch: item.head?.ref || "feature",
        baseBranch: item.base?.ref || "main",
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        mergedAt: item.merged_at,
        htmlUrl: item.html_url,
        body: item.body || "",
        isDraft: item.draft || false,
      };
    });
  } catch (error) {
    console.error("[DevOS Pulls Service] Error fetching repo pull requests:", error);
    return [];
  }
}
