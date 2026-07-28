import { execSync } from "child_process";
import fs from "fs";
import { clearStatusCache } from "./status";
import { clearRepoCache } from "../github/repositories";

export interface GitActionResult {
  success: boolean;
  message: string;
  output?: string;
}

/**
 * Extracts owner/repo from SSH or HTTPS GitHub remote URLs
 * e.g. git@github.com:owner/repo.git -> owner/repo
 * e.g. https://github.com/owner/repo.git -> owner/repo
 */
function parseGitHubRepoPath(remoteUrl: string): string | null {
  if (!remoteUrl) return null;
  const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/\.]+)(\.git)?/i);
  if (match && match[1] && match[2]) {
    return `${match[1]}/${match[2]}`;
  }
  return null;
}

/**
 * Executes local Git operations: commit, push, pull, fetch with GitHub OAuth / PAT support.
 * Clears local status & repo caches and updates local remote tracking refs to guarantee
 * immediate SYNCED state in the UI.
 */
export function executeGitAction(
  localPath: string,
  action: "commit" | "push" | "pull" | "fetch",
  commitMessage?: string,
  token?: string | null
): GitActionResult {
  if (!localPath || !fs.existsSync(localPath)) {
    return { success: false, message: `Local directory not found: ${localPath}` };
  }

  const activeToken = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN || token;

  try {
    switch (action) {
      case "fetch": {
        let fetchCmd = "git fetch --all";

        // Use PAT-authenticated fetch if token is available
        if (activeToken) {
          try {
            const remoteUrl = execSync("git remote get-url origin", { cwd: localPath, encoding: "utf-8" }).trim();
            const repoPath = parseGitHubRepoPath(remoteUrl);
            if (repoPath) {
              fetchCmd = `git -c credential.helper= fetch https://${activeToken}@github.com/${repoPath}.git`;
            }
          } catch { /* fall back to unauthenticated fetch */ }
        }

        const out = execSync(fetchCmd, {
          cwd: localPath,
          encoding: "utf-8",
          timeout: 10000,
        });
        clearStatusCache(localPath);
        return { success: true, message: "Fetched latest changes from GitHub origin.", output: out };
      }

      case "pull": {
        let pullCmd = "git pull --no-rebase";
        if (activeToken) {
          try {
            const branch = execSync("git branch --show-current", { cwd: localPath, encoding: "utf-8" }).trim() || "main";
            const remoteUrl = execSync("git remote get-url origin", { cwd: localPath, encoding: "utf-8" }).trim();
            const repoPath = parseGitHubRepoPath(remoteUrl);
            if (repoPath) {
              pullCmd = `git -c credential.helper= pull https://${activeToken}@github.com/${repoPath}.git ${branch} --no-rebase`;
            }
          } catch {}
        }

        try {
          const out = execSync(pullCmd, {
            cwd: localPath,
            encoding: "utf-8",
            timeout: 20000,
          });
          clearStatusCache(localPath);
          clearRepoCache();
          return { success: true, message: "Pulled latest changes from GitHub successfully.", output: out };
        } catch (pullErr: any) {
          const errMsg = pullErr?.stderr || pullErr?.stdout || pullErr?.message || "";
          return {
            success: false,
            message: `Git pull error: ${errMsg}`,
            output: errMsg,
          };
        }
      }

      case "commit": {
        if (!commitMessage) {
          return { success: false, message: "Commit message is required." };
        }
        execSync("git add .", { cwd: localPath, encoding: "utf-8" });
        const out = execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
          cwd: localPath,
          encoding: "utf-8",
        });
        clearStatusCache(localPath);
        return { success: true, message: "Committed changes to local repository.", output: out };
      }

      case "push": {
        let branch = "main";
        try {
          branch = execSync("git branch --show-current", { cwd: localPath, encoding: "utf-8" }).trim() || "main";
        } catch {}

        // Auto-commit uncommitted changes if any
        try {
          const statusOutput = execSync("git status --porcelain", { cwd: localPath, encoding: "utf-8" }).trim();
          if (statusOutput) {
            const msg = commitMessage || `chore: update repository changes`;
            execSync("git add .", { cwd: localPath, encoding: "utf-8" });
            execSync(`git commit -m "${msg.replace(/"/g, '\\"')}"`, { cwd: localPath, encoding: "utf-8" });
          }
        } catch {}

        // Authenticated Push using Token
        if (activeToken) {
          try {
            const remoteUrl = execSync("git remote get-url origin", { cwd: localPath, encoding: "utf-8" }).trim();
            const repoPath = parseGitHubRepoPath(remoteUrl);
            if (repoPath) {
              const tokenPushCmd = `git -c credential.helper= push https://${activeToken}@github.com/${repoPath}.git ${branch}`;
              const out = execSync(tokenPushCmd, {
                cwd: localPath,
                encoding: "utf-8",
                timeout: 30000,
              });

              // CRITICAL FIX: Update local tracking ref so git status reflects 0 ahead immediately
              try {
                execSync(`git update-ref refs/remotes/origin/${branch} HEAD`, { cwd: localPath, encoding: "utf-8" });
              } catch {}

              clearStatusCache(localPath);
              clearRepoCache();
              return {
                success: true,
                message: `Successfully pushed commits to GitHub on branch '${branch}' via authenticated token.`,
                output: out,
              };
            }
          } catch (tokenPushErr: any) {
            const errStr = tokenPushErr?.stderr || tokenPushErr?.stdout || tokenPushErr?.message || "";
            if (errStr.includes("non-fast-forward") || errStr.includes("behind") || errStr.includes("rejected")) {
              throw new Error(
                "Push Rejected (Behind Remote): Remote GitHub repository has new commits that are not on your PC yet (e.g. files created on GitHub). Please click 'Pull' first to download remote changes!"
              );
            }
            if (errStr.includes("403") || errStr.includes("Permission")) {
              throw new Error(
                "GitHub Permission Denied (403): Your Personal Access Token lacks 'repo' write permissions."
              );
            }
            throw new Error(`Git push failed: ${errStr}`);
          }
        }

        // Local System Push fallback
        try {
          const out = execSync(`git push -u origin ${branch}`, {
            cwd: localPath,
            encoding: "utf-8",
            timeout: 30000,
          });

          try {
            execSync(`git update-ref refs/remotes/origin/${branch} HEAD`, { cwd: localPath, encoding: "utf-8" });
          } catch {}

          clearStatusCache(localPath);
          clearRepoCache();
          return {
            success: true,
            message: `Successfully pushed commits to GitHub on branch '${branch}' via system credentials.`,
            output: out,
          };
        } catch (systemPushErr: any) {
          const errMsg = systemPushErr?.stderr || systemPushErr?.message || "";
          if (errMsg.includes("non-fast-forward") || errMsg.includes("behind")) {
            throw new Error(
              "Push Rejected (Behind Remote): Remote GitHub repository has new commits that are not on your PC yet. Please click 'Pull' first to download remote changes!"
            );
          }
          throw systemPushErr;
        }
      }

      default:
        return { success: false, message: "Unknown Git action." };
    }
  } catch (error: any) {
    console.error(`[DevOS Git Operations] Error executing ${action}:`, error);
    return {
      success: false,
      message: error?.message || `Failed to execute git ${action}`,
      output: error?.stderr || error?.stdout || "",
    };
  }
}
