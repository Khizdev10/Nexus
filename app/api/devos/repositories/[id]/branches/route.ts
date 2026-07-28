import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import { clearStatusCache } from "@/lib/services/git/status";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { action, branchName, localPath } = body; // action: "checkout" | "create"

    if (!localPath || !fs.existsSync(localPath)) {
      return NextResponse.json({ error: "Local path not found" }, { status: 400 });
    }

    if (!branchName) {
      return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
    }

    if (action === "create") {
      execSync(`git checkout -b "${branchName.replace(/"/g, "")}"`, { cwd: localPath, encoding: "utf-8" });
      clearStatusCache(localPath);
      return NextResponse.json({
        success: true,
        message: `Created and checked out new branch '${branchName}'`,
      });
    }

    if (action === "checkout") {
      const cleanBranch = branchName.replace(/^origin\//, "");
      execSync(`git checkout "${cleanBranch.replace(/"/g, "")}"`, { cwd: localPath, encoding: "utf-8" });
      clearStatusCache(localPath);
      return NextResponse.json({
        success: true,
        message: `Switched to branch '${cleanBranch}'`,
      });
    }

    return NextResponse.json({ error: "Invalid branch action" }, { status: 400 });
  } catch (error: any) {
    console.error("Branch action error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute branch action" },
      { status: 500 }
    );
  }
}
