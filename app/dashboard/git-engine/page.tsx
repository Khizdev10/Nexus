import Link from "next/link";
import {
  getUserGitHubToken,
  getUserRepositories,
  getRepoCommits,
  generateContributionData,
} from "@/lib/github";
import GitEngineWorkspace from "@/components/GitEngineWorkspace";

interface GitEnginePageProps {
  searchParams: Promise<{ repo?: string; mode?: string }>;
}

export default async function GitEnginePage({ searchParams }: GitEnginePageProps) {
  const params = await searchParams;
  const token = await getUserGitHubToken();
  const initialMode = params.mode || "local";

  const repos = token ? await getUserRepositories(token, 20) : [];

  // Determine selected repo
  const selectedRepoName = params.repo || (repos.length > 0 ? repos[0].name : "");
  const selectedRepo = repos.find((r) => r.name === selectedRepoName) || repos[0] || null;

  // Fetch commit history in parallel with heatmap generation
  const commits =
    token && selectedRepo
      ? await getRepoCommits(token, selectedRepo.owner?.login || "owner", selectedRepo.name, 30)
      : [];

  const heatmapData = generateContributionData(commits);

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full p-4 sm:p-6 animate-fadeIn">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Git Engine • Real-time Workspace Sync
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Git Engine
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time local filesystem monitoring, GitHub synchronization, and automated AI code reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/source-control"
            prefetch={true}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ← Go to Source Control
          </Link>
        </div>
      </div>

      {/* Interactive Client Workspace */}
      <GitEngineWorkspace
        token={token}
        repos={repos}
        selectedRepo={selectedRepo}
        commits={commits}
        heatmapData={heatmapData}
        initialMode={initialMode}
      />
    </div>
  );
}
