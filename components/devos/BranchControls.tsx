"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Plus, Check, RefreshCw, AlertCircle, CheckCircle2, X } from "lucide-react";
import { DevOSBranch } from "@/lib/services/git/branches";

interface BranchControlsProps {
  repoId: string;
  localPath: string;
  branches: DevOSBranch[];
}

export default function BranchControls({ repoId, localPath, branches }: BranchControlsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheckout = async (branchName: string) => {
    setLoadingAction(branchName);
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", branchName, localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      showToast("success", data.message);
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to switch branch");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setLoadingAction("create");
    try {
      const res = await fetch(`/api/devos/repositories/${repoId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", branchName: newBranchName, localPath }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Branch creation failed");

      showToast("success", data.message);
      setIsModalOpen(false);
      setNewBranchName("");
      router.refresh();
    } catch (err: any) {
      showToast("error", err.message || "Failed to create branch");
    } finally {
      setLoadingAction(null);
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
          <div className="flex items-center gap-2">
            {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)}>
            <X className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          Branches ({branches.length})
        </h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md shadow-indigo-500/20"
        >
          <Plus className="w-4 h-4" />
          New Branch
        </button>
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map((b) => (
          <div
            key={b.name}
            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
              b.isCurrent
                ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                : "border-zinc-800 bg-zinc-900/80 hover:bg-zinc-900"
            }`}
          >
            <div className="space-y-1 truncate">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-white truncate">{b.name}</span>
                {b.isCurrent && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    CURRENT
                  </span>
                )}
                {b.isRemote && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                    REMOTE
                  </span>
                )}
              </div>
              {b.lastCommitMessage && (
                <p className="text-xs text-zinc-400 truncate">{b.lastCommitMessage}</p>
              )}
            </div>

            {!b.isCurrent && (
              <button
                onClick={() => handleCheckout(b.name)}
                disabled={loadingAction === b.name}
                className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors shrink-0 flex items-center gap-1.5"
              >
                {loadingAction === b.name ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                )}
                Checkout
              </button>
            )}
          </div>
        ))}
      </div>

      {/* CREATE BRANCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-indigo-400" />
                Create New Git Branch
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-zinc-300 block">Branch Name</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="e.g. feature/auth-flow or fix/bug-102"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={!newBranchName.trim() || loadingAction === "create"}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
              >
                {loadingAction === "create" ? "Creating..." : "Create & Checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
