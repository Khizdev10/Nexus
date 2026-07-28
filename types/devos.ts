/**
 * DevOS Domain Contracts & Data Models
 * Phase 1: GitHub Integration & Git Engine (Source Control Module)
 */

export interface DevOSUser {
  id: string;
  githubId: string;
  username: string;
  name: string;
  avatarUrl: string;
  email: string;
}

export interface DevOSRepository {
  id: string;
  githubId: number;
  name: string;
  ownerLogin: string;
  role: "owner" | "collaborator" | "organization_member";
  description: string | null;
  language: string | null;
  visibility: "public" | "private";
  defaultBranch: string;
  cloneUrl: string;
  sshUrl: string;
  lastPush: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  localPath?: string;

  // Real-time Git & Sync Status
  currentBranch: string;
  aheadCount: number;
  behindCount: number;
  uncommittedCount: number;
  status: "synced" | "modified" | "ahead" | "behind" | "untracked";
  openIssuesCount: number;
  openPullRequestsCount: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
  lastCommitSha?: string;
}

export interface DevOSCommitFileChange {
  filename: string;
  status: "modified" | "added" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface DevOSCommit {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorAvatarUrl: string;
  date: string;
  relativeTime: string;
  htmlUrl: string;
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
  files?: DevOSCommitFileChange[];
  aiSummary?: string;
}

export interface DevOSGitStatus {
  branch: string;
  ahead: number;
  behind: number;
  stagedFiles: string[];
  modifiedFiles: string[];
  untrackedFiles: string[];
  deletedFiles: string[];
  isClean: boolean;
}

export interface DevOSOverallStats {
  totalRepos: number;
  syncedRepos: number;
  modifiedRepos: number;
  aheadRepos: number;
  behindRepos: number;
  openIssues: number;
  pullRequests: number;
  lastSyncTime: string;
}
