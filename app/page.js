"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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

  async function handleLogin() {
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: redirectTo ? { redirectTo } : undefined,
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
    await supabase.auth.signOut();
    toast.success("Logged out");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 text-transparent bg-clip-text">
          AI Resume & Cover Letter Builder
        </h1>
        <p className="text-slate-400 text-sm md:text-base mb-8">
          Generate optimized resumes and tailored cover letters using AI —
          designed to help you land your next job faster.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium text-sm"
              >
                Go to Dashboard →
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 rounded-md border border-slate-700 hover:border-slate-500 text-sm"
              >
                Log out
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 font-medium text-sm"
            >
              Sign in with GitHub
            </button>
          )}
        </div>

        <footer className="mt-10 text-xs text-slate-500">
          Made with ❤️ by{" "}
          <a
            href="https://www.linkedin.com/in/shripad-s-dabbir"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300"
          >
            Shripad Dabbir
          </a>
        </footer>
      </div>
    </main>
  );
}
