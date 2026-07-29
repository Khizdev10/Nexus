import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { agentBridge } from "@/lib/services/agent-bridge/agent-manager";

// Global persistent token cache (survives Next.js Dev HMR reloads)
const globalForTokens = globalThis as unknown as {
  __nexus_pair_tokens_map?: Map<string, { userId: string; permanent: boolean; lastSeen: number }>;
};

if (!globalForTokens.__nexus_pair_tokens_map) {
  globalForTokens.__nexus_pair_tokens_map = new Map();
}
const pairTokensMap = globalForTokens.__nexus_pair_tokens_map;

export async function GET(request: Request) {
  try {
    const { userId: clerkUserId } = await auth();
    const userId = clerkUserId || "dev_local_user";

    const agent = agentBridge.getAgentForUser(userId);
    const isConnected = !!agent;

    // Find existing token for this user or create a persistent one
    let pairToken = "";
    for (const [t, data] of pairTokensMap.entries()) {
      if (data.userId === userId) {
        pairToken = t;
        break;
      }
    }

    if (!pairToken) {
      pairToken = `NEXUS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      pairTokensMap.set(pairToken, {
        userId,
        permanent: true,
        lastSeen: Date.now(),
      });
    }

    const host = request.headers.get("host") || "localhost:3000";
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
    let targetUserId = currentUserId || "dev_local_user";

    if (token) {
      const tokenUserId = validatePairToken(token);
      if (tokenUserId) targetUserId = tokenUserId;
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
 * Validate a pairToken when the desktop agent performs initial handshake or heartbeat
 */
export function validatePairToken(token: string): string | null {
  let data = pairTokensMap.get(token);
  if (!data) {
    // Auto-bind incoming token to active session if user token exists
    const activeData = Array.from(pairTokensMap.values())[0];
    if (activeData) {
      pairTokensMap.set(token, { userId: activeData.userId, permanent: true, lastSeen: Date.now() });
      return activeData.userId;
    }
    return null;
  }

  // Touch lastSeen timestamp to keep session alive indefinitely
  data.lastSeen = Date.now();
  return data.userId;
}
