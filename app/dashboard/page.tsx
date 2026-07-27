import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getUserGitHubToken, getUserRepositories } from "@/lib/github";

export default async function DashboardPage() {
  const user = await currentUser();
  const token = await getUserGitHubToken();
  const repos = token ? await getUserRepositories(token) : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Welcome back, {user?.firstName || "Developer"}! Manage your repositories and AI Git Engine workflows.
          </p>
        </div>
        <Link
          href="/dashboard/git-engine"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Open Git Engine
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Active GitHub Repos</span>
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">
            {token ? repos.length : "—"}
          </div>
          <div className="text-xs text-emerald-400 font-medium">
            {token ? "Live synced via GitHub API" : "Sign in with GitHub to sync"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Git Engine Triggers</span>
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">1,420</div>
          <div className="text-xs text-purple-400 font-medium">Auto-reviews & Merges</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-sm font-medium">Build Health Rate</span>
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white">99.4%</div>
          <div className="text-xs text-emerald-400 font-medium">All systems operational</div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 space-y-6">
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/git-engine"
            className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 hover:border-indigo-500/50 transition-all group"
          >
            <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                Git Engine & Repositories
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Browse your live GitHub repos, commits, and AI branch review automation.
              </p>
            </div>
          </Link>

          <div className="flex items-start gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800/80 transition-all opacity-80">
            <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-white">Repository Insights</div>
              <p className="text-xs text-zinc-400 mt-1">
                Track commit velocity, code coverage trends, and pull request latency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
