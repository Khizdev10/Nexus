export default function RepoDashboardLoading() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full p-6 text-zinc-100 animate-pulse">
      {/* Back & Breadcrumbs Skeleton */}
      <div className="space-y-3">
        <div className="h-4 w-32 bg-zinc-800 rounded"></div>
        <div className="flex items-center justify-between">
          <div className="h-10 w-64 bg-zinc-800 rounded-xl"></div>
          <div className="h-10 w-36 bg-zinc-800 rounded-xl"></div>
        </div>
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-28 bg-zinc-900 rounded-xl border border-zinc-800"></div>
        ))}
      </div>

      {/* Quick Actions Bar Skeleton */}
      <div className="h-32 w-full bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>

      {/* Overview Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-48 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
        <div className="h-48 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
        <div className="h-48 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6"></div>
      </div>
    </div>
  );
}
