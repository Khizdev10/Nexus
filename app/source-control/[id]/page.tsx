import Link from "next/link";
import Image from "next/image";
import {
  BarChart3,
  History,
  GitBranch,
  CircleDot,
  GitPullRequest,
  Settings,
  ExternalLink,
  X,
  FileCode,
  Sparkles,
  MessageSquare,
  FolderTree,
  Folder,
  Shield,
} from "lucide-react";
import { getGitHubOAuthToken, fetchGitHubUserRepositories } from "@/lib/services/github/repositories";
import { fetchGitHubRepoCommits, fetchGitHubCommitDetails } from "@/lib/services/github/commits";
import { fetchGitHubRepoIssues, DevOSIssue } from "@/lib/services/github/issues";
import { fetchGitHubRepoPullRequests, DevOSPullRequest } from "@/lib/services/github/pulls";
import { getLocalAndRemoteBranches, DevOSBranch } from "@/lib/services/git/branches";
import { getLocalGitStatus } from "@/lib/services/git/status";
import { DevOSCommit } from "@/types/devos";
import GitQuickActionsBar from "@/components/devos/GitQuickActionsBar";
import BranchControls from "@/components/devos/BranchControls";
import RepositoryFilesExplorer from "@/components/devos/RepositoryFilesExplorer";

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

  // Parallelize tab data fetching
  const [commits, issues, pulls] = await Promise.all([
    token && repo ? fetchGitHubRepoCommits(token, owner, repo.name, 30) : Promise.resolve([]),
    token && repo ? fetchGitHubRepoIssues(token, owner, repo.name, "all") : Promise.resolve([]),
    token && repo ? fetchGitHubRepoPullRequests(token, owner, repo.name, "all") : Promise.resolve([]),
  ]);

  const commitDetail: DevOSCommit | null =
    token && repo && selectedSha
      ? await fetchGitHubCommitDetails(token, owner, repo.name, selectedSha)
      : null;

  const localStatus = repo?.localPath ? getLocalGitStatus(repo.localPath) : null;
  const branches: DevOSBranch[] = repo?.localPath ? getLocalAndRemoteBranches(repo.localPath) : [];

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
          { key: "files", label: "Files", icon: <FolderTree className="w-4 h-4" /> },
          { key: "commits", label: `Commits (${commits.length})`, icon: <History className="w-4 h-4" /> },
          { key: "branches", label: `Branches (${branches.length})`, icon: <GitBranch className="w-4 h-4" /> },
          { key: "issues", label: `Issues (${issues.length})`, icon: <CircleDot className="w-4 h-4" /> },
          { key: "pull-requests", label: `Pull Requests (${pulls.length})`, icon: <GitPullRequest className="w-4 h-4" /> },
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

      {/* TAB 2: FILES (CODE EXPLORER WITH COMMIT TREE CHECKPOINT FALLBACK) */}
      {activeTab === "files" && (
        <RepositoryFilesExplorer
          repoId={repo.id}
          repoName={repo.name}
          localPath={repo.localPath || `c:\\coding\\projects\\${repo.name}`}
          commits={commits}
        />
      )}

      {/* TAB 3: COMMITS */}
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

      {/* TAB 4: BRANCHES */}
      {activeTab === "branches" && (
        <BranchControls
          repoId={repo.id}
          localPath={repo.localPath || `c:\\coding\\projects\\${repo.name}`}
          branches={branches}
        />
      )}

      {/* TAB 5: ISSUES */}
      {activeTab === "issues" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-indigo-400" />
                GitHub Issues ({issues.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Live issues fetched from GitHub repository tracker</p>
            </div>
            <a
              href={`${repo.cloneUrl}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/20"
            >
              <span>New Issue on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue: DevOSIssue) => (
                <a
                  key={issue.id}
                  href={issue.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 transition-all gap-4 group"
                >
                  <div className="flex items-start gap-3">
                    <CircleDot className={`w-5 h-5 shrink-0 mt-0.5 ${issue.state === "open" ? "text-emerald-400" : "text-purple-400"}`} />
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                        <span>#{issue.number}</span>
                        <span>{issue.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span>opened by <strong className="text-zinc-300">{issue.authorName}</strong></span>
                        <span>•</span>
                        <span>{new Date(issue.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        {issue.labels.length > 0 && (
                          <div className="flex items-center gap-1.5 ml-2">
                            {issue.labels.map((l, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700"
                              >
                                {l.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1 bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
                      {issue.commentsCount}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      issue.state === "open"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    }`}>
                      {issue.state}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl space-y-2">
              <CircleDot className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="font-bold text-zinc-300">No Issues Found</div>
              <p className="text-xs text-zinc-500">There are no open or closed issues in this repository.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: PULL REQUESTS */}
      {activeTab === "pull-requests" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-purple-400" />
                Pull Requests ({pulls.length})
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Live pull requests fetched from GitHub repository tracker</p>
            </div>
            <a
              href={`${repo.cloneUrl}/pulls`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-colors flex items-center gap-2 shadow-md shadow-purple-500/20"
            >
              <span>New Pull Request</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {pulls.length > 0 ? (
            <div className="space-y-3">
              {pulls.map((pr: DevOSPullRequest) => (
                <a
                  key={pr.id}
                  href={pr.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900 transition-all gap-4 group"
                >
                  <div className="flex items-start gap-3">
                    <GitPullRequest className={`w-5 h-5 shrink-0 mt-0.5 ${
                      pr.state === "merged" ? "text-purple-400" : pr.state === "open" ? "text-emerald-400" : "text-rose-400"
                    }`} />
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors flex items-center gap-2">
                        <span>#{pr.number}</span>
                        <span>{pr.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span>opened by <strong className="text-zinc-300">{pr.authorName}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-purple-400">{pr.headBranch} → {pr.baseBranch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                      pr.state === "merged"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : pr.state === "open"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}>
                      {pr.state}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl space-y-2">
              <GitPullRequest className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="font-bold text-zinc-300">No Pull Requests Found</div>
              <p className="text-xs text-zinc-500">There are no open or merged pull requests in this repository.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-8 max-w-4xl">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Repository Settings & Configuration
            </h2>
            <p className="text-xs text-zinc-400">Manage local path mappings, clone URLs, and remote Git sync settings.</p>
          </div>

          <div className="space-y-6">
            {/* General Info Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-400" />
                Repository Details & Local Mapping
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-zinc-500 block mb-1">Repository Name</label>
                  <input
                    type="text"
                    disabled
                    value={repo.name}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">Default Branch</label>
                  <input
                    type="text"
                    disabled
                    value={repo.defaultBranch}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-300 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-zinc-500 block mb-1">Local Hard Drive Path</label>
                  <input
                    type="text"
                    disabled
                    value={repo.localPath || `c:\\coding\\projects\\${repo.name}`}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-indigo-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Git Security Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                Git Remote URLs & OAuth Access
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-500 block mb-1">HTTPS Clone URL</label>
                  <input
                    type="text"
                    disabled
                    value={repo.cloneUrl}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-300 font-mono"
                  />
                </div>
                <div>
                  <label className="text-zinc-500 block mb-1">SSH Remote URL</label>
                  <input
                    type="text"
                    disabled
                    value={repo.sshUrl}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-300 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
