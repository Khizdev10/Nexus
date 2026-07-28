import Link from "next/link";
import { UserButton, Show } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex min-h-[calc(100vh-73px)] bg-zinc-950 text-zinc-100">
      {/* Dashboard Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col justify-between shrink-0 hidden md:flex">
        <div className="p-4 space-y-6">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Nexus Workspace
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              prefetch={true}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Overview
            </Link>

            <Link
              href="/dashboard/git-engine"
              prefetch={true}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Git Engine
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                AI
              </span>
            </Link>

            <Link
              href="/dashboard/analytics"
              prefetch={true}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors opacity-70"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>

            <Link
              href="/dashboard/settings"
              prefetch={true}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors opacity-70"
            >
              <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/40">
          <Show when="signed-in">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserButton />
                <div className="text-xs">
                  <div className="font-semibold text-white">Active Session</div>
                  <div className="text-emerald-400">Authenticated</div>
                </div>
              </div>
            </div>
          </Show>
          <Show when="signed-out">
            <div className="text-xs text-zinc-400 text-center py-1">
              Guest User
            </div>
          </Show>
        </div>
      </aside>

      {/* Main Dashboard Workspace Content */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
