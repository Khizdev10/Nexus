import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { getLocalGitStatusAsync } from "@/lib/services/git/status";
import { DevOSOverallStats } from "@/types/devos";

export async function GET() {
  try {
    const token = await getGitHubOAuthToken();
    if (!token) {
      return NextResponse.json(
        { error: "GitHub account not connected. Please sign in via GitHub.", repositories: [], stats: null },
        { status: 401 }
      );
    }

    const repositories = await fetchGitHubUserRepositories(token, 30);

    let modifiedRepos = 0;
    let aheadRepos = 0;
    let behindRepos = 0;
    let totalIssues = 0;
    let totalPRs = 0;

    // High-speed parallel local status inspection (<200ms total)
    await Promise.all(
      repositories.map(async (repo) => {
        totalIssues += repo.openIssuesCount;
        totalPRs += repo.openPullRequestsCount;

        if (repo.localPath && fs.existsSync(repo.localPath) && fs.existsSync(path.join(repo.localPath, ".git"))) {
          const localStatus = await getLocalGitStatusAsync(repo.localPath);
          repo.currentBranch = localStatus.branch;
          repo.aheadCount = localStatus.ahead;
          repo.behindCount = localStatus.behind;
          repo.uncommittedCount =
            localStatus.modifiedFiles.length +
            localStatus.stagedFiles.length +
            localStatus.untrackedFiles.length;

          // Compare GitHub API lastPush timestamp with local git commit timestamp for instant BEHIND detection (>30 seconds)
          // This avoids clock-lag false positives where a recent push or pull is misidentified due to clock drift
          const githubPushTime = new Date(repo.lastPush).getTime();
          const localCommitTime = localStatus.lastCommitDate ? new Date(localStatus.lastCommitDate).getTime() : 0;
          const isRemoteNewer = githubPushTime > 0 && localCommitTime > 0 && (githubPushTime - localCommitTime > 30000);

          if (isRemoteNewer || localStatus.behind > 0) {
            repo.behindCount = localStatus.behind > 0 ? localStatus.behind : 1;
          }

          // 1. MODIFIED: Local uncommitted edits take top priority
          if (repo.uncommittedCount > 0) {
            repo.status = "modified";
            modifiedRepos++;
          } else if (repo.behindCount > 0) {
            // 2. BEHIND: GitHub has commits that local doesn't have yet
            repo.status = "behind";
            behindRepos++;
          } else if (localStatus.ahead > 0 && !isRemoteNewer) {
            // 3. AHEAD: Local has unpushed commits (and remote is not newer)
            repo.status = "ahead";
            aheadRepos++;
          } else {
            // 4. SYNCED: Local & GitHub are in exact 100% lockstep sync
            repo.status = "synced";
            repo.aheadCount = 0;
            repo.behindCount = 0;
          }
        } else {
          repo.status = "synced";
        }
      })
    );

    const stats: DevOSOverallStats = {
      totalRepos: repositories.length,
      syncedRepos: repositories.length - modifiedRepos - aheadRepos - behindRepos,
      modifiedRepos,
      aheadRepos,
      behindRepos,
      openIssues: totalIssues,
      pullRequests: totalPRs,
      lastSyncTime: new Date().toISOString(),
    };

    return NextResponse.json({
      repositories,
      stats,
    });
  } catch (error: any) {
    console.error("DevOS repositories API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch DevOS repositories", repositories: [] },
      { status: 500 }
    );
  }
}
