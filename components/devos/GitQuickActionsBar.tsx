"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface GitQuickActionsBarProps {
  repoId: string;
  repoName: string;
  localPath: string;
  uncommittedCount: number;
  aheadCount: number;
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
  const [commitMessage, setCommitMessage] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Open Commit Modal & Generate AI Message
  const handleOpenCommitModal = async () => {
    setIsCommitModalOpen(true);
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

  // Generic Git Action handler (Pull, Fetch)
  const handleGitAction = async (action: "pull" | "fetch") => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `${action} failed`);

      showToast("success", data.message || `Successfully executed git ${action}`);
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || `Failed to ${action}`);
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

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            toast.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          <span>{toast.type === "success" ? "✅" : "⚠️"} {toast.message}</span>
          <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Quick Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Commit Button */}
        <button
          onClick={handleOpenCommitModal}
          disabled={actionLoading === "commit"}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/20"
        >
          <span>➕</span> Commit ({uncommittedCount})
        </button>

        {/* 2. Push Button */}
        <button
          onClick={() => setIsPushModalOpen(true)}
          disabled={actionLoading === "push"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <span>⬆️</span> Push ({aheadCount})
        </button>

        {/* 3. Pull Button */}
        <button
          onClick={() => handleGitAction("pull")}
          disabled={actionLoading === "pull"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          {actionLoading === "pull" ? <span className="animate-spin">⏳</span> : <span>⬇️</span>} Pull
        </button>

        {/* 4. Fetch Button */}
        <button
          onClick={() => handleGitAction("fetch")}
          disabled={actionLoading === "fetch"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          {actionLoading === "fetch" ? <span className="animate-spin">⏳</span> : <span>🔄</span>} Fetch
        </button>

        {/* 5. Open Folder Button */}
        <button
          onClick={() => handleOpenTool("explorer")}
          disabled={actionLoading === "explorer"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <span>📁</span> Open Folder
        </button>

        {/* 6. Open VS Code Button */}
        <button
          onClick={() => handleOpenTool("vscode")}
          disabled={actionLoading === "vscode"}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-4 py-3 text-xs font-bold text-white border border-zinc-700 transition-colors"
        >
          <span>💻</span> Open VS Code
        </button>
      </div>

      {/* COMMIT MODAL */}
      {isCommitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🤖</span> DevOS AI Commit Generator
              </h3>
              <button onClick={() => setIsCommitModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            {aiGenerating ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
                <p className="text-xs text-zinc-400">AI is generating commit message from local diffs...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">
                    Commit Message (Editable)
                  </label>
                  <textarea
                    rows={3}
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Enter commit message..."
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="text-[11px] text-zinc-500 font-mono">
                  Repository: {repoName} ({uncommittedCount} uncommitted files)
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={() => setIsCommitModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishCommit}
                disabled={!commitMessage.trim() || actionLoading === "commit"}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
              >
                {actionLoading === "commit" ? "Publishing..." : "Publish Commit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUSH MODAL */}
      {isPushModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-white">Push to Remote Origin</h3>
              <button onClick={() => setIsPushModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <p>
                You are about to push local commits to <strong className="text-indigo-400">{repoName}</strong> remote origin.
              </p>
              <div className="p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono text-[11px]">
                Ahead Count: +{aheadCount} commit(s) pending push.
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={() => setIsPushModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecutePush}
                disabled={actionLoading === "push"}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
              >
                {actionLoading === "push" ? "Pushing..." : "Confirm & Push"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
