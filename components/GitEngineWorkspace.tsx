"use client";

import React, { useState } from "react";
import Image from "next/image";
import { SignInButton, Show } from "@clerk/nextjs";
import CommitHeatmap from "@/components/CommitHeatmap";
import LocalProjectsScanner from "@/components/LocalProjectsScanner";
import { ContributionDay } from "@/lib/github";

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
                <a
                  href="/sign-in"
                  className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-5 py-2.5 font-bold text-sm shadow-md transition-colors"
                >
                  Link GitHub Provider
                </a>
              </Show>
            </div>
          )}

          {/* 52-Week GitHub Commit Contribution Heatmap Grid */}
          <CommitHeatmap
            weeks={heatmapData.weeks}
            totalCommits={heatmapData.totalCommits}
            currentStreak={heatmapData.currentStreak}
            longestStreak={heatmapData.longestStreak}
            repoName={selectedRepo?.name}
          />

          {/* Control Panel Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
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
                Select a repository to view live commit histories and trigger AI reviews.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">AI Code Reviewer</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Branch Health Index</span>
                  <span className="text-emerald-400 font-bold">100/100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 w-[100%]"></div>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Scanning commits for performance bottlenecks and syntax errors.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">GitHub API Status</h3>
                <span className="text-xs text-emerald-400 font-medium">Rate Limit: OK</span>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">{repos.length} Repositories</div>
                <div className="text-xs text-zinc-400">Fetched via GitHub REST API</div>
              </div>
              <p className="text-xs text-zinc-400">
                Tokens auto-refreshed securely through Clerk session.
              </p>
            </div>
          </div>

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
                      className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
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
                            <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
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

                        <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                          {repo.description || "No description provided."}
                        </p>
                      </div>

                      <div className="border-t border-zinc-800/60 pt-4 mt-4 flex items-center justify-between text-xs text-zinc-400">
                        <div className="flex items-center gap-3">
                          {repo.language && (
                            <span className="flex items-center gap-1 text-zinc-300 font-medium">
                              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                              {repo.language}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-zinc-400">
                            ⭐ {repo.stargazers_count}
                          </span>
                        </div>

                        <a
                          href={`/dashboard/git-engine?mode=github&repo=${repo.name}`}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          View Commits →
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Selected Repository Live Commit Feed */}
          {selectedRepo && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Commits for <span className="text-indigo-400">{selectedRepo.full_name}</span>
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Default Branch: <span className="font-mono text-zinc-300">{selectedRepo.default_branch}</span>
                  </p>
                </div>
                <a
                  href={selectedRepo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-700 transition-colors shrink-0"
                >
                  Open in GitHub ↗
                </a>
              </div>

              <div className="space-y-3">
                {commits.length > 0 ? (
                  commits.map((c: any) => (
                    <div
                      key={c.sha}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-800/60 transition-colors gap-3"
                    >
                      <div className="flex items-start gap-3">
                        {c.author?.avatar_url ? (
                          <Image
                            src={c.author.avatar_url}
                            alt={c.commit.author.name}
                            width={32}
                            height={32}
                            className="rounded-full border border-zinc-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {c.commit.author.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-semibold text-zinc-100 line-clamp-1">
                            {c.commit.message}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                            <span className="font-medium text-zinc-300">{c.commit.author.name}</span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500">
                              {new Date(c.commit.author.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-bold">
                          {c.sha.substring(0, 7)}
                        </span>
                        <a
                          href={c.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                          View ↗
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-500 text-sm italic border border-dashed border-zinc-800 rounded-xl">
                    No commits retrieved for this repository.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
