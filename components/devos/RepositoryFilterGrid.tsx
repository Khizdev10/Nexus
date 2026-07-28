"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Shield, User, Users, FolderGit2, ChevronLeft, ChevronRight } from "lucide-react";
import { DevOSRepository, DevOSOverallStats } from "@/types/devos";

interface RepositoryFilterGridProps {
  initialRepos: DevOSRepository[];
  stats: DevOSOverallStats;
}

const ITEMS_PER_PAGE = 10;

export default function RepositoryFilterGrid({ initialRepos, stats }: RepositoryFilterGridProps) {
  const [activeRoleFilter, setActiveRoleFilter] = useState<"all" | "owner" | "collaborator" | "organization_member">("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const ownerCount = useMemo(() => initialRepos.filter((r) => r.role === "owner" || !r.role).length, [initialRepos]);
  const collaboratorCount = useMemo(() => initialRepos.filter((r) => r.role === "collaborator").length, [initialRepos]);
  const teamCount = useMemo(() => initialRepos.filter((r) => r.role === "organization_member").length, [initialRepos]);

  // Step 1: Repositories filtered by Role + Search Query (used to recalculate statistical cards dynamically)
  const roleAndSearchFilteredRepos = useMemo(() => {
    return initialRepos.filter((repo) => {
      // 1. Role Filter
      if (activeRoleFilter !== "all") {
        if (activeRoleFilter === "owner" && repo.role && repo.role !== "owner") return false;
        if (activeRoleFilter === "collaborator" && repo.role !== "collaborator") return false;
        if (activeRoleFilter === "organization_member" && repo.role !== "organization_member") return false;
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = repo.name.toLowerCase().includes(q);
        const matchDesc = repo.description?.toLowerCase().includes(q) || false;
        const matchOwner = repo.ownerLogin?.toLowerCase().includes(q) || false;
        if (!matchName && !matchDesc && !matchOwner) return false;
      }

      return true;
    });
  }, [initialRepos, activeRoleFilter, searchQuery]);

  // Step 2: DYNAMICALLY RECALCULATE TOP STATISTICAL CARDS based on applied role & search filters
  const dynamicStats = useMemo(() => {
    let synced = 0;
    let modified = 0;
    let ahead = 0;
    let behind = 0;
    let openIssues = 0;
    let pullRequests = 0;

    roleAndSearchFilteredRepos.forEach((repo) => {
      openIssues += repo.openIssuesCount || 0;
      pullRequests += repo.openPullRequestsCount || 0;
      if (repo.status === "modified") modified++;
      else if (repo.status === "behind") behind++;
      else if (repo.status === "ahead") ahead++;
      else synced++;
    });

    return {
      totalRepos: roleAndSearchFilteredRepos.length,
      syncedRepos: synced,
      modifiedRepos: modified,
      aheadRepos: ahead,
      behindRepos: behind,
      openIssues,
      pullRequests,
    };
  }, [roleAndSearchFilteredRepos]);

  // Step 3: Final filtered list for the Grid (includes Status Filter)
  const finalFilteredRepos = useMemo(() => {
    if (activeStatusFilter === "all") return roleAndSearchFilteredRepos;
    return roleAndSearchFilteredRepos.filter((repo) => repo.status === activeStatusFilter);
  }, [roleAndSearchFilteredRepos, activeStatusFilter]);

  // Reset pagination to page 1 whenever filters change
  const totalPages = Math.ceil(finalFilteredRepos.length / ITEMS_PER_PAGE) || 1;
  const paginatedRepos = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return finalFilteredRepos.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [finalFilteredRepos, currentPage]);

  const handleStatusCardClick = (status: string) => {
    setActiveStatusFilter(status);
    setCurrentPage(1);
  };

  const handleRoleFilterClick = (role: "all" | "owner" | "collaborator" | "organization_member") => {
    setActiveRoleFilter(role);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: DevOSRepository["status"]) => {
    switch (status) {
      case "modified":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MODIFIED</span>;
      case "behind":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">BEHIND</span>;
      case "ahead":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AHEAD</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">SYNCED</span>;
    }
  };

  const getRoleBadge = (role: DevOSRepository["role"]) => {
    switch (role) {
      case "collaborator":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">COLLABORATOR</span>;
      case "organization_member":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">TEAM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">OWNER</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* DYNAMIC STATISTICAL CARDS BAR (UPDATING IN REAL-TIME ACCORDING TO APPLIED FILTERS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Repos Card */}
        <button
          onClick={() => handleStatusCardClick("all")}
          className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
            activeStatusFilter === "all"
              ? "border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80"
          }`}
        >
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Total Repos</div>
          <div className="text-2xl font-bold text-white mt-1">{dynamicStats.totalRepos}</div>
        </button>

        {/* Synced Repos Card */}
        <button
          onClick={() => handleStatusCardClick("synced")}
          className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
            activeStatusFilter === "synced"
              ? "border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80"
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Synced</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{dynamicStats.syncedRepos}</div>
        </button>

        {/* Modified Repos Card */}
        <button
          onClick={() => handleStatusCardClick("modified")}
          className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
            activeStatusFilter === "modified"
              ? "border-amber-500 bg-amber-950/30 ring-2 ring-amber-500/30 shadow-lg shadow-amber-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80"
          }`}
        >
          <div className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Modified</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{dynamicStats.modifiedRepos}</div>
        </button>

        {/* Ahead Repos Card */}
        <button
          onClick={() => handleStatusCardClick("ahead")}
          className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
            activeStatusFilter === "ahead"
              ? "border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80"
          }`}
        >
          <div className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider">Ahead</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{dynamicStats.aheadRepos}</div>
        </button>

        {/* Behind Repos Card */}
        <button
          onClick={() => handleStatusCardClick("behind")}
          className={`rounded-xl border p-4 text-center transition-all cursor-pointer ${
            activeStatusFilter === "behind"
              ? "border-rose-500 bg-rose-950/30 ring-2 ring-rose-500/30 shadow-lg shadow-rose-500/10"
              : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/80"
          }`}
        >
          <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Behind</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{dynamicStats.behindRepos}</div>
        </button>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Open Issues</div>
          <div className="text-2xl font-bold text-white mt-1">{dynamicStats.openIssues}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Pull Requests</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">{dynamicStats.pullRequests}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center">
          <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Last Sync</div>
          <div className="text-xs font-mono text-zinc-300 truncate pt-2">
            {new Date(stats.lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => handleRoleFilterClick("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeRoleFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>All Repos ({initialRepos.length})</span>
          </button>

          <button
            onClick={() => handleRoleFilterClick("owner")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeRoleFilter === "owner"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <User className="w-3.5 h-3.5 text-zinc-300" />
            <span>Owned ({ownerCount})</span>
          </button>

          <button
            onClick={() => handleRoleFilterClick("collaborator")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeRoleFilter === "collaborator"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Collaborator ({collaboratorCount})</span>
          </button>

          {teamCount > 0 && (
            <button
              onClick={() => handleRoleFilterClick("organization_member")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeRoleFilter === "organization_member"
                  ? "bg-sky-600 text-white shadow-md shadow-sky-500/20"
                  : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Team ({teamCount})</span>
            </button>
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search repositories..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="relative shrink-0">
            <select
              value={activeStatusFilter}
              onChange={(e) => {
                setActiveStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="synced">🟢 SYNCED</option>
              <option value="modified">🟡 MODIFIED</option>
              <option value="ahead">🟣 AHEAD</option>
              <option value="behind">🔴 BEHIND</option>
            </select>
          </div>
        </div>
      </div>

      {/* REPOSITORY CARDS GRID */}
      {paginatedRepos.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedRepos.map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 space-y-4 hover:border-indigo-500/50 hover:bg-zinc-900 transition-all group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {repo.name}
                      </h3>
                      {repo.ownerLogin && (
                        <div className="text-[11px] font-mono text-zinc-500">
                          {repo.ownerLogin}/{repo.name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {getStatusBadge(repo.status)}
                      {getRoleBadge(repo.role)}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 min-h-[32px]">
                    {repo.description || "No repository description."}
                  </p>
                </div>

                <div className="space-y-3 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span>Language</span>
                    <span className="font-semibold text-zinc-200">{repo.language || "TypeScript"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Current Branch</span>
                    <span className="font-mono text-indigo-400 font-medium">git / {repo.currentBranch}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Ahead / Behind</span>
                    <span className="font-mono text-zinc-300">
                      +{repo.aheadCount} / -{repo.behindCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                    <span>Last Push</span>
                    <span>{new Date(repo.lastPush).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/source-control/${repo.id}`}
                    prefetch={true}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-indigo-500/20"
                  >
                    Open Repository Dashboard →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS (10 REPOS PER PAGE) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
              <div className="text-xs font-mono text-zinc-400">
                Showing <strong className="text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</strong> -{" "}
                <strong className="text-white">
                  {Math.min(currentPage * ITEMS_PER_PAGE, finalFilteredRepos.length)}
                </strong>{" "}
                of <strong className="text-white">{finalFilteredRepos.length}</strong> repositories
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <span className="text-xs font-mono text-zinc-300 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-2xl space-y-2">
          <Filter className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <div className="font-bold text-zinc-300">No Repositories Match Filter</div>
          <p className="text-xs text-zinc-500">
            Try resetting your search query or role/status filters.
          </p>
        </div>
      )}
    </div>
  );
}
