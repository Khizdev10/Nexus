"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download, CheckCircle2, RefreshCw, Laptop, Zap, Copy, Check, AlertCircle } from "lucide-react";

interface AgentData {
  hostname: string;
  platform: string;
  allowedPaths: string[];
  connectedAt: string;
}

export default function LocalAgentDesktopCard() {
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [pairToken, setPairToken] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAgentStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/pair");
      if (res.ok) {
        const data = await res.json();
        setIsConnected(data.isConnected);
        setAgent(data.agent);
        setPairToken(data.pairToken);
        setDeepLinkUrl(data.deepLinkUrl);
        setDownloadUrls(data.downloadUrls || {});
      }
    } catch (err) {
      console.error("Failed to check local agent status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgentStatus();
    // Poll agent status every 3 seconds for fast live detection
    const interval = setInterval(fetchAgentStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchAgentStatus]);

  const handleDownloadClick = () => {
    setDownloadTriggered(true);
    const winUrl = downloadUrls.win32 || `/api/agent/installer?platform=win32&token=${pairToken || "NEXUS"}`;
    // Direct native browser download trigger
    window.location.href = winUrl;
  };

  const copyCommand = () => {
    if (!pairToken) return;
    const cmd = `npx @nexus/agent --token ${pairToken}`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 font-mono text-xs text-zinc-500 animate-pulse flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Scanning for running Local PC Agent...</span>
      </div>
    );
  }

  const activeDownloadUrl = downloadUrls.win32 || `/api/agent/installer?platform=win32&token=${pairToken || "NEXUS"}`;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
            isConnected
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          }`}>
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Local PC Agent (`Nexus Bridge`)</h3>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase flex items-center gap-1 ${
                isConnected
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
                {isConnected ? "AGENT CONNECTED & ACTIVE" : "NOT INSTALLED / OFFLINE"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isConnected
                ? "Streaming your local PC hard drive files & Git operations in real time."
                : "Install the lightweight agent once to enable local PC file scanning in Cloud mode."}
            </p>
          </div>
        </div>

        <button
          onClick={fetchAgentStatus}
          className="rounded-xl border border-zinc-800 bg-zinc-800/80 hover:bg-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Check Agent Status</span>
        </button>
      </div>

      {/* STATE 1: AGENT CONNECTED */}
      {isConnected && agent ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <span className="text-zinc-500 block">Connected Device</span>
              <span className="font-bold text-white font-mono">{agent.hostname}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <span className="text-zinc-500 block">Operating System</span>
              <span className="font-bold text-indigo-400 capitalize">{agent.platform}</span>
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-1">
              <span className="text-zinc-500 block">Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Real-time Auto-Sync
              </span>
            </div>
          </div>

          {agent.allowedPaths && agent.allowedPaths.length > 0 && (
            <div className="text-xs text-zinc-400 font-mono bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block mb-1 font-sans font-semibold text-[11px]">Synced Workspace Folders:</span>
              {agent.allowedPaths.join(", ")}
            </div>
          )}
        </div>
      ) : (
        /* STATE 2: AGENT NOT INSTALLED / OFFLINE (STEP BY STEP GUIDE) */
        <div className="space-y-6">
          {/* Alert Banner */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Local Desktop Agent is not running on your computer. Follow the guide below to connect.</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded border border-amber-500/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              AWAITING AGENT
            </div>
          </div>

          {/* 3-Step Guided Setup Grid */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Step-by-Step Installation & Launch Guide
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">DOWNLOAD</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">1-Click Desktop Installer</h5>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Download the pre-configured zero-setup agent app for your computer.
                  </p>
                </div>

                <a
                  href={activeDownloadUrl}
                  download="nexus-agent-start.cmd"
                  onClick={() => setDownloadTriggered(true)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 text-center"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Desktop Agent</span>
                </a>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">RUN / OPEN</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">Launch App (Zero Terminal)</h5>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Double click <code className="font-mono text-purple-300">nexus-agent-start.cmd</code> to run. It connects automatically without terminal typing.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-purple-300 bg-purple-500/10 p-2 rounded-lg border border-purple-500/20 text-center font-semibold">
                  Double click downloaded file
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase">AUTO-SYNC</span>
                  </div>
                  <h5 className="font-bold text-white text-xs">Automatic Connection</h5>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Once opened, the agent connects securely and this banner turns green automatically.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-mono font-bold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Auto-detecting agent...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Power User CLI Command Option */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-semibold">Power User CLI / Terminal Command Option:</span>
              {pairToken && <span className="font-mono text-[10px] text-indigo-400">Token: {pairToken}</span>}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-900 font-mono text-xs text-zinc-200">
              <code>npx @nexus/agent --token {pairToken || "NEXUS-TOKEN"}</code>
              <button
                type="button"
                onClick={copyCommand}
                className="ml-3 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-semibold transition-colors flex items-center gap-1.5 text-[11px] shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Command"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
