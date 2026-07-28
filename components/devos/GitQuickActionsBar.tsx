"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GitCommit,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  FolderOpen,
  Code2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileCode,
  Eye,
  Plus,
  Minus,
  FileText,
} from "lucide-react";

interface GitQuickActionsBarProps {
  repoId: string;
  repoName: string;
  localPath: string;
  uncommittedCount: number;
  aheadCount: number;
}

interface DiffFile {
  filename: string;
  status: "modified" | "added" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch: string;
}

export default function GitQuickActionsBar({
  repoId,
  repoName,
  localPath,
  uncommittedCount,
  aheadCount,
}: GitQuickActionsBarProps) {
  const router = useRouter();
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);
  const [isPullModalOpen, setIsPullModalOpen] = useState(false);

  const [commitMessage, setCommitMessage] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // GitHub-style Code Diff State
  const [diffFiles, setDiffFiles] = useState<DiffFile[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | null>(null);
  const [totalAdditions, setTotalAdditions] = useState(0);
  const [totalDeletions, setTotalDeletions] = useState(0);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  // Fetch Code Diff Preview for Commit / Push / Pull
  const fetchDiffPreview = async (mode: "uncommitted" | "ahead" | "behind") => {
    setDiffLoading(true);
    setDiffFiles([]);
    try {
      const res = await fetch("/api/local-projects/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: localPath, mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiffFiles(data.files || []);
        setTotalAdditions(data.totalAdditions || 0);
        setTotalDeletions(data.totalDeletions || 0);
        if (data.files && data.files.length > 0) {
          setSelectedDiffFile(data.files[0].filename);
        }
      }
    } catch {
      // Ignore diff fetch error
    } finally {
      setDiffLoading(false);
    }
  };

  // Open Commit Modal & Fetch Diff + AI Message
  const handleOpenCommitModal = async () => {
    setIsCommitModalOpen(true);
    fetchDiffPreview("uncommitted");
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectPath: localPath, projectName: repoName }),
      });
      if (res.ok) {
        const data = await res.json();
        setCommitMessage(data.suggestedCommitMessage || `feat(${repoName}): Update project files`);
      } else {
        setCommitMessage(`feat(${repoName}): Update repository files`);
      }
    } catch {
      setCommitMessage(`feat(${repoName}): Update repository files`);
    } finally {
      setAiGenerating(false);
    }
  };

  // Open Push Modal & Fetch Diff
  const handleOpenPushModal = () => {
    setIsPushModalOpen(true);
    fetchDiffPreview("ahead");
  };

  // Open Pull Modal & Fetch Diff
  const handleOpenPullModal = () => {
    setIsPullModalOpen(true);
    fetchDiffPreview("behind");
  };

  // Submit Commit Action
  const handlePublishCommit = async () => {
    if (!commitMessage.trim()) return;
    setActionLoading("commit");
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          commitMessage,
          localPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Commit failed");

      showToast("success", `Committed: "${commitMessage}"`);
      setIsCommitModalOpen(false);
      setCommitMessage("");
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to commit changes");
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Push Action
  const handleExecutePush = async () => {
    setActionLoading("push");
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "push", localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Push failed");

      showToast("success", "Pushed commits to remote origin!");
      setIsPushModalOpen(false);
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to push to remote");
    } finally {
      setActionLoading(null);
    }
  };

  // Submit Pull Action
  const handleExecutePull = async () => {
    setActionLoading("pull");
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pull", localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pull failed");

      showToast("success", data.message || "Pulled latest changes from GitHub successfully.");
      setIsPullModalOpen(false);
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to pull from remote");
    } finally {
      setActionLoading(null);
    }
  };

  // Generic Fetch Action
  const handleFetchAction = async () => {
    setActionLoading("fetch");
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch", localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");

      showToast("success", data.message || "Fetched latest changes from origin.");
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to fetch from remote");
    } finally {
      setActionLoading(null);
    }
  };

  // Open Local Tool (Explorer / VS Code)
  const handleOpenTool = async (target: "explorer" | "vscode") => {
    setActionLoading(target);
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to open ${target}`);

      showToast("success", data.message);
    } catch (err: any) {
      showToast("error", err.message || `Failed to launch ${target}`);
    } finally {
      setActionLoading(null);
    }
  };

  const activeDiffObject = diffFiles.find((f) => f.filename === selectedDiffFile) || diffFiles[0] || null;

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Commit Button */}
        <button
          onClick={handleOpenCommitModal}
          disabled={actionLoading === "commit"}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/20"
        >
          <GitCommit className="w-4 h-4" />
          Commit ({uncommittedCount})
        </button>

        {/* 2. Push Button */}
        <button
          onClick={handleOpenPushModal}
          disabled={actionLoading === "push"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <UploadCloud className="w-4 h-4 text-indigo-400" />
          Push ({aheadCount})
        </button>

        {/* 3. Pull Button */}
        <button
          onClick={handleOpenPullModal}
          disabled={actionLoading === "pull"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          {actionLoading === "pull" ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <DownloadCloud className="w-4 h-4 text-emerald-400" />
          )}
          Pull
        </button>

        {/* 4. Fetch Button */}
        <button
          onClick={handleFetchAction}
          disabled={actionLoading === "fetch"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          {actionLoading === "fetch" ? (
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          ) : (
            <RefreshCw className="w-4 h-4 text-zinc-400" />
          )}
          Fetch
        </button>

        {/* 5. Open Folder Button */}
        <button
          onClick={() => handleOpenTool("explorer")}
          disabled={actionLoading === "explorer"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-amber-400" />
          Open Folder
        </button>

        {/* 6. Open VS Code Button */}
        <button
          onClick={() => handleOpenTool("vscode")}
          disabled={actionLoading === "vscode"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <Code2 className="w-4 h-4 text-sky-400" />
          Open VS Code
        </button>
      </div>

      {/* 1. COMMIT MODAL WITH GITHUB-STYLE CODE DIFF */}
      {isCommitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <GitCommit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Commit Local Changes</h3>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    {repoName} • {uncommittedCount} modified files
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCommitModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* AI Commit Message Suggestion Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    AI Suggested Commit Message
                  </label>
                  {aiGenerating && (
                    <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Generating...
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Enter commit message..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* GitHub-Style Interactive Code Diff Preview */}
              <div className="space-y-3 border-t border-zinc-800/80 pt-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    Code Changes Preview ({diffFiles.length} files)
                  </h4>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> {totalAdditions}
                    </span>
                    <span className="text-rose-400 font-bold flex items-center gap-0.5">
                      <Minus className="w-3 h-3" /> {totalDeletions}
                    </span>
                  </div>
                </div>

                {diffLoading ? (
                  <div className="py-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                    Loading code diff preview...
                  </div>
                ) : diffFiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/40 min-h-[260px]">
                    {/* File List Listbar */}
                    <div className="border-r border-zinc-800 p-3 space-y-1 overflow-y-auto max-h-[300px]">
                      {diffFiles.map((file) => {
                        const isSelected = selectedDiffFile === file.filename;
                        return (
                          <button
                            key={file.filename}
                            onClick={() => setSelectedDiffFile(file.filename)}
                            className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                              isSelected
                                ? "bg-indigo-600 text-white font-semibold shadow-md"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                            }`}
                          >
                            <span className="truncate max-w-[140px] flex items-center gap-1.5">
                              <FileCode className="w-3.5 h-3.5 shrink-0" />
                              {file.filename}
                            </span>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="text-emerald-400">+{file.additions}</span>
                              <span className="text-rose-400">-{file.deletions}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Diff Lines Code Viewer */}
                    <div className="md:col-span-2 p-4 bg-zinc-950 overflow-x-auto font-mono text-[11px] max-h-[300px] overflow-y-auto">
                      {activeDiffObject ? (
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-3">
                            {activeDiffObject.filename} ({activeDiffObject.status})
                          </div>
                          {activeDiffObject.patch ? (
                            activeDiffObject.patch.split("\n").map((line, idx) => {
                              let lineStyle = "text-zinc-400";
                              let bgStyle = "";
                              if (line.startsWith("+") && !line.startsWith("+++")) {
                                lineStyle = "text-emerald-300";
                                bgStyle = "bg-emerald-500/10 border-l-2 border-emerald-500 pl-2";
                              } else if (line.startsWith("-") && !line.startsWith("---")) {
                                lineStyle = "text-rose-300";
                                bgStyle = "bg-rose-500/10 border-l-2 border-rose-500 pl-2";
                              } else if (line.startsWith("@@")) {
                                lineStyle = "text-indigo-400 font-bold";
                                bgStyle = "bg-indigo-500/10 py-0.5 px-1 rounded";
                              }
                              return (
                                <div key={idx} className={`${lineStyle} ${bgStyle} whitespace-pre-wrap`}>
                                  {line}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-zinc-500 text-center py-8">File binary or no patch text available.</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-zinc-500 text-center py-8">Select a file to inspect code changes.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    No uncommitted file modifications detected.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
              <button
                onClick={() => setIsCommitModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishCommit}
                disabled={!commitMessage.trim() || actionLoading === "commit"}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
              >
                <GitCommit className="w-4 h-4" />
                {actionLoading === "commit" ? "Publishing..." : "Publish Commit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PUSH MODAL WITH CODE DIFF PREVIEW */}
      {isPushModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Push to Remote Origin</h3>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">
                    {repoName} • {aheadCount} ahead commit(s)
                  </p>
                </div>
              </div>
              <button onClick={() => setIsPushModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono text-xs flex items-center justify-between">
                <span>Pending Push Commits: +{aheadCount} ahead</span>
                <span className="text-[11px] text-zinc-400">Target: origin/main</span>
              </div>

              {/* Code Changes Diff */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Code Diff Pending Push ({diffFiles.length} files)
                </h4>

                {diffLoading ? (
                  <div className="py-8 text-center text-xs text-zinc-400">Loading code diff...</div>
                ) : diffFiles.length > 0 ? (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {diffFiles.map((file, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 font-bold flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-indigo-400" />
                            {file.filename}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">+{file.additions}</span>
                            <span className="text-rose-400">-{file.deletions}</span>
                          </div>
                        </div>
                        {file.patch && (
                          <pre className="p-3 rounded-lg bg-zinc-950 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[140px]">
                            {file.patch}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-500 border border-zinc-800 rounded-xl">
                    Commits ready for push.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
              <button
                onClick={() => setIsPushModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePush}
                disabled={actionLoading === "push"}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
              >
                <UploadCloud className="w-4 h-4" />
                {actionLoading === "push" ? "Pushing..." : "Confirm & Push"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. PULL MODAL WITH CODE DIFF PREVIEW */}
      {isPullModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Pull Latest Changes from Remote</h3>
                  <p className="text-xs font-mono text-zinc-400 mt-0.5">{repoName}</p>
                </div>
              </div>
              <button onClick={() => setIsPullModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono text-xs">
                Downloads and merges remote GitHub commits into your local working tree cleanly.
              </div>

              {/* Code Changes Diff */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Remote Changes Preview
                </h4>

                {diffLoading ? (
                  <div className="py-8 text-center text-xs text-zinc-400">Loading code diff...</div>
                ) : diffFiles.length > 0 ? (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {diffFiles.map((file, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/80 font-mono text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 font-bold flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-emerald-400" />
                            {file.filename}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400">+{file.additions}</span>
                            <span className="text-rose-400">-{file.deletions}</span>
                          </div>
                        </div>
                        {file.patch && (
                          <pre className="p-3 rounded-lg bg-zinc-950 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[140px]">
                            {file.patch}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-zinc-500 border border-zinc-800 rounded-xl">
                    Ready to pull remote changes from GitHub origin.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
              <button
                onClick={() => setIsPullModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePull}
                disabled={actionLoading === "pull"}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20"
              >
                <DownloadCloud className="w-4 h-4" />
                {actionLoading === "pull" ? "Pulling..." : "Confirm & Pull"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
