import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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
      // Run git diff HEAD -- <filePath>
      diffContent = execSync(`git diff HEAD -- "${filePath}"`, {
        cwd: normalizedProjectPath,
        encoding: "utf-8",
        timeout: 4000,
      });
    } catch {
      diffContent = "";
    }

    // If git diff returned empty (e.g. untracked or new file), read file directly
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

    // Calculate additions and deletions count
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
