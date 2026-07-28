export default function SourceControlLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-6 text-zinc-100 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
        <div className="space-y-2">
          <div className="h-4 w-48 bg-zinc-800 rounded-full"></div>
          <div className="h-9 w-64 bg-zinc-800 rounded-xl"></div>
          <div className="h-4 w-80 bg-zinc-800/60 rounded"></div>
        </div>
        <div className="h-10 w-36 bg-zinc-800 rounded-xl"></div>
      </div>

      {/* Account Card Skeleton */}
      <div className="h-24 w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl"></div>

      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="h-3 w-16 bg-zinc-800 rounded"></div>
            <div className="h-6 w-10 bg-zinc-800 rounded font-bold"></div>
          </div>
        ))}
      </div>

      {/* Repositories Grid Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-56 bg-zinc-800 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="h-6 w-3/4 bg-zinc-800 rounded"></div>
              <div className="h-10 w-full bg-zinc-800/40 rounded"></div>
              <div className="h-16 w-full bg-zinc-800/60 rounded"></div>
              <div className="h-10 w-full bg-indigo-950/40 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
