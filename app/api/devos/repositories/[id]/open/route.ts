import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const { target, localPath } = body;

    const projectPath = path.normalize(localPath || `c:\\coding\\projects\\${params.id}`);

    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        { error: `Directory not found: ${projectPath}` },
        { status: 404 }
      );
    }

    if (target === "explorer") {
      exec(`explorer "${projectPath}"`);
      return NextResponse.json({
        success: true,
        message: `Opened ${projectPath} in File Explorer`,
      });
    }

    if (target === "vscode") {
      exec(`code "${projectPath}"`);
      return NextResponse.json({
        success: true,
        message: `Opened ${projectPath} in Visual Studio Code`,
      });
    }

    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  } catch (error: any) {
    console.error("Open tool API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to launch application" },
      { status: 500 }
    );
  }
}
