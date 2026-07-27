"use client";

import React, { useState, useEffect } from "react";

interface FileDiffViewerProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  filePath: string;
}

export default function FileDiffViewer({
  isOpen,
  onClose,
  projectPath,
  filePath,
}: FileDiffViewerProps) {
  const [diff, setDiff] = useState<string>("");
  const [additions, setAdditions] = useState<number>(0);
  const [deletions, setDeletions] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !filePath || !projectPath) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(
      `/api/local-projects/diff?projectPath=${encodeURIComponent(
        projectPath
      )}&filePath=${encodeURIComponent(filePath)}`
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file diff");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setDiff(data.diff || "");
        setAdditions(data.additionsCount || 0);
        setDeletions(data.deletionsCount || 0);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Could not fetch file diff");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectPath, filePath]);

  if (!isOpen) return null;

  const lines = diff.split("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-mono">{filePath}</h3>
              <p className="text-xs text-zinc-400 font-mono">{projectPath}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-emerald-400 font-bold">+{additions}</span>
              <span className="text-rose-400 font-bold">-{deletions}</span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-xs leading-relaxed">
          {loading ? (
            <div className="py-16 text-center text-zinc-500 animate-pulse">
              Loading file diff...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-rose-400 text-xs">
              ⚠️ {error}
            </div>
          ) : lines.length > 0 ? (
            <div className="space-y-0.5 select-text">
              {lines.map((line, idx) => {
                let lineStyle = "text-zinc-300 hover:bg-zinc-900/50";
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  lineStyle = "bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2";
                } else if (line.startsWith("-") && !line.startsWith("---")) {
                  lineStyle = "bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2";
                } else if (line.startsWith("@@")) {
                  lineStyle = "bg-indigo-950/40 text-indigo-400 font-semibold py-1 px-2 my-1 rounded border-l-2 border-indigo-500";
                } else if (line.startsWith("diff --git") || line.startsWith("index ")) {
                  lineStyle = "text-zinc-500 font-bold py-0.5";
                }

                return (
                  <div key={idx} className={`px-3 py-0.5 whitespace-pre-wrap break-all ${lineStyle}`}>
                    {line}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-zinc-500 italic">
              No differences detected for this file.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Git Diff Preview</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-1.5 font-medium transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
