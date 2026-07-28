export interface DevOSIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  authorName: string;
  authorAvatarUrl: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  labels: { name: string; color: string }[];
  htmlUrl: string;
  body?: string;
}

export async function fetchGitHubRepoIssues(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "all"
): Promise<DevOSIssue[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=30`,
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
      console.error(`[DevOS Issues Service] GitHub API Error for ${owner}/${repo}:`, res.status);
      return [];
    }

    const rawIssues = await res.json();

    // Filter out Pull Requests (GitHub REST API returns PRs in issues endpoint unless pull_request property is absent)
    const issuesOnly = rawIssues.filter((item: any) => !item.pull_request);

    return issuesOnly.map((item: any): DevOSIssue => ({
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state,
      authorName: item.user?.login || "Developer",
      authorAvatarUrl: item.user?.avatar_url || "",
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      commentsCount: item.comments || 0,
      labels: (item.labels || []).map((l: any) => ({ name: l.name, color: l.color })),
      htmlUrl: item.html_url,
      body: item.body || "",
    }));
  } catch (error) {
    console.error("[DevOS Issues Service] Error fetching repo issues:", error);
    return [];
  }
}
