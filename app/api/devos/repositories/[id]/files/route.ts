import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface FileTreeEntry {
  name: string;
  relativePath: string;
  type: "file" | "directory";
  sizeBytes?: number;
  extension?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const localPath = searchParams.get("localPath");
    const requestedPath = searchParams.get("path") || "";
    const ref = searchParams.get("ref") || ""; // Commit SHA or "HEAD"

    if (!localPath || !fs.existsSync(localPath)) {
      return NextResponse.json({ error: "Local repository path not found" }, { status: 404 });
    }

    const normalizedProjectPath = path.normalize(localPath);

    // ==========================================
    // HISTORICAL COMMIT CHECKPOINT MODE (git show / git ls-tree)
    // ==========================================
    if (ref && ref !== "HEAD") {
      try {
        const cleanPath = requestedPath.replace(/\\/g, "/").replace(/^\//, "");

        // 1. Check if requested path is a file or directory at commit <ref>
        let isFile = false;
        if (cleanPath) {
          try {
            const catType = execSync(`git cat-file -t "${ref}:${cleanPath}"`, {
              cwd: normalizedProjectPath,
              encoding: "utf-8",
              timeout: 2000,
            }).trim();
            if (catType === "blob") isFile = true;
          } catch {}
        }

        // READ HISTORICAL FILE CONTENT
        if (isFile) {
          let content = "";
          try {
            content = execSync(`git show "${ref}:${cleanPath}"`, {
              cwd: normalizedProjectPath,
              encoding: "utf-8",
              timeout: 3000,
            });
          } catch {}

          const lines = content.split("\n");
          return NextResponse.json({
            type: "file",
            ref,
            name: path.basename(cleanPath),
            relativePath: cleanPath,
            sizeBytes: Buffer.byteLength(content, "utf-8"),
            linesCount: lines.length,
            extension: path.extname(cleanPath).replace(".", "") || "txt",
            content,
          });
        }

        // READ HISTORICAL DIRECTORY CONTENTS (git ls-tree)
        const treeCmd = cleanPath
          ? `git ls-tree "${ref}:${cleanPath}"`
          : `git ls-tree "${ref}"`;

        const rawTree = execSync(treeCmd, {
          cwd: normalizedProjectPath,
          encoding: "utf-8",
          timeout: 3000,
        }).trim();

        const entries: FileTreeEntry[] = [];
        if (rawTree) {
          const lines = rawTree.split("\n");
          lines.forEach((line) => {
            // git ls-tree format: <mode> <type> <object> <file>
            const parts = line.split(/\s+/);
            const type = parts[1] === "tree" ? "directory" : "file";
            const name = parts.slice(3).join(" ");
            const relP = cleanPath ? `${cleanPath}/${name}` : name;

            // Ignore system folders
            if (name === ".git" || name === "node_modules" || name === ".next") return;

            entries.push({
              name,
              relativePath: relP,
              type,
              extension: type === "file" ? path.extname(name).replace(".", "") || "txt" : undefined,
            });
          });
        }

        entries.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "directory" ? -1 : 1;
        });

        return NextResponse.json({
          type: "directory",
          ref,
          currentPath: cleanPath,
          entries,
        });
      } catch (err: any) {
        console.error("Historical commit fetch error:", err);
      }
    }

    // ==========================================
    // LOCAL WORKING TREE MODE (DISK)
    // ==========================================
    const targetPath = path.normalize(path.join(normalizedProjectPath, requestedPath));

    if (!targetPath.startsWith(normalizedProjectPath)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "Requested file or directory not found" }, { status: 404 });
    }

    const stat = fs.statSync(targetPath);

    if (stat.isFile()) {
      if (stat.size > 2 * 1024 * 1024) {
        return NextResponse.json({
          type: "file",
          ref: "HEAD",
          name: path.basename(targetPath),
          relativePath: requestedPath,
          sizeBytes: stat.size,
          isBinary: true,
          content: "Binary file or file too large to preview (> 2MB).",
        });
      }

      const content = fs.readFileSync(targetPath, "utf-8");
      const lines = content.split("\n");

      return NextResponse.json({
        type: "file",
        ref: "HEAD",
        name: path.basename(targetPath),
        relativePath: requestedPath,
        sizeBytes: stat.size,
        linesCount: lines.length,
        extension: path.extname(targetPath).replace(".", "") || "txt",
        content,
      });
    }

    const dirEntries = fs.readdirSync(targetPath, { withFileTypes: true });

    const filteredEntries = dirEntries.filter((e) => {
      const n = e.name;
      return n !== ".git" && n !== "node_modules" && n !== ".next" && n !== "dist" && n !== "build";
    });

    const result: FileTreeEntry[] = filteredEntries.map((e) => {
      const relP = path.join(requestedPath, e.name).replace(/\\/g, "/");
      const fullP = path.join(targetPath, e.name);

      if (e.isDirectory()) {
        return {
          name: e.name,
          relativePath: relP,
          type: "directory",
        };
      }

      let size = 0;
      try {
        size = fs.statSync(fullP).size;
      } catch {}

      return {
        name: e.name,
        relativePath: relP,
        type: "file",
        sizeBytes: size,
        extension: path.extname(e.name).replace(".", "") || "txt",
      };
    });

    result.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === "directory" ? -1 : 1;
    });

    return NextResponse.json({
      type: "directory",
      ref: "HEAD",
      currentPath: requestedPath,
      entries: result,
    });
  } catch (error: any) {
    console.error("Repository files API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to inspect repository files" },
      { status: 500 }
    );
  }
}
