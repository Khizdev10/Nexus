"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, Show } from "@clerk/nextjs";
import CommitHeatmap from "@/components/CommitHeatmap";
import LocalProjectsScanner from "@/components/LocalProjectsScanner";
import { ContributionDay } from "@/lib/github";
import { History, GitBranch, ExternalLink, FileCode, CheckCircle2, User } from "lucide-react";

interface GitEngineWorkspaceProps {
  token: string | null;
  repos: any[];
  selectedRepo: any;
  commits: any[];
  heatmapData: {
    weeks: ContributionDay[][];
    totalCommits: number;
    currentStreak: number;
    longestStreak: number;
  };
  initialMode?: string;
}

export default function GitEngineWorkspace({
  token,
  repos,
  selectedRepo,
  commits,
  heatmapData,
  initialMode = "local",
}: GitEngineWorkspaceProps) {
  const [activeMode, setActiveMode] = useState<"local" | "github">(
    initialMode === "github" ? "github" : "local"
  );

  const latestCommit = commits[0] || null;

  return (
    <div className="space-y-6">
      {/* Top Mode Tab Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800 shadow-lg">
          <button
            onClick={() => setActiveMode("local")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === "local"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Local PC Projects
          </button>

          <button
            onClick={() => setActiveMode("github")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === "github"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/80"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Remote GitHub Repos
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Active Mode: {activeMode === "local" ? "Local PC Filesystem" : "Remote GitHub REST API"}</span>
        </div>
      </div>

      {/* MODE 1: LOCAL PC PROJECTS */}
      {activeMode === "local" && <LocalProjectsScanner />}

      {/* MODE 2: REMOTE GITHUB REPOSITORIES */}
      {activeMode === "github" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Auth Prompt if GitHub Token is Missing */}
          {!token && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-amber-200 text-lg">Connect Your GitHub Account</h3>
                <p className="text-sm text-amber-300/80">
                  Sign in using GitHub via Clerk to load and manage all your real repositories and live commit activity.
                </p>
              </div>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <button className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 font-bold text-sm shadow-md transition-colors">
                    Sign In with GitHub
                  </button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <div className="shrink-0 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-4 py-2 font-mono text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  GitHub Provider Active
                </div>
              </Show>
            </div>
          )}

          {/* Control Panel Grid — Real GitHub & Workspace Data Only */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Active Repository */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Active Repository</h3>
                <span className="text-xs text-indigo-400 font-mono">
                  {selectedRepo ? selectedRepo.full_name : "No Repo Selected"}
                </span>
              </div>
              {repos.length > 0 ? (
                <form action="" method="GET">
                  <input type="hidden" name="mode" value="github" />
                  <select
                    name="repo"
                    defaultValue={selectedRepo?.name}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {repos.map((r: any) => (
                      <option key={r.id} value={r.name}>
                        {r.name} {r.private ? "(Private)" : "(Public)"}
                      </option>
                    ))}
                  </select>
                </form>
              ) : (
                <div className="text-xs text-zinc-500 italic py-2">
                  No repositories found. Ensure GitHub permissions are granted.
                </div>
              )}
              <p className="text-xs text-zinc-400">
                Selected repository to inspect live commit feeds and heatmap activity.
              </p>
            </div>

            {/* Card 2: Real Latest Commit Feed Status */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Latest Commit Activity</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {commits.length} Loaded
                </span>
              </div>
              {latestCommit ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-100 line-clamp-1">
                    {latestCommit.commit?.message || "Recent Commit"}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <span>SHA: {latestCommit.sha?.substring(0, 7)}</span>
                    <span className="text-zinc-500">
                      {new Date(latestCommit.commit?.author?.date || Date.now()).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-2">No commit history retrieved yet.</div>
              )}
              <p className="text-xs text-zinc-400">
                Live commit feed synchronized directly from GitHub REST API.
              </p>
            </div>

            {/* Card 3: Real GitHub Account Stats */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">GitHub API Connection</h3>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">{repos.length} Repositories</div>
                <div className="text-xs font-mono text-zinc-400">Authenticated via OAuth Token</div>
              </div>
              <p className="text-xs text-zinc-400">
                Tokens auto-refreshed securely through Clerk session.
              </p>
            </div>
          </div>

          {/* 52-Week GitHub Commit Contribution Heatmap Grid */}
          <CommitHeatmap
            weeks={heatmapData.weeks}
            totalCommits={heatmapData.totalCommits}
            currentStreak={heatmapData.currentStreak}
            longestStreak={heatmapData.longestStreak}
            repoName={selectedRepo?.name}
          />

          {/* ENHANCED DETAILED COMMIT LOG MATRIX FOR ACTIVE REPOSITORY */}
          {selectedRepo && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    Detailed Commit History for {selectedRepo.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Recent commit logs, author signatures, SHAs, and file diff shortcuts
                  </p>
                </div>

                <Link
                  href={`/source-control/${selectedRepo.id || selectedRepo.name}?tab=commits`}
                  prefetch={false}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5 shrink-0"
                >
                  <span>Open Full Commit History in Source Control</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {commits.length > 0 ? (
                <div className="space-y-3">
                  {commits.slice(0, 10).map((c: any) => {
                    const authorName = c.commit?.author?.name || c.author?.login || "Developer";
                    const avatarUrl = c.author?.avatar_url;
                    const sha = c.sha || "";
                    const shortSha = sha.substring(0, 7);
                    const dateStr = new Date(c.commit?.author?.date || Date.now()).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <div
                        key={sha}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-800/60 transition-all gap-3"
                      >
                        <div className="flex items-start gap-3">
                          {avatarUrl ? (
                            <Image
                              src={avatarUrl}
                              alt={authorName}
                              width={32}
                              height={32}
                              className="rounded-full border border-zinc-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                              {authorName[0]}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-zinc-100 line-clamp-1">
                              {c.commit?.message || "Commit update"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                              <span className="font-medium text-zinc-300">{authorName}</span>
                              <span>•</span>
                              <span className="font-mono text-zinc-500">{dateStr}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-bold">
                            {shortSha}
                          </span>
                          <Link
                            href={`/source-control/${selectedRepo.id || selectedRepo.name}?tab=commits&sha=${sha}`}
                            prefetch={false}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                          >
                            Inspect Diff →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded-xl">
                  No commit history fetched for this repository.
                </div>
              )}
            </div>
          )}

          {/* All Repositories Grid */}
          {repos.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Your GitHub Repositories</h2>
                  <p className="text-xs text-zinc-400">Live list of repositories from your GitHub account</p>
                </div>
                <span className="text-xs text-zinc-500 font-mono">{repos.length} Total Repos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {repos.map((repo: any) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <div
                      key={repo.id}
                      className={`flex flex-col justify-between p-5 rounded-xl border transition-all space-y-3 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                          : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-white hover:text-indigo-400 transition-colors line-clamp-1 flex items-center gap-1.5"
                          >
                            <FileCode className="w-4 h-4 text-zinc-400 shrink-0" />
                            {repo.name}
                          </a>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              repo.private
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}
                          >
                            {repo.private ? "Private" : "Public"}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-mono">{repo.default_branch || "main"}</span>
                        <Link
                          href={`/source-control/${repo.id || repo.name}`}
                          prefetch={false}
                          className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
