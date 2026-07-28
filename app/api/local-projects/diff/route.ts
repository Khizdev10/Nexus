import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface FileDiffSummary {
  filename: string;
  status: "modified" | "added" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get("projectPath");
    const filePath = searchParams.get("filePath");

    if (!projectPath || !filePath) {
      return NextResponse.json(
        { error: "projectPath and filePath parameters are required" },
        { status: 400 }
      );
    }

    const normalizedProjectPath = path.normalize(projectPath);
    const fullFilePath = path.join(normalizedProjectPath, filePath);

    if (!fs.existsSync(normalizedProjectPath)) {
      return NextResponse.json(
        { error: `Project directory not found: ${projectPath}` },
        { status: 404 }
      );
    }

    let diffContent = "";
    let additionsCount = 0;
    let deletionsCount = 0;

    try {
      diffContent = execSync(`git diff HEAD -- "${filePath}"`, {
        cwd: normalizedProjectPath,
        encoding: "utf-8",
        timeout: 4000,
      });
    } catch {
      diffContent = "";
    }

    if (!diffContent && fs.existsSync(fullFilePath)) {
      try {
        const fileStats = fs.statSync(fullFilePath);
        if (fileStats.isFile()) {
          const content = fs.readFileSync(fullFilePath, "utf-8");
          const lines = content.split("\n");
          diffContent = `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n` +
            lines.map((line) => `+${line}`).join("\n");
        }
      } catch {}
    }

    if (diffContent) {
      const lines = diffContent.split("\n");
      lines.forEach((line) => {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          additionsCount++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          deletionsCount++;
        }
      });
    }

    return NextResponse.json({
      filePath,
      projectPath: normalizedProjectPath,
      diff: diffContent || "No diff output available.",
      additionsCount,
      deletionsCount,
    });
  } catch (error: any) {
    console.error("Error fetching file diff:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch file diff" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectPath, mode } = body; // mode: "uncommitted" | "ahead" | "behind"

    if (!projectPath || !fs.existsSync(projectPath)) {
      return NextResponse.json({ error: "Valid projectPath is required" }, { status: 400 });
    }

    let diffRaw = "";
    let branch = "main";

    try {
      branch = execSync("git branch --show-current", { cwd: projectPath, encoding: "utf-8" }).trim() || "main";
    } catch {}

    if (mode === "ahead") {
      try {
        diffRaw = execSync(`git diff origin/${branch}..HEAD`, {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 5000,
        });
      } catch {
        try {
          diffRaw = execSync("git diff HEAD~1..HEAD", { cwd: projectPath, encoding: "utf-8", timeout: 4000 });
        } catch {}
      }
    } else if (mode === "behind") {
      try {
        diffRaw = execSync(`git diff HEAD..origin/${branch}`, {
          cwd: projectPath,
          encoding: "utf-8",
          timeout: 5000,
        });
      } catch {}
    } else {
      // Default: uncommitted changes (working tree & staged)
      try {
        diffRaw = execSync("git diff HEAD", { cwd: projectPath, encoding: "utf-8", timeout: 5000 });
      } catch {}

      // If git diff HEAD is empty, check for untracked files
      if (!diffRaw) {
        try {
          const statusOutput = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8" }).trim();
          if (statusOutput) {
            const untrackedFiles = statusOutput
              .split("\n")
              .filter((l) => l.startsWith("??"))
              .map((l) => l.substring(3).trim());

            untrackedFiles.forEach((file) => {
              const fullP = path.join(projectPath, file);
              if (fs.existsSync(fullP) && fs.statSync(fullP).isFile()) {
                const c = fs.readFileSync(fullP, "utf-8");
                const lines = c.split("\n");
                diffRaw += `diff --git a/${file} b/${file}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n` +
                  lines.map((l) => `+${l}`).join("\n") + "\n";
              }
            });
          }
        } catch {}
      }
    }

    const files: FileDiffSummary[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    if (diffRaw) {
      const fileBlocks = diffRaw.split(/^diff --git /m).filter(Boolean);

      fileBlocks.forEach((block) => {
        const lines = block.split("\n");
        const header = lines[0] || "";
        const match = header.match(/a\/(.*?)\s+b\/(.*)/);
        const filename = match ? match[2] : header.split(" ").pop() || "modified-file";

        let additions = 0;
        let deletions = 0;
        let status: FileDiffSummary["status"] = "modified";

        if (block.includes("--- /dev/null")) status = "added";
        else if (block.includes("+++ /dev/null")) status = "deleted";

        lines.forEach((l) => {
          if (l.startsWith("+") && !l.startsWith("+++")) additions++;
          if (l.startsWith("-") && !l.startsWith("---")) deletions++;
        });

        totalAdditions += additions;
        totalDeletions += deletions;

        files.push({
          filename,
          status,
          additions,
          deletions,
          patch: block,
        });
      });
    }

    return NextResponse.json({
      projectPath,
      mode: mode || "uncommitted",
      files,
      totalFiles: files.length,
      totalAdditions,
      totalDeletions,
    });
  } catch (error: any) {
    console.error("Error fetching multi-file diff preview:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate code diff preview" },
      { status: 500 }
    );
  }
}
