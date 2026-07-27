import { NextResponse } from "next/server";
import { executeGitAction } from "@/lib/services/git/operations";
import { getGitHubOAuthToken } from "@/lib/services/github/repositories";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const { action, commitMessage, localPath } = body;

    if (!action) {
      return NextResponse.json({ error: "Git action is required" }, { status: 400 });
    }

    const token = await getGitHubOAuthToken();
    const targetPath = localPath || `c:\\coding\\projects\\${params.id}`;
    const result = executeGitAction(targetPath, action, commitMessage, token);

    if (!result.success) {
      return NextResponse.json({ error: result.message, output: result.output }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      output: result.output,
    });
  } catch (error: any) {
    console.error("Git action API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute Git action" },
      { status: 500 }
    );
  }
}
