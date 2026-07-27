import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  Show,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DevOS - Developer Workspace Operating System",
  description: "Desktop-first developer workspace OS with GitHub Integration & Git Engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
          <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <div className="flex items-center gap-8">
                <Link href="/" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white hover:opacity-90">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 font-extrabold text-white text-xs shadow-md shadow-indigo-500/20">
                    OS
                  </span>
                  <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    DevOS
                  </span>
                </Link>

                <nav className="flex items-center gap-2">
                  <Link
                    href="/source-control"
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-700/50"
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Source Control
                  </Link>

                  <Link
                    href="/dashboard/git-engine"
                    className="inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition-all border border-transparent hover:border-zinc-700/50"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Git Engine Watcher
                  </Link>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/20">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>

                <Show when="signed-in">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "h-9 w-9 border border-zinc-700",
                      },
                    }}
                  />
                </Show>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-zinc-900 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
            <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span>DevOS • Developer Workspace Operating System</span>
              <span className="font-mono text-[11px] text-zinc-600">Phase 1: GitHub Integration & Git Engine</span>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
