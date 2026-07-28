import { NextResponse } from "next/server";
import fs from "fs";
import { getGitHubOAuthToken, clearRepoCache } from "@/lib/services/github/repositories";
import { clearStatusCache } from "@/lib/services/git/status";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { repoName, ownerLogin, typedConfirmation, localPath, deleteLocalFolder } = body;

    if (!repoName || !typedConfirmation) {
      return NextResponse.json({ error: "Repository name and confirmation are required" }, { status: 400 });
    }

    // Verify typed repository name matches exact repository name (GitHub Danger Zone requirement)
    if (typedConfirmation.trim() !== repoName.trim()) {
      return NextResponse.json(
        { error: `Confirmation mismatch. You typed '${typedConfirmation}', but exact name is '${repoName}'` },
        { status: 400 }
      );
    }

    const token = await getGitHubOAuthToken();
    if (!token) {
      return NextResponse.json({ error: "GitHub OAuth token not found. Please sign in." }, { status: 401 });
    }

    const owner = ownerLogin || "owner";

    // 1. DELETE REMOTE GITHUB REPOSITORY via GitHub REST API
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "DevOS-App",
      },
    });

    if (!ghRes.ok && ghRes.status !== 404) {
      const errorData = await ghRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || `GitHub API returned status ${ghRes.status} when deleting repository` },
        { status: ghRes.status }
      );
    }

    // 2. OPTIONALLY DELETE LOCAL HARD DRIVE DIRECTORY
    if (deleteLocalFolder && localPath && fs.existsSync(localPath)) {
      try {
        fs.rmSync(localPath, { recursive: true, force: true });
      } catch (localErr) {
        console.error("Error deleting local project directory:", localErr);
      }
    }

    // 3. CLEAR MEMORY CACHES IMMEDIATELY
    clearStatusCache(localPath);
    clearRepoCache();

    return NextResponse.json({
      success: true,
      message: `Repository '${owner}/${repoName}' was permanently deleted.`,
    });
  } catch (error: any) {
    console.error("Delete repository error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete repository" },
      { status: 500 }
    );
  }
}
