import fs from "fs";
import { execSync } from "child_process";

export interface DevOSBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommitSha?: string;
  lastCommitMessage?: string;
}

export function getLocalAndRemoteBranches(localPath: string): DevOSBranch[] {
  if (!localPath || !fs.existsSync(localPath)) {
    return [
      { name: "main", isCurrent: true, isRemote: false },
      { name: "master", isCurrent: false, isRemote: false },
    ];
  }

  const branches: DevOSBranch[] = [];

  try {
    const rawOutput = execSync("git branch -a --format=\"%(HEAD)|%(refname:short)|%(objectname:short)|%(subject)\"", {
      cwd: localPath,
      encoding: "utf-8",
      timeout: 2000,
    }).trim();

    if (rawOutput) {
      const lines = rawOutput.split("\n");
      const seen = new Set<string>();

      lines.forEach((line) => {
        const parts = line.split("|");
        const head = parts[0]?.trim() || "";
        let name = parts[1]?.trim() || "";
        const sha = parts[2]?.trim() || "";
        const message = parts[3]?.trim() || "";

        if (!name || name.includes("HEAD")) return;

        const isCurrent = head === "*";
        const isRemote = name.startsWith("origin/");

        if (seen.has(name)) return;
        seen.add(name);

        branches.push({
          name,
          isCurrent,
          isRemote,
          lastCommitSha: sha,
          lastCommitMessage: message,
        });
      });
    }
  } catch {
    branches.push({ name: "main", isCurrent: true, isRemote: false });
  }

  return branches;
}
