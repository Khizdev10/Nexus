"use client";

import React, { useState, useEffect, useRef } from "react";
import { MoreVertical, Edit3, Trash2 } from "lucide-react";
import RenameRepoModal from "./RenameRepoModal";
import DeleteRepoModal from "./DeleteRepoModal";

interface RepoActionDropdownProps {
  repoId: string;
  repoName: string;
  ownerLogin: string;
  localPath: string;
}

export default function RepoActionDropdown({
  repoId,
  repoName,
  ownerLogin,
  localPath,
}: RepoActionDropdownProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* 3-Dot Click Trigger Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDropdownOpen((prev) => !prev);
        }}
        className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm"
        title="Repository Options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Floating Click Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-50 animate-fadeIn space-y-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(false);
              setIsRenameOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-amber-300 hover:bg-amber-500/10 transition-colors text-left"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Rename Repository...</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen(false);
              setIsDeleteOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete Repository...</span>
          </button>
        </div>
      )}

      {/* Controlled Modals with Typed Name Confirmation */}
      <RenameRepoModal
        repoId={repoId}
        repoName={repoName}
        ownerLogin={ownerLogin}
        localPath={localPath}
        isOpenControlled={isRenameOpen}
        onCloseControlled={() => setIsRenameOpen(false)}
      />

      <DeleteRepoModal
        repoId={repoId}
        repoName={repoName}
        ownerLogin={ownerLogin}
        localPath={localPath}
        isOpenControlled={isDeleteOpen}
        onCloseControlled={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
