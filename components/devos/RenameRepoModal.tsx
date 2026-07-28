"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, AlertTriangle, X, RefreshCw } from "lucide-react";

interface RenameRepoModalProps {
  repoId: string;
  repoName: string;
  ownerLogin: string;
  localPath: string;
  isOpenControlled?: boolean;
  onCloseControlled?: () => void;
  triggerButton?: React.ReactNode;
}

export default function RenameRepoModal({
  repoId,
  repoName,
  ownerLogin,
  localPath,
  isOpenControlled,
  onCloseControlled,
  triggerButton,
}: RenameRepoModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState(repoName);
  const [confirmTypedName, setConfirmTypedName] = useState("");
  const [renameLocalFolder, setRenameLocalFolder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isModalOpen = isOpenControlled !== undefined ? isOpenControlled : internalOpen;

  const closeModal = () => {
    if (onCloseControlled) onCloseControlled();
    else setInternalOpen(false);
  };

  const isConfirmed =
    newRepoName.trim() !== "" &&
    newRepoName.trim() !== repoName.trim() &&
    confirmTypedName.trim() === repoName.trim();

  const handleRename = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          ownerLogin,
          newRepoName: newRepoName.trim(),
          localPath,
          renameLocalFolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename repository");

      closeModal();
      router.push(`/source-control/${data.newName || newRepoName.trim()}?tab=settings`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to rename repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Optional Trigger Button */}
      {triggerButton ? (
        <div onClick={() => setInternalOpen(true)}>{triggerButton}</div>
      ) : isOpenControlled === undefined ? (
        <button
          onClick={() => setInternalOpen(true)}
          className="rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-amber-500/10"
        >
          <Edit3 className="w-4 h-4" />
          <span>Rename Repository...</span>
        </button>
      ) : null}

      {/* GitHub-Style Rename Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Rename Repository</h3>
                  <p className="text-xs font-mono text-amber-400 mt-0.5">GitHub Repository Settings</p>
                </div>
              </div>
              <button onClick={closeModal} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Unexpected side effects may occur</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                Renaming this repository will update its GitHub HTTPS clone URL to{" "}
                <strong className="font-mono text-white">https://github.com/{ownerLogin}/{newRepoName || "..."}.git</strong>.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  New Repository Name
                </label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  placeholder="e.g. my-awesome-new-name"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  To confirm, type current repo name <strong className="text-white font-mono">{repoName}</strong>:
                </label>
                <input
                  type="text"
                  value={confirmTypedName}
                  onChange={(e) => setConfirmTypedName(e.target.value)}
                  placeholder={`Type "${repoName}" to confirm`}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Local Folder Rename Checkbox */}
              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={renameLocalFolder}
                  onChange={(e) => setRenameLocalFolder(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-600 focus:ring-amber-500"
                />
                <span>Also rename local PC folder on hard drive (<code className="font-mono text-zinc-400">{localPath}</code>)</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={closeModal}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!isConfirmed || loading}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Renaming...</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>I understand, rename this repository</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
