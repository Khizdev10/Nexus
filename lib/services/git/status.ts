import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { DevOSGitStatus } from "@/types/devos";

/**
 * Service to inspect local Git status, uncommitted files, and ahead/behind counts against GitHub
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

  // 1. Get current branch
  try {
    result.branch = execSync("git branch --show-current", {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 1500,
    }).trim() || "main";
  } catch {}

  // 2. Run git fetch to update remote origin references from GitHub
  try {
    execSync(`git fetch origin ${result.branch}`, {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 2500,
    });
  } catch {
    try {
      execSync("git fetch", {
        cwd: localPath,
        encoding: "utf-8",
        timeout: 2500,
      });
    } catch {}
  }

  // 3. Calculate Ahead / Behind counts against remote origin
  try {
    const revOutput = execSync(`git rev-list --left-right --count ${result.branch}...origin/${result.branch}`, {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 2000,
    }).trim();

    if (revOutput) {
      const [ahead, behind] = revOutput.split("\t").map(Number);
      result.ahead = ahead || 0;
      result.behind = behind || 0;
    }
  } catch {
    try {
      const revOutput = execSync("git rev-list --left-right --count HEAD...@{upstream}", {
        cwd: localPath,
        encoding: "utf-8",
        timeout: 2000,
      }).trim();
      if (revOutput) {
        const [ahead, behind] = revOutput.split("\t").map(Number);
        result.ahead = ahead || 0;
        result.behind = behind || 0;
      }
    } catch {}
  }

  // 4. Status porcelain (uncommitted file changes)
  try {
    const statusOutput = execSync("git status --porcelain", {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 3000,
    }).trim();

    if (statusOutput) {
      result.isClean = false;
      const lines = statusOutput.split("\n");

      lines.forEach((line) => {
        const symbol = line.substring(0, 2).trim();
        const file = line.substring(3).trim();

        if (symbol === "M") result.modifiedFiles.push(file);
        else if (symbol === "A") result.stagedFiles.push(file);
        else if (symbol === "D") result.deletedFiles.push(file);
        else if (symbol === "??") result.untrackedFiles.push(file);
      });
    }
  } catch {}

  return result;
}
