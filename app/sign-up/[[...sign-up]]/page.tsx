import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center p-6 bg-zinc-950">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto shadow-2xl rounded-2xl overflow-hidden",
            card: "bg-zinc-900 border border-zinc-800 text-zinc-100",
            headerTitle: "text-white font-bold",
            headerSubtitle: "text-zinc-400",
            socialButtonsBlockButton:
              "border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 transition-colors",
            socialButtonsBlockButtonText: "font-medium",
            dividerLine: "bg-zinc-800",
            dividerText: "text-zinc-500",
            formFieldLabel: "text-zinc-300",
            formFieldInput:
              "bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 focus:border-indigo-500 focus:ring-indigo-500",
            formButtonPrimary:
              "bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-500/20 transition-colors",
            footerActionText: "text-zinc-400",
            footerActionLink: "text-indigo-400 hover:text-indigo-300 font-medium",
          },
        }}
      />
    </div>
  );
}
