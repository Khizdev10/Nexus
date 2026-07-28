import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getGitHubOAuthToken } from "@/lib/services/github/repositories";
import { Settings, Shield, HardDrive, User, RefreshCw, Key, CheckCircle2 } from "lucide-react";

export default async function DashboardSettingsPage() {
  const [user, token] = await Promise.all([
    currentUser(),
    getGitHubOAuthToken(),
  ]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full p-4 sm:p-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            DevOS Configuration & Credentials
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            Dashboard Settings
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage workspace paths, OAuth tokens, auto-sync parameters, and system preferences.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/dashboard/analytics"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            Analytics
          </Link>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="space-y-6">
        {/* Workspace Root Directory */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            Local Hard Drive Workspace Root
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <label className="text-zinc-400 block mb-1">Local Projects Directory</label>
              <input
                type="text"
                disabled
                value="c:\coding\projects"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-indigo-300 font-mono"
              />
            </div>
            <p className="text-zinc-500">
              DevOS automatically scans this folder to link local Git repositories with GitHub repos.
            </p>
          </div>
        </div>

        {/* GitHub OAuth & Account Credentials */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            GitHub Authentication & Permissions
          </h2>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950">
              <span className="text-zinc-300 font-medium">GitHub OAuth Token Status</span>
              <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {token ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>

            {user && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950">
                <span className="text-zinc-300 font-medium">Connected Clerk Account</span>
                <span className="font-mono text-zinc-300">
                  {user.emailAddresses[0]?.emailAddress}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
