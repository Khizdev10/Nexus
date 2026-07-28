import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { DevOSGitStatus } from "@/types/devos";

const localStatusCache = new Map<string, { status: DevOSGitStatus; timestamp: number }>();
const CACHE_TTL_MS = 5 * 1000; // 5 seconds in-memory cache
/**
 * Ultra-fast single-command local Git status inspection service (<30ms per repo)
 * Combines branch, ahead/behind, and working tree state into 1 single 'git status -b --porcelain' call.
 */
export function getLocalGitStatus(localPath: string): DevOSGitStatus {
  const result: DevOSGitStatus = {
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

  // 1. Check 5-second in-memory cache (0ms response)
  const now = Date.now();
  const cached = localStatusCache.get(localPath);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.status;
  }

  // 2. Single unified command: git status -b --porcelain (~30ms total)
  try {
    const rawOutput = execSync("git status -b --porcelain", {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 1500,
    }).trim();

    if (rawOutput) {
      const lines = rawOutput.split("\n");

      // Line 1 contains branch and ahead/behind info e.g. ## main...origin/main [ahead 1, behind 2]
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

      // Remaining lines contain modified/staged/untracked files
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        result.isClean = false;

        const symbol = line.substring(0, 2).trim();
        const file = line.substring(3).trim();

        if (symbol === "M") result.modifiedFiles.push(file);
        else if (symbol === "A") result.stagedFiles.push(file);
        else if (symbol === "D") result.deletedFiles.push(file);
        else if (symbol === "??" || symbol === "U") result.untrackedFiles.push(file);
      }
    }

    localStatusCache.set(localPath, { status: result, timestamp: now });
  } catch (err) {
    // Basic fallback if combined command fails
    try {
      result.branch = execSync("git branch --show-current", { cwd: localPath, encoding: "utf-8", timeout: 800 }).trim() || "main";
    } catch { }
  }

  return result;
}
