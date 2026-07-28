"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, Show } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FolderGit2,
  Zap,
  BarChart3,
  Settings,
  ChevronDown,
  GitBranch,
  KeyRound,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const isGitActive = pathname.startsWith("/source-control") || pathname === "/dashboard/git-engine";

  // Auto-expand dropdown if user is currently inside any Git route
  const [isGitDropdownOpen, setIsGitDropdownOpen] = useState<boolean>(isGitActive || true);

  const gitSubItems = [
    {
      href: "/source-control",
      label: "Source Control",
      icon: FolderGit2,
      badge: "Git",
      isActive: pathname.startsWith("/source-control"),
    },
    {
      href: "/dashboard/git-engine",
      label: "Git Engine",
      icon: Zap,
      badge: "AI",
      isActive: pathname === "/dashboard/git-engine",
    },
  ];

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="p-4 space-y-6">
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
          <span>Nexus Workspace</span>
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
        </div>

        <nav className="space-y-1.5">
          {/* Overview */}
          <Link
            href="/dashboard"
            prefetch={true}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/dashboard"
                ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard
                className={`w-4 h-4 transition-colors ${
                  pathname === "/dashboard" ? "text-indigo-400" : "text-zinc-400"
                }`}
              />
              <span>Overview</span>
            </div>
            {pathname === "/dashboard" && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            )}
          </Link>

          {/* Git Modules Collapsible Dropdown */}
          <div className="space-y-1">
            <button
              onClick={() => setIsGitDropdownOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isGitActive
                  ? "bg-indigo-600/10 border border-indigo-500/30 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                <GitBranch
                  className={`w-4 h-4 transition-colors ${
                    isGitActive ? "text-indigo-400" : "text-zinc-400"
                  }`}
                />
                <span>Git Modules</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  2
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 text-zinc-400 ${
                    isGitDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Nested Sub-Tabs List */}
            {isGitDropdownOpen && (
              <div className="pl-4 pr-1 space-y-1 border-l-2 border-zinc-800 ml-5 py-1">
                {gitSubItems.map((sub) => {
                  const Icon = sub.icon;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      prefetch={true}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        sub.isActive
                          ? "bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm"
                          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            sub.isActive ? "text-indigo-400" : "text-zinc-400"
                          }`}
                        />
                        <span>{sub.label}</span>
                      </div>

                      <span
                        className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                          sub.isActive
                            ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                            : "bg-zinc-800 text-zinc-500"
                        }`}
                      >
                        {sub.badge}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Environment Manager Subsystem */}
          <Link
            href="/dashboard/env-manager"
            prefetch={true}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/dashboard/env-manager"
                ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <KeyRound
                className={`w-4 h-4 transition-colors ${
                  pathname === "/dashboard/env-manager" ? "text-indigo-400" : "text-zinc-400"
                }`}
              />
              <span>Environment Manager</span>
            </div>
            <span
              className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                pathname === "/dashboard/env-manager"
                  ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              ENV
            </span>
          </Link>

          {/* Analytics */}
          <Link
            href="/dashboard/analytics"
            prefetch={true}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/dashboard/analytics"
                ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3
                className={`w-4 h-4 transition-colors ${
                  pathname === "/dashboard/analytics" ? "text-indigo-400" : "text-zinc-400"
                }`}
              />
              <span>Analytics</span>
            </div>
            {pathname === "/dashboard/analytics" && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            )}
          </Link>

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            prefetch={true}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              pathname === "/dashboard/settings"
                ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Settings
                className={`w-4 h-4 transition-colors ${
                  pathname === "/dashboard/settings" ? "text-indigo-400" : "text-zinc-400"
                }`}
              />
              <span>Settings</span>
            </div>
            {pathname === "/dashboard/settings" && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            )}
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
                <div className="text-emerald-400 font-medium">Authenticated</div>
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
  );
}
