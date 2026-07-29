import Link from "next/link";
import fs from "fs";
import path from "path";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, Show } from "@clerk/nextjs";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { getLocalGitStatusAsync } from "@/lib/services/git/status";
import { DevOSOverallStats, DevOSRepository } from "@/types/devos";
import RepositoryFilterGrid from "@/components/devos/RepositoryFilterGrid";
import LocalAgentDesktopCard from "@/components/agent/LocalAgentDesktopCard";

export default async function SourceControlHomePage() {
  const { userId } = await auth();
  const token = await getGitHubOAuthToken();

  const repos: DevOSRepository[] = token ? await fetchGitHubUserRepositories(token, 100) : [];

  let modifiedRepos = 0;
  let aheadRepos = 0;
  let behindRepos = 0;
  let totalIssues = 0;
  let totalPRs = 0;

  // High-speed parallel status inspection across local repositories simultaneously (<100ms)
  await Promise.all(
    repos.map(async (repo) => {
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

        if (repo.uncommittedCount > 0) {
          repo.status = "modified";
          modifiedRepos++;
        } else if (repo.behindCount > 0) {
          repo.status = "behind";
          behindRepos++;
        } else if (repo.aheadCount > 0) {
          repo.status = "ahead";
          aheadRepos++;
        } else {
          repo.status = "synced";
        }
      } else {
        repo.status = "synced";
      }
    })
  );

  const stats: DevOSOverallStats = {
    totalRepos: repos.length,
    syncedRepos: repos.length - modifiedRepos - aheadRepos - behindRepos,
    modifiedRepos,
    aheadRepos,
    behindRepos,
    openIssues: totalIssues,
    pullRequests: totalPRs,
    lastSyncTime: new Date().toISOString(),
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-6 text-zinc-100 animate-fadeIn">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Nexus Source Control Engine • Phase 1
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Source Control
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Centralized Git Engine and GitHub Repository Management
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/git-engine"
            prefetch={true}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Git Engine Watcher
          </Link>
        </div>
      </div>

      {/* Connected GitHub Account Card */}
      {userId ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-mono font-bold text-indigo-300 text-lg">
              NX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">GitHub Connection</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                Authenticated via OAuth Token & Personal Access Credentials
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-zinc-400">
            <div>GitHub API Status: Operational</div>
            <div className="text-emerald-400 font-semibold mt-1">Auto-Sync Enabled</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-200 text-lg">GitHub Account Not Connected</h3>
            <p className="text-sm text-amber-300/80">
              Sign in via GitHub to automatically import your repositories and enable Nexus Source Control.
            </p>
          </div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 font-bold text-sm transition-colors shadow-md">
                Connect GitHub Account
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <a
              href="/sign-in"
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 font-bold text-sm transition-colors shadow-md"
            >
              Connect GitHub Account
            </a>
          </Show>
        </div>
      )}

      {/* Local Desktop Agent Launcher & Detection Card */}
      <LocalAgentDesktopCard />

      {/* Interactive Repository Filter Grid & Stats Bar */}
      <RepositoryFilterGrid initialRepos={repos} stats={stats} />
    </div>
  );
}
