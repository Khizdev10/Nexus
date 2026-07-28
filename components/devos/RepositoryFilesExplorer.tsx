"use client";

import React, { useState, useEffect } from "react";
import {
  Folder,
  FileCode,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  FolderTree,
  FileText,
  ArrowLeft,
  CornerUpLeft,
  History,
  RotateCcw,
  GitCommit,
  Clock,
  Sparkles,
} from "lucide-react";
import { FileTreeEntry } from "@/app/api/devos/repositories/[id]/files/route";
import { DevOSCommit } from "@/types/devos";

interface RepositoryFilesExplorerProps {
  repoId: string;
  repoName: string;
  localPath: string;
  commits?: DevOSCommit[];
}

export default function RepositoryFilesExplorer({
  repoId,
  repoName,
  localPath,
  commits = [],
}: RepositoryFilesExplorerProps) {
  const [currentDir, setCurrentDir] = useState("");
  const [entries, setEntries] = useState<FileTreeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Commit Checkpoint State ("HEAD" or commit SHA)
  const [selectedRef, setSelectedRef] = useState<string>("HEAD");

  // Active File Viewer State
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ linesCount: number; sizeBytes: number; extension: string } | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Directory Contents
  const fetchDirectory = async (dirPath: string, refToUse = selectedRef) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/devos/repositories/${repoId}/files?localPath=${encodeURIComponent(localPath)}&path=${encodeURIComponent(dirPath)}&ref=${encodeURIComponent(refToUse)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setCurrentDir(dirPath);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  // Fetch File Content
  const fetchFileContent = async (filePath: string, refToUse = selectedRef) => {
    setFileLoading(true);
    setSelectedFile(filePath);
    try {
      const res = await fetch(
        `/api/devos/repositories/${repoId}/files?localPath=${encodeURIComponent(localPath)}&path=${encodeURIComponent(filePath)}&ref=${encodeURIComponent(refToUse)}`
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
        setFileMeta({
          linesCount: data.linesCount || 0,
          sizeBytes: data.sizeBytes || 0,
          extension: data.extension || "txt",
        });
      }
    } catch {
      setFileContent("Failed to load file content.");
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory("", selectedRef);
  }, [repoId, localPath, selectedRef]);

  // Handle Commit Checkpoint Change
  const handleRefChange = (newRef: string) => {
    setSelectedRef(newRef);
    setSelectedFile(null);
    setFileContent(null);
    fetchDirectory("", newRef);
  };

  const handleCopyCode = () => {
    if (!fileContent) return;
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Step 1 Folder Back
  const handleNavigateUp = () => {
    if (!currentDir) return;
    const parts = currentDir.split("/").filter(Boolean);
    parts.pop();
    setSelectedFile(null);
    fetchDirectory(parts.join("/"), selectedRef);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const activeCommitObj = commits.find((c) => c.sha === selectedRef || c.shortSha === selectedRef);

  return (
    <div className="space-y-4">
      {/* COMMIT TREE CHECKPOINT SELECTOR BAR */}
      <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span>Commit Tree Checkpoint</span>
              {selectedRef !== "HEAD" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  HISTORICAL CHECKPOINT
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select any commit from history to fall back and view the files as they existed at that exact checkpoint.
            </p>
          </div>
        </div>

        {/* Commit Tree Checkpoint Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedRef}
            onChange={(e) => handleRefChange(e.target.value)}
            className="w-full sm:w-80 rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-mono text-white focus:border-indigo-500 focus:outline-none shadow-inner"
          >
            <option value="HEAD">⚡ HEAD (Current Working Tree / Latest State)</option>
            {commits.map((c) => (
              <option key={c.sha} value={c.sha}>
                📜 {c.shortSha} - {c.message.substring(0, 40)} ({c.relativeTime})
              </option>
            ))}
          </select>

          {selectedRef !== "HEAD" && (
            <button
              onClick={() => handleRefChange("HEAD")}
              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-2 text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-md"
              title="Reset view to latest state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to HEAD</span>
            </button>
          )}
        </div>
      </div>

      {/* HISTORICAL CHECKPOINT NOTICE BANNER */}
      {selectedRef !== "HEAD" && activeCommitObj && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-mono flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Viewing historical checkpoint at commit <strong className="text-white">{activeCommitObj.shortSha}</strong>: &quot;{activeCommitObj.message}&quot; ({activeCommitObj.relativeTime})
            </span>
          </div>
          <button
            onClick={() => handleRefChange("HEAD")}
            className="text-xs font-bold underline hover:text-white shrink-0 ml-3"
          >
            Switch Back to Latest HEAD →
          </button>
        </div>
      )}

      {/* Top Breadcrumbs & Back Button Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 overflow-x-auto max-w-full">
          <button
            onClick={() => {
              setSelectedFile(null);
              fetchDirectory("", selectedRef);
            }}
            className="font-bold text-indigo-400 hover:underline flex items-center gap-1.5 shrink-0"
          >
            <FolderTree className="w-4 h-4" />
            {repoName}
          </button>

          {currentDir.split("/").filter(Boolean).map((part, idx, arr) => {
            const pathUpTo = arr.slice(0, idx + 1).join("/");
            return (
              <React.Fragment key={pathUpTo}>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    fetchDirectory(pathUpTo, selectedRef);
                  }}
                  className="hover:text-white transition-colors shrink-0"
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}

          {selectedFile && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="text-emerald-400 font-bold shrink-0">{selectedFile.split("/").pop()}</span>
            </>
          )}
        </div>

        {currentDir && (
          <button
            onClick={handleNavigateUp}
            className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 px-3.5 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-md"
          >
            <CornerUpLeft className="w-4 h-4" />
            <span>Back to Parent Folder</span>
          </button>
        )}
      </div>

      {/* Main Files Viewport */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-[460px]">
        {/* Left Column: Directory File Tree */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2 max-h-[580px] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Files ({entries.length})
            </span>
            {currentDir && (
              <button
                onClick={handleNavigateUp}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                title="Go 1 folder back"
              >
                <CornerUpLeft className="w-3 h-3" />
                .. / Back
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Loading files...
            </div>
          ) : entries.length > 0 ? (
            <div className="space-y-1">
              {/* Back button entry inside list when inside subfolder */}
              {currentDir && (
                <button
                  onClick={handleNavigateUp}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-2 mb-2"
                >
                  <CornerUpLeft className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>.. (Back to Parent Folder)</span>
                </button>
              )}

              {entries.map((entry) => {
                const isSelected = selectedFile === entry.relativePath;

                if (entry.type === "directory") {
                  return (
                    <button
                      key={entry.relativePath}
                      onClick={() => {
                        setSelectedFile(null);
                        fetchDirectory(entry.relativePath, selectedRef);
                      }}
                      className="w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between hover:bg-zinc-800/80 text-zinc-200 group"
                    >
                      <span className="truncate flex items-center gap-2">
                        <Folder className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                        {entry.name}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                    </button>
                  );
                }

                return (
                  <button
                    key={entry.relativePath}
                    onClick={() => fetchFileContent(entry.relativePath, selectedRef)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold shadow-md"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                      {entry.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal shrink-0 ml-2">
                      {formatBytes(entry.sizeBytes)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3 py-8 text-center">
              {currentDir && (
                <button
                  onClick={handleNavigateUp}
                  className="w-full text-left p-2.5 rounded-xl text-xs font-mono font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <CornerUpLeft className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>.. (Back to Parent Folder)</span>
                </button>
              )}
              <div className="text-zinc-500 text-xs">Directory is empty.</div>
            </div>
          )}
        </div>

        {/* Right Column: Code Viewer / File Inspector */}
        <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between max-h-[580px] overflow-hidden shadow-2xl">
          {selectedFile ? (
            <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
              {/* File Meta Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white text-sm font-mono">{selectedFile.split("/").pop()}</h3>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-0.5">
                      <span>{fileMeta?.linesCount || 0} lines</span>
                      <span>•</span>
                      <span>{formatBytes(fileMeta?.sizeBytes)}</span>
                      <span>•</span>
                      <span className="uppercase text-indigo-400 font-bold">{fileMeta?.extension}</span>
                      {selectedRef !== "HEAD" && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-bold">Checkpoint: {selectedRef.substring(0, 7)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Lines Viewer */}
              {fileLoading ? (
                <div className="py-24 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  Reading file contents...
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto font-mono text-xs p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 leading-relaxed text-zinc-200">
                  {fileContent ? (
                    <table className="w-full border-collapse">
                      <tbody>
                        {fileContent.split("\n").map((line, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/40">
                            <td className="select-none text-right pr-4 text-zinc-600 text-[11px] font-mono w-10 shrink-0 border-r border-zinc-800/60">
                              {idx + 1}
                            </td>
                            <td className="pl-4 whitespace-pre-wrap font-mono text-[11px] text-zinc-200">
                              {line || " "}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-zinc-500 text-center py-12">No file content.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-24 text-zinc-500">
              <FolderTree className="w-12 h-12 text-zinc-700" />
              <div>
                <h4 className="text-sm font-bold text-zinc-300">Select a File to View</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Click on any file from the directory tree on the left to inspect its code as it existed at the selected commit checkpoint.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
