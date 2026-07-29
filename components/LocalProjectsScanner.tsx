"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { LocalProject, LocalFileChange } from "@/app/api/local-projects/route";
import FileDiffViewer from "@/components/FileDiffViewer";
import AiPushAdvisor from "@/components/AiPushAdvisor";
import LocalAgentDesktopCard from "@/components/agent/LocalAgentDesktopCard";
import { UploadCloud, CheckCircle2, Lock, Globe, ExternalLink, X } from "lucide-react";

interface LocalProjectsScannerProps {
  gitHubRepos?: any[];
}

export default function LocalProjectsScanner({ gitHubRepos = [] }: LocalProjectsScannerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [rootPath, setRootPath] = useState("c:\\coding\\projects");
  const [savedPaths, setSavedPaths] = useState<string[]>([]);
  const [projects, setProjects] = useState<LocalProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<LocalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Modal States
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  // Publish to GitHub Modal States
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishRepoName, setPublishRepoName] = useState("");
  const [publishIsPrivate, setPublishIsPrivate] = useState(true);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccessUrl, setPublishSuccessUrl] = useState<string | null>(null);

  // Load saved paths and last-used rootPath from localStorage
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem("nexus-project-paths");
      if (stored) {
        const paths: string[] = JSON.parse(stored);
        setSavedPaths(paths);
      }
      const lastPath = localStorage.getItem("nexus-active-root-path");
      if (lastPath) {
        setRootPath(lastPath);
      }
    } catch {}
  }, []);

  // Persist active rootPath to localStorage whenever it changes
  const setAndPersistRootPath = useCallback((newPath: string) => {
    setRootPath(newPath);
    try { localStorage.setItem("nexus-active-root-path", newPath); } catch {}
  }, []);

  // Save a new path to the saved paths list
  const addSavedPath = useCallback((pathToSave: string) => {
    setSavedPaths((prev) => {
      const normalized = pathToSave.trim();
      if (!normalized || prev.includes(normalized)) return prev;
      const updated = [...prev, normalized];
      try { localStorage.setItem("nexus-project-paths", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Remove a saved path
  const removeSavedPath = useCallback((pathToRemove: string) => {
    setSavedPaths((prev) => {
      const updated = prev.filter((p) => p !== pathToRemove);
      try { localStorage.setItem("nexus-project-paths", JSON.stringify(updated)); } catch {}
      return updated;
    });
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
    if (isMounted) fetchLocalProjects(rootPath);
  }, [rootPath, isMounted, fetchLocalProjects]);

  // Live Auto-Refresh Polling Every 3 Seconds
  useEffect(() => {
    if (!autoRefresh || !isMounted) return;
    const interval = setInterval(() => {
      fetchLocalProjects(rootPath);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, rootPath, isMounted, fetchLocalProjects]);

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAndPersistRootPath(rootPath);
    addSavedPath(rootPath);
    fetchLocalProjects(rootPath);
  };

  // Combine scanned local filesystem projects with remote GitHub Repositories into a complete list
  const combinedProjects = useMemo(() => {
    const existingNames = new Set(projects.map((p) => p.name.toLowerCase()));
    
    const extraFromGitHub: LocalProject[] = (gitHubRepos || [])
      .filter((repo: any) => {
        const name = repo.name || repo.id;
        return name && !existingNames.has(name.toLowerCase());
      })
      .map((repo: any) => {
        const repoName = repo.name || repo.id;
        const isNexus = repoName.toLowerCase() === "nexus";
        const fullPath = isNexus ? "c:\\coding\\projects\\devi" : `c:\\coding\\projects\\${repoName}`;
        return {
          name: repoName,
          fullPath,
          isGitRepo: true,
          branch: repo.default_branch || repo.defaultBranch || "main",
          uncommittedCount: 0,
          changes: [],
          recentCommits: [],
          lastModifiedDate: repo.updated_at || repo.updatedAt || new Date().toISOString(),
        };
      });

    return [...projects, ...extraFromGitHub];
  }, [projects, gitHubRepos]);

  // Set of GitHub repository names to check if a project is already published
  const publishedRepoNames = useMemo(() => {
    return new Set((gitHubRepos || []).map((r: any) => (r.name || r.id || "").toLowerCase()));
  }, [gitHubRepos]);

  // Auto-select first combined project if none selected
  useEffect(() => {
    if (!selectedProject && combinedProjects.length > 0) {
      setSelectedProject(combinedProjects[0]);
    }
  }, [combinedProjects, selectedProject]);

  const openPublishModal = (projName: string) => {
    setPublishRepoName(projName);
    setPublishIsPrivate(true);
    setPublishError(null);
    setPublishSuccessUrl(null);
    setIsPublishModalOpen(true);
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !publishRepoName.trim()) return;

    setPublishLoading(true);
    setPublishError(null);

    try {
      const res = await fetch("/api/github/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: publishRepoName.trim(),
          isPrivate: publishIsPrivate,
          localPath: selectedProject.fullPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish repository");
      }

      setPublishSuccessUrl(data.htmlUrl);
      fetchLocalProjects(rootPath);
    } catch (err: any) {
      setPublishError(err.message || "Failed to publish repository to GitHub");
    } finally {
      setPublishLoading(false);
    }
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
      {/* 1-Click Desktop Agent Card */}
      <LocalAgentDesktopCard />

      {/* Search Directory Bar & Live Sync Status Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Local PC Projects & Workspace Sync
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

        {/* Saved Project Paths Quick Selector */}
        {savedPaths.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Saved Directories:</span>
            <div className="flex flex-wrap gap-2">
              {savedPaths.map((sp) => (
                <div
                  key={sp}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer group ${
                    sp === rootPath
                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                      : "bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAndPersistRootPath(sp);
                      fetchLocalProjects(sp);
                    }}
                    className="truncate max-w-[240px]"
                  >
                    {sp}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSavedPath(sp);
                    }}
                    className="text-zinc-600 hover:text-rose-400 transition-colors ml-1 shrink-0"
                    title="Remove saved path"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Root Directory: {rootPath}</span>
          <span suppressHydrationWarning>Last Synced: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-medium">
          ⚠️ {error}
        </div>
      )}

      {loading && combinedProjects.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm font-mono animate-pulse border border-dashed border-zinc-800 rounded-2xl">
          Scanning local PC project directories & GitHub repos...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Projects List Column */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between px-1">
              <span>All Workspace Projects ({combinedProjects.length})</span>
              <span className="text-xs font-mono text-zinc-400">
                {combinedProjects.reduce((acc, p) => acc + p.uncommittedCount, 0)} Edits
              </span>
            </h3>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {combinedProjects.map((project) => {
                const isSelected = selectedProject?.name === project.name;
                const hasChanges = project.uncommittedCount > 0;
                const isPublished = publishedRepoNames.has(project.name.toLowerCase());

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
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPublished ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            GitHub
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Unpublished
                          </span>
                        )}
                        {hasChanges && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {project.uncommittedCount} edits
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span className="font-mono text-indigo-400 text-[11px]">git / {project.branch}</span>
                      <span className="text-[10px] text-zinc-500 truncate max-w-[140px]" title={project.fullPath}>
                        {project.fullPath.split("\\").pop() || project.fullPath}
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
                        {!publishedRepoNames.has(selectedProject.name.toLowerCase()) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            NOT ON GITHUB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-mono mt-1 break-all">
                        Local Disk Path: {selectedProject.fullPath}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      {/* Publish to GitHub Button for Unpublished Projects */}
                      {!publishedRepoNames.has(selectedProject.name.toLowerCase()) && (
                        <button
                          onClick={() => openPublishModal(selectedProject.name)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all shadow-md shadow-emerald-500/20"
                        >
                          <UploadCloud className="w-4 h-4" />
                          Publish to GitHub
                        </button>
                      )}

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
                  <h4 className="text-sm font-bold text-white">Recent Git Commits (`git log`)</h4>

                  {selectedProject.recentCommits && selectedProject.recentCommits.length > 0 ? (
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
                      No recent local commits log available.
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

      {/* PUBLISH TO GITHUB MODAL */}
      {isPublishModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Publish to GitHub</h3>
                <p className="text-xs text-zinc-400">Create a remote GitHub repository & push your project</p>
              </div>
            </div>

            {publishSuccessUrl ? (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">Published Successfully!</h4>
                  <p className="text-xs text-zinc-400 mt-1">Your project is now live on GitHub.</p>
                </div>
                <div className="pt-2 flex gap-3">
                  <a
                    href={publishSuccessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePublishSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 block">Repository Name</label>
                  <input
                    type="text"
                    value={publishRepoName}
                    onChange={(e) => setPublishRepoName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm text-white font-mono placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="my-awesome-project"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300 block">Repository Visibility</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPublishIsPrivate(true)}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                        publishIsPrivate
                          ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 shadow-md shadow-emerald-500/10"
                          : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Private</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPublishIsPrivate(false)}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all ${
                        !publishIsPrivate
                          ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 shadow-md shadow-emerald-500/10"
                          : "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <Globe className="w-4 h-4 text-indigo-400" />
                      <span>Public</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/50 text-[11px] text-zinc-400 space-y-1 font-mono">
                  <div>Local Directory: {selectedProject.fullPath}</div>
                  <div>Target Remote: git@github.com:.../{publishRepoName}.git</div>
                </div>

                {publishError && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 font-medium">
                    ⚠️ {publishError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishLoading}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
                  >
                    {publishLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        <span>Publishing to GitHub...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Publish Repository</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
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
