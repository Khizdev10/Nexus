import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { agentBridge } from "@/lib/services/agent-bridge/agent-manager";

// Pair tokens in-memory cache (TTL: 10 minutes)
const pairTokensMap = new Map<string, { userId: string; expiresAt: number }>();

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agent = agentBridge.getAgentForUser(userId);
    const isConnected = !!agent;

    // Generate fresh auto-pairing token for 1-click deep link
    const pairToken = `NEXUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    pairTokensMap.set(pairToken, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    });

    const host = request.headers.get("host") || "nexus-app.com";
    const protocol = host.includes("localhost") ? "http" : "https";
    const serverUrl = `${protocol}://${host}`;
    const deepLinkUrl = `nexus://connect?token=${pairToken}&server=${encodeURIComponent(serverUrl)}`;

    return NextResponse.json({
      isConnected,
      agent: agent
        ? {
            hostname: agent.hostname,
            platform: agent.platform,
            allowedPaths: agent.allowedPaths,
            connectedAt: agent.connectedAt,
          }
        : null,
      pairToken,
      deepLinkUrl,
      downloadUrls: {
        win32: `${serverUrl}/api/agent/installer?platform=win32&token=${pairToken}`,
        darwin: `${serverUrl}/api/agent/installer?platform=darwin&token=${pairToken}`,
        linux: `${serverUrl}/api/agent/installer?platform=linux&token=${pairToken}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to inspect agent status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, hostname, platform, allowedPaths } = body;

    const { userId: currentUserId } = await auth();
    let targetUserId = currentUserId;

    if (token) {
      const tokenUserId = validatePairToken(token);
      if (tokenUserId) targetUserId = tokenUserId;
    }

    if (!targetUserId) {
      // Fallback dev mode user id
      targetUserId = "dev_local_user";
    }

    agentBridge.registerAgent({
      userId: targetUserId,
      agentId: `agent_${Math.random().toString(36).substring(2, 8)}`,
      hostname: hostname || "Local-PC",
      platform: platform || "win32",
      allowedPaths: allowedPaths || ["c:\\coding\\projects"],
      connectedAt: new Date().toISOString(),
      lastPingTime: Date.now(),
      sendRPC: async (method: string, params: any) => {
        return { success: true };
      },
    });

    return NextResponse.json({ success: true, message: "Nexus Local Desktop Agent connected & registered successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to register agent" }, { status: 500 });
  }
}

/**
 * Validate a pairToken when the desktop agent performs initial handshake
 */
export function validatePairToken(token: string): string | null {
  const data = pairTokensMap.get(token);
  if (!data) return null;
  if (Date.now() > data.expiresAt) {
    pairTokensMap.delete(token);
    return null;
  }
  return data.userId;
}
