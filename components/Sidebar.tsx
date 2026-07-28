"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, Show } from "@clerk/nextjs";
import { LayoutDashboard, FolderGit2, Zap, BarChart3, Settings } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      isActive: pathname === "/dashboard",
    },
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
    {
      href: "/dashboard/analytics",
      label: "Analytics",
      icon: BarChart3,
      isActive: pathname === "/dashboard/analytics",
    },
    {
      href: "/dashboard/settings",
      label: "Settings",
      icon: Settings,
      isActive: pathname === "/dashboard/settings",
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  item.isActive
                    ? "bg-indigo-600/15 border border-indigo-500/40 text-white shadow-md shadow-indigo-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      item.isActive ? "text-indigo-400" : "text-zinc-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge ? (
                  <span
                    className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full ${
                      item.isActive
                        ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/50"
                        : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : item.isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                ) : null}
              </Link>
            );
          })}
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
