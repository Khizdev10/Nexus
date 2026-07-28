export default function GitEngineLoading() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full p-4 sm:p-6 animate-pulse">
      {/* Header Banner Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-2">
          <div className="h-4 w-44 bg-zinc-800 rounded-full"></div>
          <div className="h-8 w-48 bg-zinc-800 rounded-xl"></div>
          <div className="h-4 w-96 bg-zinc-800/60 rounded"></div>
        </div>
        <div className="h-9 w-36 bg-zinc-800 rounded-xl"></div>
      </div>

      {/* Workspace Tabs Skeleton */}
      <div className="h-12 w-80 bg-zinc-900/80 border border-zinc-800 rounded-2xl"></div>

      {/* Control Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-44 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
        <div className="h-44 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
        <div className="h-44 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
      </div>
    </div>
  );
}
