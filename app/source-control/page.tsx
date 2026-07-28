import Link from "next/link";
import Image from "next/image";
import fs from "fs";
import path from "path";
import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, Show } from "@clerk/nextjs";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { getLocalGitStatus } from "@/lib/services/git/status";
import { DevOSOverallStats, DevOSRepository } from "@/types/devos";

export default async function SourceControlHomePage() {
  // Parallelize authentication calls to eliminate waterfall delays
  const [user, token] = await Promise.all([
    currentUser(),
    getGitHubOAuthToken(),
  ]);

  const repos: DevOSRepository[] = token ? await fetchGitHubUserRepositories(token) : [];

  let modifiedRepos = 0;
  let aheadRepos = 0;
  let behindRepos = 0;
  let totalIssues = 0;
  let totalPRs = 0;

  repos.forEach((repo) => {
    totalIssues += repo.openIssuesCount;
    totalPRs += repo.openPullRequestsCount;

    if (repo.localPath && fs.existsSync(repo.localPath) && fs.existsSync(path.join(repo.localPath, ".git"))) {
      const localStatus = getLocalGitStatus(repo.localPath);
      repo.currentBranch = localStatus.branch;
      repo.aheadCount = localStatus.ahead;
      repo.behindCount = localStatus.behind;
      repo.uncommittedCount =
        localStatus.modifiedFiles.length +
        localStatus.stagedFiles.length +
        localStatus.untrackedFiles.length;

      // Authoritative status evaluation strictly based on local Git working tree state
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
  });

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

  const getStatusBadge = (status: DevOSRepository["status"]) => {
    switch (status) {
      case "modified":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MODIFIED</span>;
      case "behind":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">BEHIND</span>;
      case "ahead":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AHEAD</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SYNCED</span>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-6 text-zinc-100 animate-fadeIn">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            DevOS Source Control Module • Phase 1
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
      {user ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.firstName || "GitHub User"}
                width={56}
                height={56}
                className="rounded-full border-2 border-indigo-500/40"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold text-white">
                {user.firstName?.[0] || "U"}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  CONNECTED
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400 mt-1">
                {user.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>

          <div className="text-right text-xs font-mono text-zinc-400">
            <div>GitHub API Token Status: Active</div>
            <div className="text-emerald-400 font-semibold mt-1">Auto-Sync Enabled</div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-amber-200 text-lg">GitHub Account Not Connected</h3>
            <p className="text-sm text-amber-300/80">
              Sign in via GitHub to automatically import your repositories and enable DevOS Source Control.
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

      {/* Overall Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Total Repos</div>
          <div className="text-2xl font-bold text-white">{stats.totalRepos}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Synced</div>
          <div className="text-2xl font-bold text-emerald-400">{stats.syncedRepos}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Modified</div>
          <div className="text-2xl font-bold text-amber-400">{stats.modifiedRepos}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Ahead</div>
          <div className="text-2xl font-bold text-indigo-400">{stats.aheadRepos}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Behind</div>
          <div className="text-2xl font-bold text-rose-400">{stats.behindRepos}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Open Issues</div>
          <div className="text-2xl font-bold text-white">{stats.openIssues}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Pull Requests</div>
          <div className="text-2xl font-bold text-purple-400">{stats.pullRequests}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Last Sync</div>
          <div className="text-xs font-mono text-zinc-300 truncate pt-1">
            {new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Repository Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Imported Repositories ({repos.length})</h2>
          <span className="text-xs text-zinc-500 font-mono">DevOS Local Path Mapping</span>
        </div>

        {repos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {repo.name}
                    </h3>
                    {getStatusBadge(repo.status)}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                    {repo.description || "No repository description."}
                  </p>
                </div>

                <div className="space-y-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Language</span>
                    <span className="font-semibold text-zinc-200">{repo.language || "TypeScript"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Current Branch</span>
                    <span className="font-mono text-indigo-400 font-medium">git / {repo.currentBranch}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Ahead / Behind</span>
                    <span className="font-mono text-zinc-300">
                      +{repo.aheadCount} / -{repo.behindCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>Last Push</span>
                    <span>{new Date(repo.lastPush).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/source-control/${repo.id}`}
                    prefetch={true}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/20"
                  >
                    Open Repository Dashboard →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
            No repositories found. Sign in via GitHub to sync your account.
          </div>
        )}
      </div>
    </div>
  );
}
