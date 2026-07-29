import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export interface LocalFileChange {
  status: "M" | "A" | "D" | "??" | "U" | "R";
  statusText: string;
  filePath: string;
}

export interface LocalCommit {
  sha: string;
  message: string;
  author: string;
  relativeTime: string;
}

export interface LocalProject {
  name: string;
  fullPath: string;
  isGitRepo: boolean;
  branch: string;
  uncommittedCount: number;
  changes: LocalFileChange[];
  recentCommits: LocalCommit[];
  lastModifiedDate: string;
}

// In-Memory Cache (TTL: 3 seconds) for super-fast API response
const CACHE_TTL_MS = 3000;
const memoryCache: Record<string, { timestamp: number; data: any }> = {};

const IGNORED_FOLDERS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  "vendor",
  ".git",
  "tmp",
  "coverage",
]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let rootPath = searchParams.get("rootPath") || "c:\\coding\\projects";
    rootPath = path.normalize(rootPath);

    const isCloudEnvironment = !!process.env.VERCEL || !fs.existsSync(rootPath);

    const now = Date.now();
    const cached = memoryCache[rootPath];

    // Return instant cached response if within TTL
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    if (isCloudEnvironment && !fs.existsSync(rootPath)) {
      return NextResponse.json({
        rootPath,
        isCloudEnvironment: true,
        message: "Running in Cloud Mode (Vercel). Local disk filesystem is disabled.",
        projects: [],
        totalProjects: 0,
      });
    }

    if (!fs.existsSync(rootPath)) {
      return NextResponse.json(
        { error: `Directory not found: ${rootPath}`, projects: [], isCloudEnvironment },
        { status: 404 }
      );
    }

    const entries = fs.readdirSync(rootPath, { withFileTypes: true });
    const projects: LocalProject[] = [];

    // Filter valid project directories
    const validEntries = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith(".") && !IGNORED_FOLDERS.has(e.name))
      .slice(0, 100); // Support up to 100 local projects

    for (const entry of validEntries) {
      const projectPath = path.join(rootPath, entry.name);
      let isGitRepo = false;
      let branch = "main";
      let uncommittedCount = 0;
      const changes: LocalFileChange[] = [];
      const recentCommits: LocalCommit[] = [];
      let lastModifiedDate = new Date().toISOString();

      try {
        const stats = fs.statSync(projectPath);
        lastModifiedDate = stats.mtime.toISOString();
      } catch {}

      const gitDir = path.join(projectPath, ".git");
      if (fs.existsSync(gitDir)) {
        isGitRepo = true;

        // Get current branch with 800ms fast timeout
        try {
          branch = execSync("git branch --show-current", {
            cwd: projectPath,
            encoding: "utf-8",
            timeout: 800,
          }).trim() || "main";
        } catch {
          branch = "main";
        }

        // Get git status porcelain with 1000ms fast timeout
        try {
          const statusOutput = execSync("git status --porcelain", {
            cwd: projectPath,
            encoding: "utf-8",
            timeout: 1000,
          }).trim();

          if (statusOutput) {
            const lines = statusOutput.split("\n");
            uncommittedCount = lines.length;

            lines.slice(0, 20).forEach((line) => {
              const statusSymbol = line.substring(0, 2).trim() as LocalFileChange["status"];
              const filePath = line.substring(3).trim();

              let statusText = "Modified";
              if (statusSymbol === "A") statusText = "Added";
              else if (statusSymbol === "D") statusText = "Deleted";
              else if (statusSymbol === "??") statusText = "Untracked";
              else if (statusSymbol === "R") statusText = "Renamed";

              changes.push({
                status: statusSymbol,
                statusText,
                filePath,
              });
            });
          }
        } catch {}

        // Get recent commits with 1000ms fast timeout
        try {
          const logOutput = execSync('git log -n 5 --pretty=format:"%h|%s|%an|%cr"', {
            cwd: projectPath,
            encoding: "utf-8",
            timeout: 1000,
          }).trim();

          if (logOutput) {
            logOutput.split("\n").forEach((line) => {
              const [sha, message, author, relativeTime] = line.split("|");
              if (sha && message) {
                recentCommits.push({
                  sha,
                  message,
                  author: author || "Developer",
                  relativeTime: relativeTime || "Recently",
                });
              }
            });
          }
        } catch {}
      }

      projects.push({
        name: entry.name,
        fullPath: projectPath,
        isGitRepo,
        branch,
        uncommittedCount,
        changes,
        recentCommits,
        lastModifiedDate,
      });
    }

    // Sort projects: most recently modified first
    projects.sort(
      (a, b) => new Date(b.lastModifiedDate).getTime() - new Date(a.lastModifiedDate).getTime()
    );

    const responsePayload = {
      rootPath,
      isCloudEnvironment: false,
      totalProjects: projects.length,
      projects,
    };

    // Save to memory cache
    memoryCache[rootPath] = {
      timestamp: now,
      data: responsePayload,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Local projects API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to scan local projects", projects: [], isCloudEnvironment: !!process.env.VERCEL },
      { status: 500 }
    );
  }
}
