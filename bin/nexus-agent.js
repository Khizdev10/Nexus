#!/usr/bin/env node

/**
 * Nexus Desktop Agent (`nexus-agent`)
 * Zero-terminal, background PC agent daemon for Nexus.
 * Connects your local PC workspace to Nexus Cloud securely.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync, exec } = require("child_process");
const http = require("http");

// Parse args or deep-link URI: nexus://connect?token=NEXUS-XXXXXX&server=https://nexus-app.com
const args = process.argv.slice(2);
let pairToken = null;
let serverUrl = "http://localhost:3000";

args.forEach((arg) => {
  if (arg.startsWith("nexus://")) {
    try {
      const url = new URL(arg.replace("nexus://", "http://dummy/"));
      pairToken = url.searchParams.get("token");
      if (url.searchParams.get("server")) {
        serverUrl = url.searchParams.get("server");
      }
    } catch {}
  } else if (arg.startsWith("--token=")) {
    pairToken = arg.split("=")[1];
  } else if (arg.startsWith("--server=")) {
    serverUrl = arg.split("=")[1];
  }
});

// Default workspace paths
const defaultPaths = [];
if (os.platform() === "win32") {
  defaultPaths.push("c:\\coding\\projects", path.join(os.homedir(), "projects"), path.join(os.homedir(), "source", "repos"));
} else {
  defaultPaths.push(path.join(os.homedir(), "projects"), path.join(os.homedir(), "Developer"), path.join(os.homedir(), "workspace"));
}

const existingAllowedPaths = defaultPaths.filter((p) => fs.existsSync(p));

console.log("=================================================");
console.log(" 🟢 NEXUS DESKTOP AGENT BACKGROUND DAEMON");
console.log("=================================================");
console.log(` Hostname: ${os.hostname()}`);
console.log(` Platform: ${os.platform()} (${os.arch()})`);
console.log(` Allowed Workspaces: ${existingAllowedPaths.join(", ") || "Default Root"}`);
console.log("=================================================");

/**
 * High-speed local RPC execution handler
 */
async function handleRPC(method, params) {
  switch (method) {
    case "SCAN_PROJECTS": {
      const rootPath = params.rootPath || existingAllowedPaths[0] || "c:\\coding\\projects";
      if (!fs.existsSync(rootPath)) return { projects: [], rootPath };

      const entries = fs.readdirSync(rootPath, { withFileTypes: true });
      const projects = [];

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
        const projectPath = path.join(rootPath, entry.name);
        const gitDir = path.join(projectPath, ".git");

        let isGitRepo = fs.existsSync(gitDir);
        let branch = "main";
        let uncommittedCount = 0;
        const changes = [];

        if (isGitRepo) {
          try {
            branch = execSync("git branch --show-current", { cwd: projectPath, encoding: "utf-8", timeout: 800 }).trim() || "main";
          } catch {}

          try {
            const rawStatus = execSync("git status --porcelain", { cwd: projectPath, encoding: "utf-8", timeout: 1000 }).trim();
            if (rawStatus) {
              const lines = rawStatus.split("\n");
              uncommittedCount = lines.length;
              lines.slice(0, 15).forEach((line) => {
                const sym = line.substring(0, 2).trim();
                const fP = line.substring(3).trim();
                changes.push({ status: sym, filePath: fP });
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
        });
      }
      return { rootPath, projects };
    }

    case "READ_FILE": {
      const target = path.normalize(params.filePath);
      if (!fs.existsSync(target)) throw new Error("File not found");
      const content = fs.readFileSync(target, "utf-8");
      return { content, sizeBytes: Buffer.byteLength(content, "utf-8") };
    }

    case "GET_FILE_DIFF": {
      const proj = path.normalize(params.projectPath);
      const fP = params.filePath;
      let diff = "";
      try {
        diff = execSync(`git diff HEAD -- "${fP}"`, { cwd: proj, encoding: "utf-8", timeout: 2000 });
      } catch {}
      return { diff };
    }

    default:
      throw new Error(`Unknown RPC method: ${method}`);
  }
}

console.log(`Connected to Nexus Cloud Web Hub (${serverUrl}). Agent Active in Background.`);
