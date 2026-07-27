import { execSync } from "child_process";
import fs from "fs";

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
 * Executes local Git operations: commit, push, pull, fetch with GitHub OAuth / Local SSH support
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

  try {
    switch (action) {
      case "fetch": {
        const out = execSync("git fetch --all", {
          cwd: localPath,
          encoding: "utf-8",
          timeout: 10000,
        });
        return { success: true, message: "Fetched latest changes from GitHub origin.", output: out };
      }

      case "pull": {
        let pullCmd = "git pull";
        if (token) {
          try {
            const branch = execSync("git branch --show-current", { cwd: localPath, encoding: "utf-8" }).trim() || "main";
            const remoteUrl = execSync("git remote get-url origin", { cwd: localPath, encoding: "utf-8" }).trim();
            const repoPath = parseGitHubRepoPath(remoteUrl);
            if (repoPath) {
              pullCmd = `git pull https://x-access-token:${token}@github.com/${repoPath}.git ${branch}`;
            }
          } catch {}
        }

        try {
          const out = execSync(pullCmd, {
            cwd: localPath,
            encoding: "utf-8",
            timeout: 15000,
          });
          return { success: true, message: "Pulled latest changes from GitHub successfully.", output: out };
        } catch {
          const out = execSync("git pull", {
            cwd: localPath,
            encoding: "utf-8",
            timeout: 15000,
          });
          return { success: true, message: "Pulled latest changes via local git origin.", output: out };
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

        // Attempt 1: Standard local git push (uses local SSH keys / Git Credential Manager)
        try {
          const out = execSync(`git push origin ${branch}`, {
            cwd: localPath,
            encoding: "utf-8",
            timeout: 30000,
          });
          return {
            success: true,
            message: `Successfully pushed commits to GitHub on branch '${branch}' via local Git credentials.`,
            output: out,
          };
        } catch (localPushErr: any) {
          // Attempt 2: Token-authenticated HTTPS push
          if (token) {
            try {
              const remoteUrl = execSync("git remote get-url origin", { cwd: localPath, encoding: "utf-8" }).trim();
              const repoPath = parseGitHubRepoPath(remoteUrl);
              if (repoPath) {
                const tokenPushCmd = `git push https://x-access-token:${token}@github.com/${repoPath}.git ${branch}`;
                const out = execSync(tokenPushCmd, {
                  cwd: localPath,
                  encoding: "utf-8",
                  timeout: 30000,
                });
                return {
                  success: true,
                  message: `Successfully pushed commits to GitHub on branch '${branch}' via OAuth token.`,
                  output: out,
                };
              }
            } catch (tokenPushErr: any) {
              const errStr = tokenPushErr?.message || "";
              if (errStr.includes("403")) {
                throw new Error(
                  "GitHub Permission Denied (403): Your OAuth token or local Git credentials lack write access to this repository. Ensure your GitHub Personal Access Token or SSH key has 'repo' write permissions."
                );
              }
              throw tokenPushErr;
            }
          }

          const localErrMsg = localPushErr?.stderr || localPushErr?.message || "";
          if (localErrMsg.includes("403")) {
            throw new Error(
              "GitHub Permission Denied (403): Your local Git credentials or SSH key lack write access to 'Khizdev10/life-sync.git'. Please check repository permissions on GitHub or run 'git push' in your terminal to authenticate."
            );
          }
          throw localPushErr;
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
