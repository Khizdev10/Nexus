"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Folder,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  CircleDot,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Shield,
  User,
  Users,
} from "lucide-react";
import { DevOSRepository, DevOSOverallStats } from "@/types/devos";
import RepoActionDropdown from "@/components/devos/RepoActionDropdown";

interface RepositoryFilterGridProps {
  initialRepos: DevOSRepository[];
  stats: DevOSOverallStats;
}

export default function RepositoryFilterGrid({
  initialRepos,
  stats,
}: RepositoryFilterGridProps) {
  const [activeRoleFilter, setActiveRoleFilter] = useState<"all" | "owner" | "collaborator" | "organization_member">("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const reposPerPage = 10;

  // Role Counts
  const ownerCount = initialRepos.filter((r) => r.role === "owner").length;
  const collaboratorCount = initialRepos.filter((r) => r.role === "collaborator").length;
  const teamCount = initialRepos.filter((r) => r.role === "organization_member").length;

  // Filter Logic
  const filteredRepos = initialRepos.filter((repo) => {
    // 1. Role Filter
    if (activeRoleFilter !== "all" && repo.role !== activeRoleFilter) {
      return false;
    }
    // 2. Status Filter
    if (activeStatusFilter !== "all" && repo.status !== activeStatusFilter) {
      return false;
    }
    // 3. Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const matchName = repo.name.toLowerCase().includes(q);
      const matchDesc = (repo.description || "").toLowerCase().includes(q);
      const matchLang = (repo.language || "").toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchLang) return false;
    }
    return true;
  });

  // Calculate Dynamic Stats Based on Current Filters
  const dynamicTotal = filteredRepos.length;
  const dynamicSynced = filteredRepos.filter((r) => r.status === "synced").length;
  const dynamicModified = filteredRepos.filter((r) => r.status === "modified").length;
  const dynamicAhead = filteredRepos.filter((r) => r.status === "ahead").length;
  const dynamicBehind = filteredRepos.filter((r) => r.status === "behind").length;
  const dynamicIssues = filteredRepos.reduce((acc, r) => acc + r.openIssuesCount, 0);
  const dynamicPRs = filteredRepos.reduce((acc, r) => acc + r.openPullRequestsCount, 0);

  // Pagination Logic
  const totalPages = Math.ceil(dynamicTotal / reposPerPage) || 1;
  const startIndex = (currentPage - 1) * reposPerPage;
  const paginatedRepos = filteredRepos.slice(startIndex, startIndex + reposPerPage);

  const handleStatCardClick = (statusFilter: string) => {
    setActiveStatusFilter(statusFilter);
    setCurrentPage(1);
  };

  const handleRoleFilterClick = (role: "all" | "owner" | "collaborator" | "organization_member") => {
    setActiveRoleFilter(role);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: DevOSRepository["status"]) => {
    switch (status) {
      case "modified":
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MODIFIED</span>;
      case "ahead":
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">AHEAD</span>;
      case "behind":
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">BEHIND</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SYNCED</span>;
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
      {/* TOP DYNAMIC STATISTICAL METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <button
          onClick={() => handleStatCardClick("all")}
          className={`text-left rounded-2xl border p-4 transition-all shadow-lg ${
            activeStatusFilter === "all"
              ? "border-indigo-500 bg-indigo-950/20 ring-2 ring-indigo-500/20"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Repos</span>
            <Folder className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">{dynamicTotal}</div>
          <div className="text-[10px] text-zinc-500 mt-1">
            {activeRoleFilter !== "all" ? `${activeRoleFilter.toUpperCase()}` : "ALL ROLES"}
          </div>
        </button>

        <button
          onClick={() => handleStatCardClick("synced")}
          className={`text-left rounded-2xl border p-4 transition-all shadow-lg ${
            activeStatusFilter === "synced"
              ? "border-emerald-500 bg-emerald-950/20 ring-2 ring-emerald-500/20"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Synced</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-2">{dynamicSynced}</div>
          <div className="text-[10px] text-emerald-400/80 mt-1">Up to date</div>
        </button>

        <button
          onClick={() => handleStatCardClick("modified")}
          className={`text-left rounded-2xl border p-4 transition-all shadow-lg ${
            activeStatusFilter === "modified"
              ? "border-amber-500 bg-amber-950/20 ring-2 ring-amber-500/20"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Modified</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-2">{dynamicModified}</div>
          <div className="text-[10px] text-amber-400/80 mt-1">Uncommitted Edits</div>
        </button>

        <button
          onClick={() => handleStatCardClick("ahead")}
          className={`text-left rounded-2xl border p-4 transition-all shadow-lg ${
            activeStatusFilter === "ahead"
              ? "border-purple-500 bg-purple-950/20 ring-2 ring-purple-500/20"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Ahead</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 mt-2">{dynamicAhead}</div>
          <div className="text-[10px] text-purple-400/80 mt-1">Ready to Push</div>
        </button>

        <button
          onClick={() => handleStatCardClick("behind")}
          className={`text-left rounded-2xl border p-4 transition-all shadow-lg ${
            activeStatusFilter === "behind"
              ? "border-rose-500 bg-rose-950/20 ring-2 ring-rose-500/20"
              : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Behind</span>
            <ArrowDownLeft className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-2">{dynamicBehind}</div>
          <div className="text-[10px] text-rose-400/80 mt-1">Needs Pull</div>
        </button>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Issues & PRs</span>
            <CircleDot className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white mt-2">
            {dynamicIssues + dynamicPRs}
          </div>
          <div className="text-[10px] text-zinc-400 mt-1">
            {dynamicIssues} Issues • {dynamicPRs} PRs
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR: ROLE TABS & SEARCH INPUT */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl shadow-xl">
        {/* Role Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0">
          <button
            onClick={() => handleRoleFilterClick("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeRoleFilter === "all"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            All Repos ({initialRepos.length})
          </button>

          <button
            onClick={() => handleRoleFilterClick("owner")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeRoleFilter === "owner"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-800"
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Owned ({ownerCount})</span>
          </button>

          {collaboratorCount > 0 && (
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
          )}

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
                  {/* Clean Top Card Header Row */}
                  <div className="flex items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
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

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(repo.status)}
                        {getRoleBadge(repo.role)}
                      </div>

                      {/* Sleek 3-Dot Click-Only Dropdown Menu */}
                      <RepoActionDropdown
                        repoId={repo.id}
                        repoName={repo.name}
                        ownerLogin={repo.ownerLogin || "owner"}
                        localPath={repo.localPath || `c:\\coding\\projects\\${repo.name}`}
                      />
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

                {/* Primary Card Action Button */}
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

          {/* 10-REPO PAGINATION BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800 pt-6">
            <div className="text-xs text-zinc-400 font-mono">
              Showing <strong className="text-white">{startIndex + 1}</strong> -{" "}
              <strong className="text-white">{Math.min(startIndex + reposPerPage, dynamicTotal)}</strong> of{" "}
              <strong className="text-white">{dynamicTotal}</strong> filtered repositories
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 font-mono text-xs text-zinc-400 px-2">
                <span className="text-white font-bold">{currentPage}</span>
                <span>/</span>
                <span>{totalPages}</span>
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-zinc-500 text-sm font-mono border border-dashed border-zinc-800 rounded-2xl space-y-2">
          <Filter className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <div className="font-bold text-zinc-300">No matching repositories found</div>
          <p className="text-xs text-zinc-500">Try adjusting your role tab, status dropdown, or search query.</p>
        </div>
      )}
    </div>
  );
}
