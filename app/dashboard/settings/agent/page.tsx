import React from "react";
import Link from "next/link";
import { Laptop, ArrowLeft } from "lucide-react";
import LocalAgentDesktopCard from "@/components/agent/LocalAgentDesktopCard";

export default function AgentSettingsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 text-zinc-100 animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 mb-1">
            <Link href="/dashboard/settings" prefetch={true} className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Settings
            </Link>
            <span>/</span>
            <span className="text-indigo-400 font-semibold">Local Desktop Agent</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Laptop className="w-7 h-7 text-indigo-400" />
            Nexus Desktop Agent Configuration
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your connected computer background daemon, zero-terminal auto-pairing, and allowed workspace paths.
          </p>
        </div>
      </div>

      {/* Main Agent Status Card */}
      <LocalAgentDesktopCard />
    </div>
  );
}
