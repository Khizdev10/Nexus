import { NextResponse } from "next/server";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { fetchGitHubRepoCommits } from "@/lib/services/github/commits";
import { getLocalGitStatus } from "@/lib/services/git/status";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const repoId = params.id;
    const token = await getGitHubOAuthToken();

    if (!token) {
      return NextResponse.json({ error: "GitHub token missing" }, { status: 401 });
    }

    const repos = await fetchGitHubUserRepositories(token);
    const repo = repos.find((r) => r.id === repoId || r.name === repoId);

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const owner = repo.cloneUrl.split("github.com/")[1]?.split("/")[0] || "owner";
    const commits = await fetchGitHubRepoCommits(token, owner, repo.name, 30);
    const localStatus = repo.localPath ? getLocalGitStatus(repo.localPath) : null;

    if (localStatus) {
      repo.currentBranch = localStatus.branch;
      repo.aheadCount = localStatus.ahead;
      repo.behindCount = localStatus.behind;
      repo.uncommittedCount =
        localStatus.modifiedFiles.length +
        localStatus.stagedFiles.length +
        localStatus.untrackedFiles.length;
    }

    return NextResponse.json({
      repository: repo,
      commits,
      gitStatus: localStatus,
    });
  } catch (error: any) {
    console.error("Error fetching repository details:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch repository details" },
      { status: 500 }
    );
  }
}
