import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export interface EnvVariableItem {
  key: string;
  value: string;
  category: "SECRET" | "URL" | "CONFIG";
  isSecret: boolean;
}

export interface DiscoveredProject {
  name: string;
  fullPath: string;
  envFilesCount: number;
  isProtected: boolean;
}

/**
 * Dynamically discover all env files in a directory (env, .env, .env.local, .env.development, .env.production, etc.)
 */
function discoverEnvFiles(projectDir: string): string[] {
  if (!fs.existsSync(projectDir)) return [];
  try {
    const entries = fs.readdirSync(projectDir, { withFileTypes: true });
    const envFiles: string[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const name = entry.name;
        if (name === "env" || name === ".env" || name.startsWith(".env.") || name.endsWith(".env")) {
          envFiles.push(name);
        }
      }
    }

    // Logical sorting priority
    const priority = [".env.local", ".env", "env", ".env.development", ".env.production", ".env.staging", ".env.test", ".env.example"];
    return envFiles.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  } catch {
    return [".env.local", ".env"];
  }
}

/**
 * Determine key category and whether value should be masked by default
 */
function categorizeKey(key: string): { category: EnvVariableItem["category"]; isSecret: boolean } {
  const k = key.toUpperCase();
  const isSecret =
    k.includes("SECRET") ||
    k.includes("KEY") ||
    k.includes("TOKEN") ||
    k.includes("PASSWORD") ||
    k.includes("AUTH") ||
    k.includes("PRIVATE") ||
    k.includes("CREDENTIAL");

  if (k.includes("URL") || k.includes("URI") || k.includes("HOST") || k.includes("ENDPOINT")) {
    return { category: "URL", isSecret };
  }
  if (isSecret) {
    return { category: "SECRET", isSecret: true };
  }
  return { category: "CONFIG", isSecret: false };
}

/**
 * Parse .env file string content into Key-Value objects
 */
function parseEnvContent(content: string): EnvVariableItem[] {
  const lines = content.split("\n");
  const result: EnvVariableItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    const { category, isSecret } = categorizeKey(key);
    result.push({ key, value, category, isSecret });
  }

  return result;
}

/**
 * Serialize Key-Value objects back to .env string
 */
function serializeEnvContent(variables: EnvVariableItem[]): string {
  return variables
    .map((v) => {
      const needsQuotes = v.value.includes(" ") || v.value.includes("#") || v.value.includes("=");
      const formattedVal = needsQuotes ? `"${v.value}"` : v.value;
      return `${v.key}=${formattedVal}`;
    })
    .join("\n");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetPath = searchParams.get("projectPath") || "c:\\coding\\projects\\devi";
    const scanRoot = searchParams.get("scanRoot") || "c:\\coding\\projects";

    const isCloudEnvironment = !!process.env.VERCEL || !fs.existsSync(targetPath);
    const resolvedPath = path.resolve(targetPath);

    // Dynamic discovery of all env files in target path
    const availableEnvFiles = discoverEnvFiles(resolvedPath);
    let envFileName = searchParams.get("envFileName");
    if (!envFileName || !availableEnvFiles.includes(envFileName)) {
      envFileName = availableEnvFiles[0] || ".env.local";
    }

    // Scan Root Projects Directory
    const discoveredProjects: DiscoveredProject[] = [];
    if (fs.existsSync(scanRoot)) {
      try {
        const entries = fs.readdirSync(scanRoot, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
            const pPath = path.join(scanRoot, entry.name);
            const envCount = discoverEnvFiles(pPath).length;

            let isProt = false;
            const gPath = path.join(pPath, ".gitignore");
            if (fs.existsSync(gPath)) {
              const gContent = fs.readFileSync(gPath, "utf-8");
              isProt = gContent.includes(".env");
            }

            discoveredProjects.push({
              name: entry.name,
              fullPath: pPath,
              envFilesCount: envCount,
              isProtected: isProt,
            });
          }
        }
      } catch (err) {
        console.warn("[Nexus Env API] Root scan error:", err);
      }
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        isCloudEnvironment: true,
        discoveredProjects,
        projectPath: targetPath,
        availableEnvFiles: [".env.local", ".env"],
        selectedEnvFile: ".env.local",
        hasActiveFile: false,
        isProtectedByGitignore: true,
        variables: [],
        missingExampleKeys: [],
        stats: { total: 0, secrets: 0, urls: 0, missing: 0 },
        message: "Running in Cloud Mode (Vercel). Direct local disk inspection is disabled.",
      });
    }

    const activeFilePath = path.join(resolvedPath, envFileName);
    const hasActiveFile = fs.existsSync(activeFilePath);

    let variables: EnvVariableItem[] = [];
    if (hasActiveFile) {
      const content = fs.readFileSync(activeFilePath, "utf-8");
      variables = parseEnvContent(content);
    }

    // Audit missing keys against .env.example if present
    let missingExampleKeys: string[] = [];
    const examplePath = path.join(resolvedPath, ".env.example");
    if (fs.existsSync(examplePath)) {
      const exampleContent = fs.readFileSync(examplePath, "utf-8");
      const exampleVars = parseEnvContent(exampleContent);
      const activeKeysSet = new Set(variables.map((v) => v.key));
      missingExampleKeys = exampleVars.map((v) => v.key).filter((k) => !activeKeysSet.has(k));
    }

    // Check .gitignore safety shield
    let isProtectedByGitignore = false;
    const gitignorePath = path.join(resolvedPath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
      isProtectedByGitignore =
        gitignoreContent.includes(".env") ||
        gitignoreContent.includes(".env.local") ||
        gitignoreContent.includes(".env*");
    }

    const secretsCount = variables.filter((v) => v.isSecret).length;
    const urlsCount = variables.filter((v) => v.category === "URL").length;

    return NextResponse.json({
      isCloudEnvironment: false,
      discoveredProjects,
      projectPath: resolvedPath,
      availableEnvFiles,
      selectedEnvFile: envFileName,
      hasActiveFile,
      isProtectedByGitignore,
      variables,
      missingExampleKeys,
      stats: {
        total: variables.length,
        secrets: secretsCount,
        urls: urlsCount,
        missing: missingExampleKeys.length,
      },
    });
  } catch (error: any) {
    console.error("[Nexus Env Manager GET Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to load environment variables" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, projectPath, envFileName, variables, profileName, newKey, newValue } = body;

    const targetPath = projectPath || "c:\\coding\\projects\\devi";
    const selectedFile = envFileName || ".env.local";
    const resolvedPath = path.resolve(targetPath);

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({
        error: "Direct local file modification is disabled when running in Cloud Mode (Vercel). Manage environment variables via Vercel Project Settings or GitHub Actions Secrets.",
      }, { status: 400 });
    }

    const filePath = path.join(resolvedPath, selectedFile);

    // ACTION 1: SAVE UPDATED VARIABLES
    if (action === "save") {
      if (!Array.isArray(variables)) {
        return NextResponse.json({ error: "Invalid variables payload" }, { status: 400 });
      }

      // Auto Backup creation (.env.YYYY-MM-DD.bak)
      if (fs.existsSync(filePath)) {
        const dateStr = new Date().toISOString().split("T")[0];
        const backupPath = path.join(resolvedPath, `${selectedFile}.${dateStr}.bak`);
        fs.copyFileSync(filePath, backupPath);
      }

      const serialized = serializeEnvContent(variables);
      fs.writeFileSync(filePath, serialized, "utf-8");

      return NextResponse.json({ success: true, message: `Successfully saved ${selectedFile} and created backup.` });
    }

    // ACTION 2: ADD NEW KEY
    if (action === "add_key") {
      if (!newKey || !newKey.trim()) {
        return NextResponse.json({ error: "Key name is required." }, { status: 400 });
      }

      const cleanKey = newKey.trim().toUpperCase().replace(/\s+/g, "_");
      let currentVars: EnvVariableItem[] = [];

      if (fs.existsSync(filePath)) {
        currentVars = parseEnvContent(fs.readFileSync(filePath, "utf-8"));
      }

      // Check if key already exists
      const existingIdx = currentVars.findIndex((v) => v.key === cleanKey);
      const { category, isSecret } = categorizeKey(cleanKey);

      if (existingIdx !== -1) {
        currentVars[existingIdx].value = newValue || "";
      } else {
        currentVars.push({ key: cleanKey, value: newValue || "", category, isSecret });
      }

      const serialized = serializeEnvContent(currentVars);
      fs.writeFileSync(filePath, serialized, "utf-8");

      return NextResponse.json({ success: true, message: `Key ${cleanKey} added successfully.` });
    }

    // ACTION 3: SWITCH PROFILE (e.g. copy .env.production to .env.local)
    if (action === "switch_profile") {
      if (!profileName) {
        return NextResponse.json({ error: "Profile name is required." }, { status: 400 });
      }

      const sourceFile = path.join(resolvedPath, `.env.${profileName}`);
      if (!fs.existsSync(sourceFile)) {
        return NextResponse.json({ error: `Profile file .env.${profileName} does not exist.` }, { status: 404 });
      }

      // Backup current file
      if (fs.existsSync(filePath)) {
        const dateStr = new Date().toISOString().split("T")[0];
        fs.copyFileSync(filePath, path.join(resolvedPath, `${selectedFile}.${dateStr}.bak`));
      }

      fs.copyFileSync(sourceFile, filePath);
      return NextResponse.json({ success: true, message: `Active profile switched to .env.${profileName}.` });
    }

    // ACTION 4: PROTECT GITIGNORE
    if (action === "protect_gitignore") {
      const gitignorePath = path.join(resolvedPath, ".gitignore");
      let content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf-8") : "";

      if (!content.includes(".env")) {
        content += "\n\n# Nexus Safety Shield: Environment Files\n.env*\n.env.local\nenv\n";
        fs.writeFileSync(gitignorePath, content, "utf-8");
      }

      return NextResponse.json({ success: true, message: ".gitignore updated with .env protection rule." });
    }

    return NextResponse.json({ error: "Invalid action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("[Nexus Env Manager POST Error]:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
