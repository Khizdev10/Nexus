"use client";

import React, { useState, useEffect, useCallback } from "react";
import { LocalProject, LocalFileChange } from "@/app/api/local-projects/route";
import FileDiffViewer from "@/components/FileDiffViewer";
import AiPushAdvisor from "@/components/AiPushAdvisor";

export default function LocalProjectsScanner() {
  const [isMounted, setIsMounted] = useState(false);
  const [rootPath, setRootPath] = useState("c:\\coding\\projects");
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Modal States
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchLocalProjects = useCallback(async (path: string) => {
    try {
      setLoading((prev) => (projects.length === 0 ? true : prev));
      const res = await fetch(`/api/local-projects?rootPath=${encodeURIComponent(path)}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch local projects");
      }

      const data = await res.json();
      setProjects(data.projects || []);
      setError(null);
      setLastSyncTime(new Date());

      // Retain or select first project
      if (data.projects && data.projects.length > 0) {
        setSelectedProject((prev) => {
          if (!prev) return data.projects[0];
          const updated = data.projects.find((p: LocalProject) => p.name === prev.name);
          return updated || data.projects[0];
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to scan local projects");
    } finally {
      setLoading(false);
    }
  }, [projects.length]);

  useEffect(() => {
    fetchLocalProjects(rootPath);
  }, [rootPath, fetchLocalProjects]);

  // Live Auto-Refresh Polling Every 3 Seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLocalProjects(rootPath);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, rootPath, fetchLocalProjects]);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLocalProjects(rootPath);
  };

  const getStatusBadge = (status: LocalFileChange["status"]) => {
    switch (status) {
      case "M":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MODIFIED</span>;
      case "A":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ADDED</span>;
      case "D":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">DELETED</span>;
      case "??":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">UNTRACKED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">{status}</span>;
    }
  };

  if (!isMounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-500 text-sm font-mono animate-pulse">
        Initializing local PC file watcher...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Directory Bar & Live Sync Status Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Local PC Projects Sync
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live filesystem watcher scanning your computer for local Git edits & uncommitted files
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                autoRefresh
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`}></span>
              {autoRefresh ? "Live Sync ON (3s)" : "Live Sync OFF"}
            </button>

            <button
              onClick={() => fetchLocalProjects(rootPath)}
              className="rounded-xl border border-zinc-800 bg-zinc-800/80 hover:bg-zinc-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Directory Input Form */}
        <form onSubmit={handlePathSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="e.g. c:\coding\projects"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-white font-mono placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-md shadow-indigo-500/20 shrink-0"
          >
            Scan Path
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Root: {rootPath}</span>
          <span suppressHydrationWarning>Last Synced: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-medium">
          ⚠️ {error}
        </div>
      )}

      {loading && projects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm font-mono animate-pulse border border-dashed border-zinc-800 rounded-2xl">
          Scanning local PC project directories...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects List Column */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between px-1">
              <span>Local Projects ({projects.length})</span>
              <span className="text-xs font-mono text-zinc-400">{projects.reduce((acc, p) => acc + p.uncommittedCount, 0)} Total Edits</span>
            </h3>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {projects.map((project) => {
                const isSelected = selectedProject?.name === project.name;
                const hasChanges = project.uncommittedCount > 0;

                return (
                  <button
                    key={project.name}
                    onClick={() => setSelectedProject(project)}
                    className={`w-full text-left p-4 rounded-xl border transition-all space-y-2 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                        : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm line-clamp-1">{project.name}</span>
                      {hasChanges ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          {project.uncommittedCount} edits
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          Clean
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-mono text-indigo-400 text-[11px]">git / {project.branch}</span>
                      <span className="text-[10px] text-zinc-500" suppressHydrationWarning>
                        {new Date(project.lastModifiedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Project Live File Monitor & Activity Inspector */}
          <div className="lg:col-span-2 space-y-6">
            {selectedProject ? (
              <div className="space-y-6">
                {/* Project Header Summary */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-white">{selectedProject.name}</h3>
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {selectedProject.branch}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-1 break-all">
                        {selectedProject.fullPath}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {selectedProject.uncommittedCount > 0 && (
                        <button
                          onClick={() => setIsAiAdvisorOpen(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-purple-500/20"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Analyze & Push with AI
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real-time Modified Files List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Real-Time Modified Files (Click file to view diff)</span>
                      <span className="text-xs font-mono text-zinc-400">
                        {selectedProject.changes.length} files
                      </span>
                    </h4>

                    {selectedProject.changes.length > 0 ? (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                        {selectedProject.changes.map((change, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedDiffFile(change.filePath)}
                            className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-indigo-500/40 cursor-pointer font-mono text-xs transition-colors group"
                          >
                            <span className="text-zinc-200 group-hover:text-indigo-300 truncate max-w-md flex items-center gap-2">
                              <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {change.filePath}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">Preview Diff →</span>
                              {getStatusBadge(change.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded-xl">
                        No uncommitted local file modifications in this project.
                      </div>
                    )}
                  </div>
                </div>

                {/* Local Recent Git Commits Feed */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white">Recent Local Commits (`git log`)</h4>

                  {selectedProject.recentCommits.length > 0 ? (
                    <div className="space-y-2.5">
                      {selectedProject.recentCommits.map((commit) => (
                        <div
                          key={commit.sha}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-800/60 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-bold shrink-0">
                              {commit.sha}
                            </span>
                            <span className="font-semibold text-zinc-200 line-clamp-1">{commit.message}</span>
                          </div>
                          <div className="flex items-center gap-3 text-zinc-400 shrink-0 text-[11px]">
                            <span>{commit.author}</span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500" suppressHydrationWarning>{commit.relativeTime}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-500 text-xs italic border border-dashed border-zinc-800 rounded-xl">
                      No recent commits found for this project.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl">
                Select a project from the left to inspect live file edits.
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Diff Previewer Modal */}
      {selectedProject && selectedDiffFile && (
        <FileDiffViewer
          isOpen={!!selectedDiffFile}
          onClose={() => setSelectedDiffFile(null)}
          projectPath={selectedProject.fullPath}
          filePath={selectedDiffFile}
        />
      )}

      {/* AI Pre-Push Advisor Modal */}
      {selectedProject && isAiAdvisorOpen && (
        <AiPushAdvisor
          isOpen={isAiAdvisorOpen}
          onClose={() => setIsAiAdvisorOpen(false)}
          projectPath={selectedProject.fullPath}
          projectName={selectedProject.name}
          uncommittedCount={selectedProject.uncommittedCount}
        />
      )}
    </div>
  );
}
