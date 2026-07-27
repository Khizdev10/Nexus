import { currentUser } from "@clerk/nextjs/server";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Image from "next/image";

export default async function Home() {
  const user = await currentUser();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-4xl space-y-12 text-center">
        {/* Badge & Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Clerk Authentication Integrated
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Devi
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-zinc-400 leading-relaxed">
            Secure, scalable authentication powered by Clerk with seamless support for Google and GitHub OAuth providers.
          </p>
        </div>

        {/* User Card or Auth CTA */}
        {user ? (
          <div className="mx-auto max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-col items-center gap-4">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={user.firstName || "User avatar"}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-indigo-500/50 p-1 shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                  {user.firstName?.[0] || "U"}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-sm text-zinc-400 font-mono mt-1">
                  {user.emailAddresses[0]?.emailAddress}
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-6 flex items-center justify-between text-sm text-zinc-400">
              <span>Status</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Signed In
              </span>
            </div>

            <div className="pt-2">
              <UserButton
                showName
                appearance={{
                  elements: {
                    userButtonBox: "w-full flex justify-center py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-white font-medium",
                  },
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 backdrop-blur-xl shadow-2xl space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Get Started</h2>
              <p className="text-sm text-zinc-400">
                Sign in or create an account using Google or GitHub
              </p>
            </div>

            {/* Provider Badges */}
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5 text-sm font-medium text-zinc-300">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-800/40 px-4 py-2.5 text-sm font-medium text-zinc-300">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <SignInButton mode="modal">
                <button className="w-full sm:w-auto rounded-xl bg-zinc-800 hover:bg-zinc-700 px-6 py-3 text-sm font-semibold text-white transition-colors border border-zinc-700">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/25">
                  Create Account
                </button>
              </SignUpButton>
            </div>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-left">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <h3 className="font-semibold text-white">Google & GitHub OAuth</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Pre-configured for social sign-in. Turn on Google & GitHub toggles in your Clerk Dashboard.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <h3 className="font-semibold text-white">Middleware Protected</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Utilizes Next.js App Router clerkMiddleware for seamless session management.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-2">
            <h3 className="font-semibold text-white">Pre-built UI Components</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Includes UserButton, SignIn, and SignUp components pre-styled for modern dark UI.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
