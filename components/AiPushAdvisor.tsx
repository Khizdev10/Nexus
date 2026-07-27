"use client";

import React, { useState, useEffect } from "react";
import { AiReviewResult } from "@/app/api/ai-review/route";

interface AiPushAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string;
  projectName: string;
  uncommittedCount: number;
}

export default function AiPushAdvisor({
  isOpen,
  onClose,
  projectPath,
  projectName,
  uncommittedCount,
}: AiPushAdvisorProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<AiReviewResult | null>(null);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushedSuccess, setPushedSuccess] = useState<boolean>(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !projectPath) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPushedSuccess(false);

    fetch("/api/ai-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectPath, projectName }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to run AI review");
        return res.json();
      })
      .then((data: AiReviewResult) => {
        if (!isMounted) return;
        setResult(data);
        setCommitMessage(data.suggestedCommitMessage || "");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Could not complete AI review");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectPath, projectName]);

  if (!isOpen) return null;

  const handleExecutePush = async () => {
    setIsPushing(true);
    setError(null);
    try {
      const res = await fetch(`/api/devos/repositories/${projectName}/git`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push",
          commitMessage,
          localPath: projectPath,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Git push failed");
      }

      setPushedSuccess(true);
      setPushStatusMessage(data.message || "Successfully committed & pushed to GitHub!");
    } catch (err: any) {
      setError(err?.message || "Failed to push to GitHub");
    } finally {
      setIsPushing(false);
    }
  };

  const getDecisionBadge = (decision: AiReviewResult["decision"]) => {
    switch (decision) {
      case "SAFE_TO_PUSH":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            SAFE TO PUSH
          </span>
        );
      case "REVIEW_RECOMMENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            REVIEW RECOMMENDED
          </span>
        );
      case "BLOCKED_SECURITY":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            BLOCKED: SECURITY RISK
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-2xl flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AI Pre-Push Review Assistant</h3>
              <p className="text-xs text-zinc-400 font-mono">{projectName} ({uncommittedCount} uncommitted files)</p>
            </div>
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

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto"></div>
              <p className="text-sm font-medium text-zinc-300">AI is analyzing uncommitted code diffs and security policies...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 font-mono">
              ⚠️ {error}
            </div>
          ) : result ? (
            <>
              {/* Decision & Score Card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-zinc-400 font-medium">AI Push Verdict</div>
                    <div className="mt-1">{getDecisionBadge(result.decision)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Safety Index</div>
                    <div className="text-2xl font-extrabold text-white">{result.score}/100</div>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-lg border border-zinc-800 font-sans">
                  {result.summary}
                </p>
              </div>

              {/* Security Findings */}
              {result.securityIssues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    🛡️ Security Audit Findings ({result.securityIssues.length})
                  </h4>
                  <div className="space-y-2">
                    {result.securityIssues.map((issue, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-200">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Quality Recommendations */}
              {result.qualityIssues.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    ⚡ Quality & Cleanliness Findings ({result.qualityIssues.length})
                  </h4>
                  <div className="space-y-2">
                    {result.qualityIssues.map((issue, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Commit Message */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">
                  AI Suggested Commit Message (Editable)
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {pushedSuccess && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 font-semibold text-center animate-fadeIn">
                  🎉 {pushStatusMessage}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Close
          </button>

          {result && (
            <button
              onClick={handleExecutePush}
              disabled={result.decision === "BLOCKED_SECURITY" || isPushing || pushedSuccess}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white transition-all shadow-lg ${
                result.decision === "BLOCKED_SECURITY"
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"
              }`}
            >
              {isPushing ? "Pushing to GitHub..." : pushedSuccess ? "Pushed ✅" : "1-Click AI Commit & Push"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
