import { EventEmitter } from "events";

export interface ConnectedAgent {
  userId: string;
  agentId: string;
  hostname: string;
  platform: string; // "win32" | "darwin" | "linux"
  allowedPaths: string[];
  connectedAt: string;
  lastPingTime: number;
  sendRPC: (method: string, params: any) => Promise<any>;
}

class AgentBridgeManager extends EventEmitter {
  private activeAgents: Map<string, ConnectedAgent> = new Map();

  /**
   * Register a newly connected Local Desktop Agent
   */
  public registerAgent(agent: ConnectedAgent): void {
    this.activeAgents.set(agent.userId, agent);
    this.emit("agentConnected", agent);
    console.log(`[Agent Bridge] Connected desktop agent for user: ${agent.userId} (${agent.hostname})`);
  }

  /**
   * Remove a disconnected agent
   */
  public unregisterAgent(userId: string): void {
    const existing = this.activeAgents.get(userId);
    if (existing) {
      this.activeAgents.delete(userId);
      this.emit("agentDisconnected", userId);
      console.log(`[Agent Bridge] Disconnected agent for user: ${userId}`);
    }
  }

  /**
   * Get active agent for a logged-in user
   */
  public getAgentForUser(userId: string): ConnectedAgent | null {
    let agent = this.activeAgents.get(userId);
    if (!agent) {
      // Fallback to dev_local_user or any active agent registered on this instance
      agent = this.activeAgents.get("dev_local_user") || Array.from(this.activeAgents.values())[0];
    }
    if (!agent) return null;

    // Heartbeat check: consider stale if no ping for 30s
    if (Date.now() - agent.lastPingTime > 30000) {
      this.unregisterAgent(agent.userId);
      return null;
    }
    return agent;
  }

  /**
   * Check if user has an active desktop agent online
   */
  public isAgentConnected(userId: string): boolean {
    return this.getAgentForUser(userId) !== null;
  }

  /**
   * Execute an RPC method on the user's connected desktop agent
   */
  public async executeRPC(userId: string, method: string, params: any = {}): Promise<any> {
    const agent = this.getAgentForUser(userId);
    if (!agent) {
      throw new Error("No connected Local PC Agent found for user. Please start Nexus Desktop Agent.");
    }
    return agent.sendRPC(method, params);
  }
}

// Global Singleton Instance
const globalForBridge = globalThis as unknown as {
  __nexus_agent_bridge?: AgentBridgeManager;
};

export const agentBridge = globalForBridge.__nexus_agent_bridge || new AgentBridgeManager();
if (process.env.NODE_ENV !== "production") {
  globalForBridge.__nexus_agent_bridge = agentBridge;
}
