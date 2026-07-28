import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { DevOSGitStatus } from "@/types/devos";

export interface ExtendedGitStatus extends DevOSGitStatus {
  lastCommitDate?: string;
}

const localStatusCache = new Map<string, { status: ExtendedGitStatus; timestamp: number }>();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds in-memory cache

/**
 * Invalidate the local git status cache for a specific repo path, or all repos.
 * Called after successful git actions (commit, push, pull, fetch) to ensure
 * the next status check returns fresh data.
 */
export function clearStatusCache(localPath?: string): void {
  if (localPath) {
    localStatusCache.delete(localPath);
  } else {
    localStatusCache.clear();
  }
}

/**
 * High-speed local Git status inspection service (<30ms per repo)
 * Combines branch, ahead/behind, working tree state, and last commit timestamp
 * into a single fast `git status -b --porcelain` call plus a `git log` call.
 *
 * Porcelain format reference (two-column XY codes):
 *   Column 1 (X) = staging area status
 *   Column 2 (Y) = working tree status
 *   XY  Meaning
 *   M   staged modified      (X=M, Y= )
 *    M  unstaged modified    (X= , Y=M)
 *   MM  staged + unstaged    (X=M, Y=M)
 *   A   staged new file      (X=A, Y= )
 *   AM  staged new + edited  (X=A, Y=M)
 *   D   staged deletion      (X=D, Y= )
 *    D  unstaged deletion    (X= , Y=D)
 *   R   renamed              (X=R, Y= )
 *   ??  untracked
 */
export function getLocalGitStatus(localPath: string): ExtendedGitStatus {
  const result: ExtendedGitStatus = {
    branch: "main",
    ahead: 0,
    behind: 0,
    stagedFiles: [],
    modifiedFiles: [],
    untrackedFiles: [],
    deletedFiles: [],
    isClean: true,
  };

  if (!localPath || !fs.existsSync(localPath)) {
    return result;
  }

  const gitDir = path.join(localPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return result;
  }

  // Check 5-second in-memory cache
  const now = Date.now();
  const cached = localStatusCache.get(localPath);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  try {
    const rawOutput = execSync("git status -b --porcelain", {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 1500,
    }).trim();

    if (rawOutput) {
      const lines = rawOutput.split("\n");

      // Line 1: branch header — e.g. ## main...origin/main [ahead 1, behind 2]
      const header = lines[0] || "";
      if (header.startsWith("##")) {
        const branchMatch = header.match(/##\s+([^.\s]+)/);
        if (branchMatch && branchMatch[1]) {
          result.branch = branchMatch[1];
        }

        const aheadMatch = header.match(/ahead\s+(\d+)/);
        if (aheadMatch && aheadMatch[1]) {
          result.ahead = parseInt(aheadMatch[1], 10);
        }

        const behindMatch = header.match(/behind\s+(\d+)/);
        if (behindMatch && behindMatch[1]) {
          result.behind = parseInt(behindMatch[1], 10);
        }
      }

      // Remaining lines: two-column XY status codes
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.length < 4) continue;
        result.isClean = false;

        const x = line[0]; // staging area
        const y = line[1]; // working tree
        const file = line.substring(3).trim();

        // Untracked files
        if (x === "?" && y === "?") {
          result.untrackedFiles.push(file);
          continue;
        }

        // Staging area changes (column 1)
        if (x === "A" || x === "R") {
          result.stagedFiles.push(file);
        } else if (x === "M") {
          result.stagedFiles.push(file);
        } else if (x === "D") {
          result.deletedFiles.push(file);
        }

        // Working tree changes (column 2) — unstaged edits on top of staged state
        if (y === "M") {
          result.modifiedFiles.push(file);
        } else if (y === "D") {
          result.deletedFiles.push(file);
        }
      }
    }

    // Get last commit date (<10ms) to compare with GitHub API lastPush
    try {
      const lastCommitIso = execSync("git log -1 --format=%cd --date=iso-strict", {
        cwd: localPath,
        encoding: "utf-8",
        timeout: 800,
      }).trim().replace(/"/g, ""); // Strip any surrounding quotes from Windows shell
      if (lastCommitIso) {
        result.lastCommitDate = lastCommitIso;
      }
    } catch { /* empty repo or no commits */ }

    localStatusCache.set(localPath, { status: result, timestamp: now });
  } catch {
    // Fallback: try to at least get the branch name
    try {
      result.branch = execSync("git branch --show-current", {
        cwd: localPath,
        encoding: "utf-8",
        timeout: 800,
      }).trim() || "main";
    } catch { /* ignore */ }
  }

  return result;
}
