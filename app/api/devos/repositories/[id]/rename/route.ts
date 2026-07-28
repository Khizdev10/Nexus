import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getGitHubOAuthToken, clearRepoCache } from "@/lib/services/github/repositories";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const repoId = params.id;
    const body = await req.json();

    const { repoName, ownerLogin, newRepoName, localPath, renameLocalFolder } = body;

    if (!newRepoName || !newRepoName.trim()) {
      return NextResponse.json(
        { error: "New repository name is required." },
        { status: 400 }
      );
    }

    const cleanNewName = newRepoName.trim().replace(/\s+/g, "-");

    const token = await getGitHubOAuthToken();
    if (!token) {
      return NextResponse.json(
        { error: "GitHub authentication required to rename repository." },
        { status: 401 }
      );
    }

    // Call GitHub REST API PATCH /repos/{owner}/{repo}
    const res = await fetch(`https://api.github.com/repos/${ownerLogin}/${repoName}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Nexus-App",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: cleanNewName,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      let message = errData.message || "Failed to rename repository on GitHub";

      if (res.status === 403) {
        message = "Permission denied. Ensure you have admin permissions on this repository.";
      } else if (res.status === 422) {
        message = "Repository name already exists or contains invalid characters.";
      }

      return NextResponse.json({ error: message }, { status: res.status });
    }

    // Optionally rename local folder on PC if requested and exists
    if (renameLocalFolder && localPath && fs.existsSync(localPath)) {
      try {
        const parentDir = path.dirname(localPath);
        const newLocalPath = path.join(parentDir, cleanNewName);

        if (!fs.existsSync(newLocalPath)) {
          fs.renameSync(localPath, newLocalPath);
        }
      } catch (fsErr) {
        console.warn("[Nexus Rename API] Could not rename local folder:", fsErr);
      }
    }

    // Invalidate memory cache so dashboard refreshes immediately
    clearRepoCache();

    return NextResponse.json({
      success: true,
      message: `Repository successfully renamed to ${cleanNewName}`,
      newName: cleanNewName,
    });
  } catch (error: any) {
    console.error("[Nexus Rename API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error renaming repository" },
      { status: 500 }
    );
  }
}
