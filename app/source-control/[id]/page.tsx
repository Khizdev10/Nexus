import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  History,
  GitBranch,
  CircleDot,
  GitPullRequest,
  Settings,
  Bot,
  ExternalLink,
  X,
  FileCode,
  Sparkles,
} from "lucide-react";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { fetchGitHubRepoCommits, fetchGitHubCommitDetails } from "@/lib/services/github/commits";
import { getLocalGitStatus } from "@/lib/services/git/status";
import { DevOSCommit } from "@/types/devos";
import GitQuickActionsBar from "@/components/devos/GitQuickActionsBar";

interface RepositoryDashboardProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; sha?: string }>;
}

export default async function RepositoryDashboardPage(props: RepositoryDashboardProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const repoId = params.id;
  const activeTab = searchParams.tab || "overview";
  const selectedSha = searchParams.sha || null;

  const token = await getGitHubOAuthToken();
  const repos = token ? await fetchGitHubUserRepositories(token) : [];
  const repo = repos.find((r) => r.id === repoId || r.name === repoId) || repos[0] || null;

  const owner = repo?.cloneUrl.split("github.com/")[1]?.split("/")[0] || "owner";
  const commits: DevOSCommit[] =
    token && repo ? await fetchGitHubRepoCommits(token, owner, repo.name, 30) : [];

  const commitDetail: DevOSCommit | null =
    token && repo && selectedSha
      ? await fetchGitHubCommitDetails(token, owner, repo.name, selectedSha)
      : null;

  const localStatus = repo?.localPath ? getLocalGitStatus(repo.localPath) : null;

  if (!repo) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-zinc-500 font-mono">
        Repository not found. <Link href="/source-control" className="text-indigo-400 underline">Return to Source Control</Link>
      </div>
    );
  }

  const uncommittedCount =
    (localStatus?.modifiedFiles.length || 0) +
    (localStatus?.stagedFiles.length || 0) +
    (localStatus?.untrackedFiles.length || 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-6 text-zinc-100">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
            <Link href="/source-control" className="hover:text-white transition-colors">Source Control</Link>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">{repo.name}</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            {repo.name}
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
              {repo.visibility.toUpperCase()}
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {repo.description || "No repository description provided."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={repo.cloneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <span>Open in GitHub</span>
            <ExternalLink className="w-4 h-4 text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto">
        {[
          { key: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
          { key: "commits", label: "Commits", icon: <History className="w-4 h-4" /> },
          { key: "branches", label: "Branches", icon: <GitBranch className="w-4 h-4" /> },
          { key: "issues", label: `Issues (${repo.openIssuesCount})`, icon: <CircleDot className="w-4 h-4" /> },
          { key: "pull-requests", label: `Pull Requests (${repo.openPullRequestsCount})`, icon: <GitPullRequest className="w-4 h-4" /> },
          { key: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/source-control/${repo.id}?tab=${tab.key}`}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Functional Git Quick Actions Bar */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Git Quick Actions
            </h2>

            <GitQuickActionsBar
              repoId={repo.id}
              repoName={repo.name}
              localPath={repo.localPath || `c:\\coding\\projects\\${repo.name}`}
              uncommittedCount={uncommittedCount}
              aheadCount={localStatus?.ahead || 0}
            />
          </div>

          {/* Repository Information & Git Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Repo Meta Details */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-3">
                Repository Information
              </h3>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Default Branch</span>
                  <span className="font-mono text-indigo-400 font-bold">{repo.defaultBranch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Language</span>
                  <span className="font-semibold text-white">{repo.language || "TypeScript"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Visibility</span>
                  <span className="font-bold text-zinc-300 uppercase">{repo.visibility}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Local Path</span>
                  <span className="font-mono text-zinc-400 truncate max-w-[180px]">{repo.localPath}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">SSH URL</span>
                  <span className="font-mono text-zinc-400 truncate max-w-[180px]">{repo.sshUrl}</span>
                </div>
              </div>
            </div>

            {/* Git Working Tree Status */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-3">
                Git Working Tree Status
              </h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Current Branch</span>
                  <span className="font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {localStatus?.branch || repo.defaultBranch}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Working Tree</span>
                  {localStatus?.isClean ? (
                    <span className="text-emerald-400 font-semibold">Clean (0 edits)</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">
                      {uncommittedCount} Modified Files
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Ahead / Behind Remote</span>
                  <span className="font-mono text-zinc-200">
                    +{localStatus?.ahead || 0} ahead / -{localStatus?.behind || 0} behind
                  </span>
                </div>
              </div>
            </div>

            {/* Sync Dates */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
              <h3 className="text-base font-bold text-white border-b border-zinc-800 pb-3">
                Sync Timestamps
              </h3>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Push</span>
                  <span>{new Date(repo.lastPush).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Fetch</span>
                  <span>Just now</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Last Commit</span>
                  <span>{commits[0] ? commits[0].relativeTime : "Recently"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMMITS */}
      {activeTab === "commits" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Commit History ({commits.length})</h2>
            <span className="text-xs font-mono text-zinc-500">Click any commit to view diff details</span>
          </div>

          <div className="space-y-3">
            {commits.map((c) => (
              <Link
                key={c.sha}
                href={`/source-control/${repo.id}?tab=commits&sha=${c.sha}`}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-3 ${
                  selectedSha === c.sha
                    ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                    : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {c.authorAvatarUrl ? (
                    <Image
                      src={c.authorAvatarUrl}
                      alt={c.authorName}
                      width={32}
                      height={32}
                      className="rounded-full border border-zinc-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {c.authorName[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-zinc-100 line-clamp-1">{c.message}</div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <span className="font-medium text-zinc-300">{c.authorName}</span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500">{c.relativeTime}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-bold">
                    {c.shortSha}
                  </span>
                  <span className="text-xs text-zinc-400 hover:text-white transition-colors">Details →</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Commit Details Modal */}
          {commitDetail && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
              <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
                  <div>
                    <h3 className="font-bold text-white text-base">{commitDetail.message}</h3>
                    <p className="text-xs font-mono text-indigo-400 mt-0.5">Commit: {commitDetail.sha}</p>
                  </div>
                  <Link
                    href={`/source-control/${repo.id}?tab=commits`}
                    className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </Link>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                  {/* AI Summary */}
                  {commitDetail.aiSummary && (
                    <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-xs text-purple-200 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-purple-300 font-bold block mb-1">AI Code Analysis</strong>
                        {commitDetail.aiSummary}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs">
                    <span className="text-zinc-400">Total Lines Changed</span>
                    <div className="flex items-center gap-4 font-mono font-bold">
                      <span className="text-emerald-400">+{commitDetail.stats?.additions || 0} additions</span>
                      <span className="text-rose-400">-{commitDetail.stats?.deletions || 0} deletions</span>
                    </div>
                  </div>

                  {/* Files Changed */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Files Changed ({commitDetail.files?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {commitDetail.files?.map((file, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 font-mono text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-200 flex items-center gap-2">
                              <FileCode className="w-4 h-4 text-indigo-400" />
                              {file.filename}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {file.status}
                            </span>
                          </div>
                          {file.patch && (
                            <pre className="p-3 rounded-lg bg-zinc-950 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                              {file.patch}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 text-right">
                  <Link
                    href={`/source-control/${repo.id}?tab=commits`}
                    className="rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-white transition-colors inline-block"
                  >
                    Close Details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* OTHER TABS PLACEHOLDER */}
      {["branches", "issues", "pull-requests", "settings"].includes(activeTab) && (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500 text-sm space-y-2">
          <div className="text-2xl font-bold text-white capitalize">{activeTab} Module</div>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Ready for DevOS Phase 2 expansion. Modular architectural interfaces are established.
          </p>
        </div>
      )}
    </div>
  );
}
