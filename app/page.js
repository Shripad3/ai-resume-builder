"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user ?? null);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin(provider) {
    try {
      const redirectTo =
        process.env.NEXT_PUBLIC_SITE_URL ??
        (typeof window !== "undefined" ? window.location.origin : undefined);

      const { error } = await supabase.auth.signInWithOAuth({
        provider, // "github" or "google"
        ...(redirectTo ? { options: { redirectTo } } : {}),
      });

      if (error) {
        console.error(error);
        toast.error("Failed to start login");
      }
    } catch (err) {
      console.error(err);
      toast.error("Login failed");
    }
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      toast.error("Failed to log out");
    } else {
      toast.success("Logged out");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-12">
        {/* Hero */}
        <section className="pt-8 text-center md:text-left md:flex md:items-center md:justify-between md:gap-10">
          <div className="md:flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
              Job search, but less painful
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
              Build better{" "}
              <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
                resumes &amp; cover letters
              </span>{" "}
              with AI.
            </h1>
            <p className="text-slate-400 text-sm md:text-base mb-6 max-w-xl">
              Paste your resume and a job description, and get an optimized
              resume plus a tailored cover letter in seconds. Export, tweak, and
              reuse for every role you apply to.
            </p>

            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mb-4">
              {user ? (
                <>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium text-sm"
                  >
                    Go to dashboard →
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-md border border-slate-700 hover:border-slate-500 text-sm"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleLogin("github")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium text-sm"
                  >
                    Sign in with GitHub
                  </button>
                  <button
                    onClick={() => handleLogin("google")}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-slate-900 border border-slate-700 hover:border-slate-500 font-medium text-sm"
                  >
                    Sign in with Google
                  </button>
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-md border border-slate-800 hover:border-slate-600 text-sm"
                  >
                    Continue without signing in
                  </button>
                </>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              No spam, no newsletters. GitHub is only used to identify your
              account and sync your generation history across devices.
            </p>
          </div>

          {/* Simple right-side card / fake preview */}
          <div className="hidden md:block md:flex-1">
            <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow-lg shadow-slate-900/60">
              <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-500/80 flex items-center justify-center text-[10px] font-bold">
                    AI
                  </span>
                  Dashboard preview
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] uppercase tracking-wide">
                  Resume · Cover letter
                </span>
              </div>
              <div className="space-y-2 text-[11px] text-slate-300">
                <div className="h-3 w-24 rounded bg-slate-800" />
                <div className="h-3 w-40 rounded bg-slate-800" />
                <div className="h-[1px] w-full bg-slate-800 my-3" />
                <div className="space-y-1">
                  <div className="h-2.5 w-3/4 rounded bg-slate-800" />
                  <div className="h-2.5 w-2/3 rounded bg-slate-800" />
                  <div className="h-2.5 w-5/6 rounded bg-slate-800" />
                  <div className="h-2.5 w-4/5 rounded bg-slate-800" />
                </div>
                <div className="h-[1px] w-full bg-slate-800 my-3" />
                <div className="flex gap-2">
                  <div className="h-2.5 w-16 rounded bg-slate-800" />
                  <div className="h-2.5 w-24 rounded bg-slate-800" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">What you get</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-sm mb-3">
                🎯
              </div>
              <h3 className="text-sm font-semibold mb-1">
                AI-optimized resumes
              </h3>
              <p className="text-xs text-slate-400">
                Paste your existing resume and a job description. Get a version
                rewritten to match the role&apos;s requirements.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-sm mb-3">
                ✉️
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Tailored cover letters
              </h3>
              <p className="text-xs text-slate-400">
                Generate personalized cover letters that reference the company,
                role, and your experience — in one click.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-sm mb-3">
                ☁️
              </div>
              <h3 className="text-sm font-semibold mb-1">
                Cloud history & exports
              </h3>
              <p className="text-xs text-slate-400">
                Signed-in users keep a history of generations. Copy, edit, and
                download as PDF whenever you need.
              </p>
            </div>
          </div>
        </section>

        {/* Why sign in */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-100">
            Why sign in with GitHub?
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            You can try the builder without an account, but signing in unlocks
            extra convenience:
          </p>
          <ul className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-blue-400">•</span>
              <span>
                Sync your resume and cover letter history across devices.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-blue-400">•</span>
              <span>Quickly revisit past applications for similar roles.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-blue-400">•</span>
              <span>
                No passwords to remember — GitHub handles secure authentication.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] text-blue-400">•</span>
              <span>
                Your content stays private. Nothing is posted to GitHub or
                shared publicly.
              </span>
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            Made with ❤️ by{" "}
            <a
              href="https://www.linkedin.com/in/shripad-s-dabbir"
              className="text-blue-400 hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Dabbir Sathish Shripad
            </a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Shripad3/ai-resume-builder"
              className="hover:text-slate-200"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <span className="text-slate-600">•</span>
            <span>AI Resume Builder</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
