"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Folder,
  FileCode,
  Lock,
  Sliders,
  HardDrive,
  Search,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Globe,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { EnvVariableItem, DiscoveredProject } from "@/app/api/env-manager/route";
import {
  selectAndScanWorkspaceRoot,
  readEnvFromProjectHandle,
  saveEnvToProjectHandle,
  BrowserDiscoveredProject,
  BrowserEnvItem,
} from "@/lib/services/browser-fs/workspace-scanner";

interface EnvManagerWorkspaceProps {
  initialProjectPath?: string;
}

export default function EnvManagerWorkspace({
  initialProjectPath = "c:\\coding\\projects\\devi",
}: EnvManagerWorkspaceProps) {
  const [scanRoot, setScanRoot] = useState<string>("c:\\coding\\projects");
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([]);
  const [selectedProjectPath, setSelectedProjectPath] = useState<string>(initialProjectPath);
  const [selectedFile, setSelectedFile] = useState<string>(".env.local");
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [variables, setVariables] = useState<EnvVariableItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [missingExampleKeys, setMissingExampleKeys] = useState<string[]>([]);
  const [isProtectedByGitignore, setIsProtectedByGitignore] = useState<boolean>(false);
  const [isCloudMode, setIsCloudMode] = useState<boolean>(false);

  // Native Browser File Access API State
  const [browserProjects, setBrowserProjects] = useState<BrowserDiscoveredProject[]>([]);
  const [selectedBrowserProj, setSelectedBrowserProj] = useState<BrowserDiscoveredProject | null>(null);
  const [isBrowserConnected, setIsBrowserConnected] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Masking & Copy States
  const [unmaskedKeys, setUnmaskedKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCopiedAll, setIsCopiedAll] = useState<boolean>(false);

  // Add Key Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");

  const fetchEnvData = useCallback(async (pathStr: string, fileName: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/env-manager?projectPath=${encodeURIComponent(pathStr)}&envFileName=${encodeURIComponent(fileName)}&scanRoot=${encodeURIComponent(scanRoot)}`
      );
      const data = await res.json();

      setIsCloudMode(!!data.isCloudEnvironment);
      setDiscoveredProjects(data.discoveredProjects || []);
      setAvailableFiles(data.availableEnvFiles || [".env.local", ".env"]);
      setVariables(data.variables || []);
      setMissingExampleKeys(data.missingExampleKeys || []);
      setIsProtectedByGitignore(data.isProtectedByGitignore || false);

      if (data.selectedEnvFile && data.selectedEnvFile !== selectedFile) {
        setSelectedFile(data.selectedEnvFile);
      }
    } catch (err: any) {
      setError(err.message || "Error inspecting environment files");
    } finally {
      setLoading(false);
    }
  }, [scanRoot, selectedFile]);

  useEffect(() => {
    if (!isBrowserConnected) {
      fetchEnvData(selectedProjectPath, selectedFile);
    }
  }, [selectedProjectPath, selectedFile, fetchEnvData, isBrowserConnected]);

  // Handler for Native Browser Workspace Root Folder Picker (c:\coding\projects)
  const handleSelectBrowserWorkspaceRoot = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await selectAndScanWorkspaceRoot();
      if (result.projects.length > 0) {
        setBrowserProjects(result.projects);
        const firstProj = result.projects[0];
        setSelectedBrowserProj(firstProj);
        setIsBrowserConnected(true);

        const firstEnvFile = firstProj.envFiles[0] || ".env.local";
        setAvailableFiles(firstProj.envFiles.length > 0 ? firstProj.envFiles : [".env.local", ".env"]);
        setSelectedFile(firstEnvFile);

        const vars = await readEnvFromProjectHandle(firstProj.dirHandle, firstEnvFile);
        setVariables(vars);
        setIsProtectedByGitignore(firstProj.isProtected);
        setSuccessMessage(`Successfully connected to PC Workspace: ${result.rootName} (${result.projects.length} projects discovered)!`);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        setError("No project subdirectories found in selected workspace folder.");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to open local workspace folder.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for selecting a project in browser mode
  const handleBrowserProjectChange = async (projName: string) => {
    const proj = browserProjects.find((p) => p.name === projName);
    if (!proj) return;

    setSelectedBrowserProj(proj);
    const activeEnvFile = proj.envFiles[0] || ".env.local";
    setAvailableFiles(proj.envFiles.length > 0 ? proj.envFiles : [".env.local", ".env"]);
    setSelectedFile(activeEnvFile);

    setLoading(true);
    const vars = await readEnvFromProjectHandle(proj.dirHandle, activeEnvFile);
    setVariables(vars);
    setIsProtectedByGitignore(proj.isProtected);
    setLoading(false);
  };

  // Handler for switching file tab in browser mode
  const handleBrowserFileTabChange = async (fileName: string) => {
    if (!selectedBrowserProj) return;
    setSelectedFile(fileName);
    setLoading(true);
    const vars = await readEnvFromProjectHandle(selectedBrowserProj.dirHandle, fileName);
    setVariables(vars);
    setLoading(false);
  };

  const toggleMask = (key: string) => {
    setUnmaskedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleValueChange = (index: number, val: string) => {
    const updated = [...variables];
    updated[index].value = val;
    setVariables(updated);
  };

  const handleDeleteKey = (keyToDelete: string) => {
    setVariables((prev) => prev.filter((v) => v.key !== keyToDelete));
  };

  const handleCopyValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAllDetails = () => {
    const serialized = variables
      .map((v) => `${v.key}=${v.value}`)
      .join("\n");
    
    navigator.clipboard.writeText(serialized);
    setIsCopiedAll(true);
    setTimeout(() => setIsCopiedAll(false), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // If using Native Browser File System Access API
    if (isBrowserConnected && selectedBrowserProj) {
      try {
        await saveEnvToProjectHandle(selectedBrowserProj.dirHandle, selectedFile, variables);
        setSuccessMessage(`Saved ${selectedFile} directly to local PC hard drive!`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (err: any) {
        setError(err.message || "Failed to save file to local PC hard drive.");
      } finally {
        setSaving(false);
      }
      return;
    }

    // Default Node.js API save
    try {
      const res = await fetch("/api/env-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          projectPath: selectedProjectPath,
          envFileName: selectedFile,
          variables,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save environment variables");

      setSuccessMessage(data.message || "Environment variables saved successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchEnvData(selectedProjectPath, selectedFile);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    const cleanKey = newKey.trim().toUpperCase().replace(/\s+/g, "_");
    const isSecret =
      cleanKey.includes("SECRET") ||
      cleanKey.includes("KEY") ||
      cleanKey.includes("TOKEN") ||
      cleanKey.includes("PASSWORD") ||
      cleanKey.includes("AUTH") ||
      cleanKey.includes("PRIVATE");

    const category: EnvVariableItem["category"] = cleanKey.includes("URL") || cleanKey.includes("URI")
      ? "URL"
      : isSecret
      ? "SECRET"
      : "CONFIG";

    const newItem: EnvVariableItem = {
      key: cleanKey,
      value: newValue.trim(),
      category,
      isSecret,
    };

    const updatedVars = [...variables, newItem];
    setVariables(updatedVars);

    if (isBrowserConnected && selectedBrowserProj) {
      await saveEnvToProjectHandle(selectedBrowserProj.dirHandle, selectedFile, updatedVars);
    }

    setNewKey("");
    setNewValue("");
    setIsAddModalOpen(false);
    setSuccessMessage(`Key ${cleanKey} added.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const filteredVariables = variables.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return v.key.toLowerCase().includes(q) || v.value.toLowerCase().includes(q);
  });

  const secretsCount = variables.filter((v) => v.isSecret).length;
  const currentProjectName = isBrowserConnected && selectedBrowserProj
    ? selectedBrowserProj.name
    : selectedProjectPath.split("\\").pop() || "project";

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Banner with Primary Actions Aligned */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Nexus Workspace Subsystem • Environment Manager
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <KeyRound className="w-8 h-8 text-indigo-400" />
            Environment Manager
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Centralized environment credentials inspector, secret masking, profile swapper, and .gitignore safety shield.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* NATIVE PC WORKSPACE DIRECTORY PICKER BUTTON */}
          <button
            onClick={handleSelectBrowserWorkspaceRoot}
            className="rounded-xl border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Select Workspace Root Folder</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl border border-indigo-500/40 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Variable</span>
          </button>

          <button
            onClick={handleCopyAllDetails}
            disabled={variables.length === 0}
            className="rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 px-4 py-2.5 text-xs font-bold text-zinc-200 transition-all flex items-center gap-2 shadow-sm"
          >
            {isCopiedAll ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">All Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copy All Details</span>
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={saving || variables.length === 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save .env Changes</span>
          </button>
        </div>
      </div>

      {/* BROWSER CONNECTED HARD DRIVE STATUS BANNER */}
      {isBrowserConnected && selectedBrowserProj && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-2 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-200 flex items-center gap-2">
                <span>LOCAL PC HARD DRIVE CONNECTED</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-xs text-emerald-300/80 font-mono mt-0.5">
                Active Local PC Project: <strong className="text-white">{selectedBrowserProj.name}</strong> • Branch: <strong className="text-indigo-300">{selectedBrowserProj.branch}</strong>
              </p>
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {browserProjects.length} PC Projects Discovered
          </span>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Variables */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Variables</span>
            <FileCode className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{variables.length}</div>
          <div className="text-xs text-indigo-400 font-semibold font-mono">
            {currentProjectName} / {selectedFile}
          </div>
        </div>

        {/* Card 2: Secret Keys */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">Secret Credentials</span>
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-400">{secretsCount}</div>
          <div className="text-xs text-purple-300 font-semibold">
            Auto-Masked by Security Shield
          </div>
        </div>

        {/* Card 3: GitIgnore Protection Shield */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">GitIgnore Protection</span>
            {isProtectedByGitignore ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="text-2xl font-extrabold flex items-center gap-2">
            {isProtectedByGitignore ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 inline" /> PROTECTED
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 inline" /> EXPOSED
              </span>
            )}
          </div>
          <div className="text-xs text-emerald-400 font-semibold">Excluded from Public Git Push</div>
        </div>

        {/* Card 4: Missing Example Keys */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-3 shadow-xl">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-bold uppercase tracking-wider">.env.example Auditor</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{missingExampleKeys.length}</div>
          <div className="text-xs text-zinc-400 font-mono">
            {missingExampleKeys.length > 0 ? "Missing keys from schema" : "100% Synced with schema"}
          </div>
        </div>
      </div>

      {/* TOAST MESSAGES */}
      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MAIN CONTROLS BAR: SLEEK PROJECT DROPDOWN, FILE TABS, SEARCH BAR */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          {/* SLEEK PROJECT SELECTOR DROPDOWN */}
          <div className="space-y-1.5 w-full lg:w-96">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-indigo-400" />
              Select Workspace Project
            </label>

            <div className="relative">
              {isBrowserConnected ? (
                <select
                  value={selectedBrowserProj?.name || ""}
                  onChange={(e) => handleBrowserProjectChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-emerald-500/50 bg-zinc-950 px-4 py-3 text-sm font-bold text-white focus:border-emerald-500 focus:outline-none pr-10 shadow-sm font-mono cursor-pointer"
                >
                  {browserProjects.map((p) => (
                    <option key={p.name} value={p.name}>
                      📁 {p.name} — {p.envFiles.length} env files ({p.branch})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={selectedProjectPath}
                  onChange={(e) => setSelectedProjectPath(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm font-bold text-white focus:border-indigo-500 focus:outline-none pr-10 shadow-sm font-mono cursor-pointer"
                >
                  {discoveredProjects.length > 0 ? (
                    discoveredProjects.map((p) => (
                      <option key={p.fullPath} value={p.fullPath}>
                        📁 {p.name} — {p.envFilesCount} env files ({p.isProtected ? "Protected" : "Exposed"})
                      </option>
                    ))
                  ) : (
                    <option value={initialProjectPath}>📁 {currentProjectName} (Local Project)</option>
                  )}
                </select>
              )}
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Quick Root Picker Button */}
          {!isBrowserConnected && (
            <button
              onClick={handleSelectBrowserWorkspaceRoot}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 transition-all flex items-center gap-2"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Connect PC Workspace Folder (c:\coding\projects)</span>
            </button>
          )}
        </div>

        {/* Environment File Selector Tabs & Variable Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {availableFiles.map((file) => (
              <button
                key={file}
                onClick={() => {
                  if (isBrowserConnected) {
                    handleBrowserFileTabChange(file);
                  } else {
                    setSelectedFile(file);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all shrink-0 ${
                  selectedFile === file
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                }`}
              >
                {file}
              </button>
            ))}
          </div>

          {/* Variable Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter variables by key..."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* MAIN KEY-VALUE TABLE EDITOR WITH HEADERS */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              Environment Variables ({filteredVariables.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Showing variables for <code className="font-mono text-indigo-300">{selectedFile}</code> in <code className="font-mono text-white">{currentProjectName}</code>
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-sm font-mono animate-pulse border border-dashed border-zinc-800 rounded-2xl">
            Loading environment file data...
          </div>
        ) : filteredVariables.length > 0 ? (
          <div className="space-y-3">
            {/* Table Column Headers */}
            <div className="hidden md:flex items-center justify-between px-4 text-[11px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
              <span className="w-64">Variable Key Name</span>
              <span className="flex-1 px-4">Value</span>
              <span className="w-28 text-right">Actions</span>
            </div>

            {filteredVariables.map((item, idx) => {
              const isUnmasked = unmaskedKeys[item.key] || false;

              return (
                <div
                  key={item.key}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/90 hover:border-zinc-700 transition-all gap-4 group"
                >
                  {/* Left: Key & Badge */}
                  <div className="w-full md:w-64 shrink-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-zinc-100 truncate">{item.key}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                          item.category === "SECRET"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : item.category === "URL"
                            ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Value Input & Controls */}
                  <div className="flex-1 flex items-center gap-2 w-full">
                    <div className="relative flex-1">
                      <input
                        type={item.isSecret && !isUnmasked ? "password" : "text"}
                        value={item.value}
                        onChange={(e) => handleValueChange(idx, e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs font-mono text-indigo-300 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Mask / Unmask Toggle Button */}
                    {item.isSecret && (
                      <button
                        onClick={() => toggleMask(item.key)}
                        className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors shrink-0"
                        title={isUnmasked ? "Mask Secret Value" : "Reveal Secret Value"}
                      >
                        {isUnmasked ? <EyeOff className="w-4 h-4 text-purple-400" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyValue(item.key, item.value)}
                      className="p-2 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white transition-colors shrink-0"
                      title="Copy Value"
                    >
                      {copiedKey === item.key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Delete Key Button */}
                    <button
                      onClick={() => handleDeleteKey(item.key)}
                      className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white transition-colors shrink-0"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-zinc-500 text-sm font-mono border border-dashed border-zinc-800 rounded-2xl space-y-2">
            <KeyRound className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <div className="font-bold text-zinc-300">No Environment Variables Found</div>
            <p className="text-xs text-zinc-500">File {selectedFile} is empty or missing. Click Add Variable above to populate.</p>
          </div>
        )}
      </div>

      {/* ADD VARIABLE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-zinc-950 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Add Environment Variable</h3>
                  <p className="text-xs font-mono text-indigo-400 mt-0.5">Target: {selectedFile}</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Variable Key Name</label>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. NEXT_PUBLIC_API_URL"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">Variable Value</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. https://api.myapp.com"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 flex items-center gap-2"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>Add Variable</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
