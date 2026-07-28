/**
 * Browser File System Access API Utility
 * Enables zero-terminal, native OS file access to c:\coding\projects\ hard drive.
 */

export interface BrowserEnvItem {
  key: string;
  value: string;
  category: "SECRET" | "URL" | "CONFIG";
  isSecret: boolean;
}

export interface BrowserDiscoveredProject {
  name: string;
  fullPath: string;
  branch: string;
  status: "synced" | "modified" | "ahead" | "behind";
  isProtected: boolean;
  envFiles: string[];
  dirHandle: FileSystemDirectoryHandle;
}

function categorizeKey(key: string): { category: BrowserEnvItem["category"]; isSecret: boolean } {
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

export function parseEnvContent(content: string): BrowserEnvItem[] {
  const lines = content.split("\n");
  const result: BrowserEnvItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    const { category, isSecret } = categorizeKey(key);
    result.push({ key, value, category, isSecret });
  }

  return result;
}

export function serializeEnvContent(variables: BrowserEnvItem[]): string {
  return variables
    .map((v) => {
      const needsQuotes = v.value.includes(" ") || v.value.includes("#") || v.value.includes("=");
      const formattedVal = needsQuotes ? `"${v.value}"` : v.value;
      return `${v.key}=${formattedVal}`;
    })
    .join("\n");
}

/**
 * Prompt user to select local workspace root directory (e.g. c:\coding\projects) and scan all project subdirectories
 */
export async function selectAndScanWorkspaceRoot(): Promise<{
  rootName: string;
  projects: BrowserDiscoveredProject[];
}> {
  if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
    throw new Error("Browser File System Access API is not supported in this browser. Please use Chrome or Edge.");
  }

  // @ts-ignore
  const rootHandle: FileSystemDirectoryHandle = await window.showDirectoryPicker({
    mode: "readwrite",
  });

  const projects: BrowserDiscoveredProject[] = [];

  // @ts-ignore
  for await (const [name, handle] of rootHandle.entries()) {
    if (handle.kind === "directory" && !name.startsWith(".") && name !== "node_modules") {
      const projDirHandle = handle as FileSystemDirectoryHandle;
      const envFiles: string[] = [];
      let isProtected = false;
      let branch = "main";

      // Scan files inside sub-folder
      // @ts-ignore
      for await (const [fileName, fileHandle] of projDirHandle.entries()) {
        if (fileHandle.kind === "file") {
          if (fileName === "env" || fileName === ".env" || fileName.startsWith(".env.")) {
            envFiles.push(fileName);
          }
          if (fileName === ".gitignore") {
            try {
              const gFile = await (fileHandle as FileSystemFileHandle).getFile();
              const gText = await gFile.text();
              if (gText.includes(".env")) isProtected = true;
            } catch {}
          }
        } else if (fileHandle.kind === "directory" && fileName === ".git") {
          // Read .git/HEAD to extract active branch
          try {
            const gitDirHandle = fileHandle as FileSystemDirectoryHandle;
            const headHandle = await gitDirHandle.getFileHandle("HEAD");
            const headFile = await headHandle.getFile();
            const headText = await headFile.text();
            if (headText.startsWith("ref: refs/heads/")) {
              branch = headText.replace("ref: refs/heads/", "").trim();
            }
          } catch {}
        }
      }

      projects.push({
        name,
        fullPath: `c:\\coding\\projects\\${name}`,
        branch,
        status: "synced",
        isProtected,
        envFiles: envFiles.sort(),
        dirHandle: projDirHandle,
      });
    }
  }

  return {
    rootName: rootHandle.name,
    projects: projects.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/**
 * Read .env file from project directory handle
 */
export async function readEnvFromProjectHandle(
  projDirHandle: FileSystemDirectoryHandle,
  envFileName: string
): Promise<BrowserEnvItem[]> {
  try {
    const fileHandle = await projDirHandle.getFileHandle(envFileName);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return parseEnvContent(text);
  } catch (err) {
    console.warn(`[Browser FS] File ${envFileName} not found or unreadable:`, err);
    return [];
  }
}

/**
 * Write updated .env file content back to PC hard drive
 */
export async function saveEnvToProjectHandle(
  projDirHandle: FileSystemDirectoryHandle,
  envFileName: string,
  variables: BrowserEnvItem[]
): Promise<void> {
  const serialized = serializeEnvContent(variables);
  const fileHandle = await projDirHandle.getFileHandle(envFileName, { create: true });
  // @ts-ignore
  const writable = await fileHandle.createWritable();
  await writable.write(serialized);
  await writable.close();
}
