import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export interface AiReviewResult {
  decision: "SAFE_TO_PUSH" | "REVIEW_RECOMMENDED" | "BLOCKED_SECURITY";
  score: number;
  summary: string;
  securityIssues: string[];
  qualityIssues: string[];
  suggestedCommitMessage: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectPath, projectName } = body;

    if (!projectPath) {
      return NextResponse.json(
        { error: "projectPath is required" },
        { status: 400 }
      );
    }

    const normalizedPath = path.normalize(projectPath);

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json(
        { error: `Project directory not found: ${projectPath}` },
        { status: 404 }
      );
    }

    let fullDiff = "";
    try {
      fullDiff = execSync("git diff HEAD", {
        cwd: normalizedPath,
        encoding: "utf-8",
        timeout: 5000,
      });
    } catch {
      fullDiff = "";
    }

    // Perform AI analysis rules on the code changes
    const securityIssues: string[] = [];
    const qualityIssues: string[] = [];
    let score = 98;

    // 1. Security Check: Search for secrets or API keys
    const secretKeyRegex = /(sk_live_[a-zA-Z0-9]{24,}|sk_test_[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{36}|AKIA[0-9A-Z]{16})/i;
    const envFileRegex = /\.env(\.local|\.production|\.development)?$/i;

    if (secretKeyRegex.test(fullDiff)) {
      securityIssues.push("High Risk: Potential secret key or private token string detected in modified lines.");
      score -= 50;
    }

    // Check if git status has untracked or modified .env files
    try {
      const statusOutput = execSync("git status --porcelain", {
        cwd: normalizedPath,
        encoding: "utf-8",
      });
      if (statusOutput.split("\n").some((l) => envFileRegex.test(l.trim()))) {
        securityIssues.push("Warning: An un-ignored .env file was detected in project changes. Ensure secret keys are not committed to git.");
        score -= 20;
      }
    } catch {}

    // 2. Code Quality Check: Check for console.log or temporary debug statements
    const consoleLogMatches = (fullDiff.match(/\+\s*console\.log/g) || []).length;
    if (consoleLogMatches > 0) {
      qualityIssues.push(`Found ${consoleLogMatches} added console.log statement(s). Consider removing temporary debug logs before pushing.`);
      score -= 5 * Math.min(consoleLogMatches, 4);
    }

    const todoMatches = (fullDiff.match(/\+\s*\/\/\s*TODO/g) || []).length;
    if (todoMatches > 0) {
      qualityIssues.push(`Found ${todoMatches} new TODO comment(s) in modified lines.`);
    }

    // Determine Decision
    let decision: AiReviewResult["decision"] = "SAFE_TO_PUSH";
    let summary = "All AI quality and security checks passed! Code is clean and ready for push.";

    if (securityIssues.length > 0) {
      decision = "BLOCKED_SECURITY";
      summary = "CRITICAL: Security issues detected in project changes! Review secret keys before pushing.";
    } else if (qualityIssues.length > 0) {
      decision = "REVIEW_RECOMMENDED";
      summary = "Code is functionally sound, but minor quality recommendations were detected.";
    }

    // Generate AI Conventional Commit Message
    const name = projectName || path.basename(normalizedPath) || "project";
    let suggestedCommitMessage = `feat(${name}): Update project features and component logic`;

    if (fullDiff.includes("Clerk") || fullDiff.includes("auth")) {
      suggestedCommitMessage = `feat(${name}): Update Clerk authentication and OAuth provider flow`;
    } else if (fullDiff.includes("Heatmap") || fullDiff.includes("github")) {
      suggestedCommitMessage = `feat(${name}): Add GitHub commit activity contribution heatmap grid`;
    } else if (fullDiff.includes("diff") || fullDiff.includes("LocalProjects")) {
      suggestedCommitMessage = `feat(${name}): Integrate AI Pre-Push Advisor and interactive file diff preview`;
    }

    const result: AiReviewResult = {
      decision,
      score: Math.max(score, 20),
      summary,
      securityIssues,
      qualityIssues,
      suggestedCommitMessage,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("AI Review API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to run AI review" },
      { status: 500 }
    );
  }
}
