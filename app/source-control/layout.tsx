import Sidebar from "@/components/Sidebar";

export default function SourceControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex min-h-[calc(100vh-73px)] bg-zinc-950 text-zinc-100">
      {/* Interactive Sidebar with Active Highlighting */}
      <Sidebar />

      {/* Main Workspace Content */}
      <main className="flex-1 flex flex-col p-6 overflow-y-auto">{children}</main>
    </div>
  );
}
