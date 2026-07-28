"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";

interface DeleteRepoModalProps {
  repoId: string;
  repoName: string;
  ownerLogin: string;
  localPath: string;
}

export default function DeleteRepoModal({
  repoId,
  repoName,
  ownerLogin,
  localPath,
}: DeleteRepoModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [deleteLocalFolder, setDeleteLocalFolder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = typedName.trim() === repoName.trim();

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName,
          ownerLogin,
          typedConfirmation: typedName,
          localPath,
          deleteLocalFolder,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete repository");

      setIsOpen(false);
      router.push("/source-control");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to delete repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Danger Zone Trigger Button inside Settings Tab */}
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-rose-500/10"
      >
        <Trash2 className="w-4 h-4" />
        <span>Delete Repository...</span>
      </button>

      {/* GitHub-Style Delete Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Delete Repository</h3>
                  <p className="text-xs font-mono text-rose-400 mt-0.5">Danger Zone • Irreversible Action</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Danger Warning Box */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Are you absolutely sure?</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                This action <strong className="text-white">CANNOT</strong> be undone. This will permanently delete the{" "}
                <strong className="font-mono text-white">{ownerLogin}/{repoName}</strong> repository on GitHub.com including all commits, issues, and branches.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Typed Name Verification Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-2">
                  To confirm, type <strong className="text-white font-mono">{repoName}</strong> below:
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={`Type "${repoName}" to confirm`}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Local Folder Delete Option */}
              <label className="flex items-center gap-3 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deleteLocalFolder}
                  onChange={(e) => setDeleteLocalFolder(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
                />
                <span>Also delete local directory on hard drive (<code className="font-mono text-zinc-400">{localPath}</code>)</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isConfirmed || loading}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-2 text-xs font-bold text-white shadow-md shadow-rose-500/20 flex items-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>I understand the consequences, delete this repository</span>
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
