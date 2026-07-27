"use client";

import React, { useState, useEffect } from "react";
import { ContributionDay } from "@/lib/github";

interface CommitHeatmapProps {
  weeks: ContributionDay[][];
  totalCommits: number;
  currentStreak: number;
  longestStreak: number;
  repoName?: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const LEVEL_CLASSES = {
  0: "bg-zinc-900 border-zinc-800/80 hover:border-zinc-700",
  1: "bg-emerald-950 border-emerald-800/80 hover:border-emerald-700",
  2: "bg-emerald-800 border-emerald-700 hover:border-emerald-600",
  3: "bg-emerald-600 border-emerald-500 hover:border-emerald-400",
  4: "bg-emerald-400 border-emerald-300 shadow-sm shadow-emerald-400/30 hover:bg-emerald-300",
};

export default function CommitHeatmap({
  weeks,
  totalCommits,
  currentStreak,
  longestStreak,
  repoName,
}: CommitHeatmapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    count: number;
  } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Derive month positions for top legend headers
  const monthLabels: { name: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    if (week[0]) {
      const date = new Date(week[0].date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ name: MONTH_NAMES[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  if (!isMounted) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-zinc-500 text-sm font-mono animate-pulse">
        Loading commit heatmap matrix...
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
      {/* Header & Stats Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Commit Activity Matrix
            {repoName && (
              <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                {repoName}
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            52-week contribution frequency and commit heatmap
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs shrink-0">
          <div className="text-center sm:text-right">
            <div className="text-zinc-400 font-medium">Total Contributions</div>
            <div className="text-lg font-bold text-white">{totalCommits}</div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center sm:text-right">
            <div className="text-zinc-400 font-medium">Current Streak</div>
            <div className="text-lg font-bold text-emerald-400">
              {currentStreak} days 🔥
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800"></div>
          <div className="text-center sm:text-right">
            <div className="text-zinc-400 font-medium">Longest Streak</div>
            <div className="text-lg font-bold text-purple-400">
              {longestStreak} days ⚡
            </div>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[760px] space-y-2">
          {/* Month Labels Header */}
          <div className="flex text-[11px] font-semibold text-zinc-400 pl-8 relative h-4">
            {monthLabels.map((m, idx) => (
              <span
                key={idx}
                className="absolute"
                style={{ left: `${m.weekIndex * 14 + 32}px` }}
              >
                {m.name}
              </span>
            ))}
          </div>

          {/* Grid Rows (Days of Week) */}
          <div className="flex gap-1">
            {/* Day Labels Column */}
            <div className="flex flex-col justify-between text-[10px] font-mono text-zinc-500 py-0.5 pr-2 w-8 shrink-0">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* 52 Week Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`w-3 h-3 rounded-[3px] border transition-all cursor-pointer ${
                        LEVEL_CLASSES[day.level]
                      }`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${day.count} contributions on ${day.date}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer: Hover Info & Intensity Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800/60 text-xs">
        <div className="text-zinc-300 font-mono h-5 flex items-center">
          {hoveredDay ? (
            <span className="inline-flex items-center gap-1.5 bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700 text-white font-sans">
              <span className="font-bold text-emerald-400">
                {hoveredDay.count} {hoveredDay.count === 1 ? "commit" : "commits"}
              </span>{" "}
              on{" "}
              <span suppressHydrationWarning>
                {new Date(hoveredDay.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </span>
          ) : (
            <span className="text-zinc-500 text-xs italic font-sans">
              Hover over squares to inspect daily activity
            </span>
          )}
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <span>Less</span>
          <div className="flex gap-1">
            <span className="w-3 h-3 rounded-[3px] bg-zinc-900 border border-zinc-800/80 inline-block"></span>
            <span className="w-3 h-3 rounded-[3px] bg-emerald-950 border border-emerald-800/80 inline-block"></span>
            <span className="w-3 h-3 rounded-[3px] bg-emerald-800 border border-emerald-700 inline-block"></span>
            <span className="w-3 h-3 rounded-[3px] bg-emerald-600 border border-emerald-500 inline-block"></span>
            <span className="w-3 h-3 rounded-[3px] bg-emerald-400 border border-emerald-300 inline-block"></span>
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
