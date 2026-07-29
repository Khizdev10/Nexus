import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getGitHubOAuthToken, clearRepoCache } from "@/lib/services/github/repositories";

export async function POST(request: Request) {
  try {
    const token = await getGitHubOAuthToken();
    if (!token) {
      return NextResponse.json({ error: "GitHub token not found. Please connect your GitHub account." }, { status: 401 });
    }

    const body = await request.json();
    const { repoName, isPrivate = true, localPath, description } = body;

    if (!repoName || !localPath) {
      return NextResponse.json({ error: "Missing required parameters: repoName and localPath" }, { status: 400 });
    }

    // 1. Create GitHub Repository via REST API
    const createRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Nexus-App",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        name: repoName,
        private: isPrivate,
        description: description || "Published via Nexus Git Engine",
        auto_init: false,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      let errMsg = `GitHub API Error (${createRes.status})`;
      try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.message || (errJson.errors && errJson.errors[0]?.message) || errMsg;
      } catch {}
      return NextResponse.json({ error: errMsg }, { status: createRes.status });
    }

    const repoData = await createRes.json();
    const cloneUrl = repoData.clone_url;
    const htmlUrl = repoData.html_url;

    // 2. Initialize Git & Push local project if directory exists
    if (fs.existsSync(localPath)) {
      const gitDir = path.join(localPath, ".git");
      if (!fs.existsSync(gitDir)) {
        execSync("git init", { cwd: localPath });
      }

      // Configure Remote
      try {
        execSync("git remote remove origin", { cwd: localPath });
      } catch {}

      execSync(`git remote add origin ${cloneUrl}`, { cwd: localPath });
      execSync("git branch -M main", { cwd: localPath });

      // Stage & Commit if changes exist
      try {
        execSync("git add .", { cwd: localPath });
        execSync('git commit -m "Initial commit from Nexus Git Engine"', { cwd: localPath });
      } catch {}

      // Push to GitHub
      try {
        execSync("git push -u origin main", { cwd: localPath });
      } catch (pushErr: any) {
        console.warn("Git push warning:", pushErr.message);
      }
    }

    // 3. Clear cache so new repo appears instantly
    clearRepoCache();

    return NextResponse.json({
      success: true,
      repoName: repoData.name,
      htmlUrl,
      cloneUrl,
      visibility: repoData.private ? "private" : "public",
    });
  } catch (error: any) {
    console.error("Error publishing repository:", error);
    return NextResponse.json({ error: error.message || "Failed to publish repository to GitHub" }, { status: 500 });
  }
}
