"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isCoverLoading, setIsCoverLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState("resume");
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // NEW: editing state per tab
  const [isEditingResume, setIsEditingResume] = useState(false);
  const [isEditingCover, setIsEditingCover] = useState(false);

  // Load user + history from Supabase
  useEffect(() => {
    async function loadUserAndHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user ?? null);

      if (user) {
        const { data, error } = await supabase
          .from("histories")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Failed to load history", error);
        } else if (data) {
          setHistory(data);
        }
      }
    }

    loadUserAndHistory();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setHistory([]);
      } else {
        supabase
          .from("histories")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (error) {
              console.error("Failed to load history", error);
            } else if (data) {
              setHistory(data);
            }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  // Save history entry to Supabase for logged-in users
  async function addHistoryEntry({ type, output }) {
    if (!user) return; // only save cloud history when logged in

    const payload = {
      user_id: user.id,
      type, // "resume" | "cover"
      resume,
      job_description: jobDescription,
      output,
    };

    const { data, error } = await supabase
      .from("histories")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Failed to save history", error);
      return;
    }

    setHistory((prev) => [data, ...prev]);
  }

  function handleLoadFromHistory(entry) {
    setResume(entry.resume || "");
    setJobDescription(entry.job_description || entry.jobDescription || "");

    if (entry.type === "resume") {
      setResult(entry.output || "");
      setActiveTab("resume");
      setIsEditingResume(false);
      setIsEditingCover(false);
    } else {
      setCoverLetter(entry.output || "");
      setActiveTab("cover");
      setIsEditingResume(false);
      setIsEditingCover(false);
    }

    toast.success(
      entry.type === "resume"
        ? "Loaded resume from history"
        : "Loaded cover letter from history"
    );
  }

  async function handleClearHistory() {
    if (user) {
      const { error } = await supabase
        .from("histories")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to clear history", error);
        toast.error("Could not clear history");
        return;
      }
    }

    setHistory([]);
    toast.success("Cleared history");
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setResult("");
    setError("");
    setIsLoading(true);
    setIsEditingResume(false); // exit edit mode when regenerating

    try {
      const res = await fetch("/api/generate-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate resume");
      }

      const data = await res.json();
      setResult(data.result);
      setActiveTab("resume");
      toast.success("Generated optimized resume ✨");
      addHistoryEntry({ type: "resume", output: data.result });
    } catch (err) {
      console.error(err);
      const message = err.message || "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    setError("");
    setCoverLetter("");
    setIsCoverLoading(true);
    setIsEditingCover(false); // exit edit mode when regenerating

    try {
      const res = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, jobDescription }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate cover letter");
      }

      const data = await res.json();
      setCoverLetter(data.result);
      setActiveTab("cover");
      toast.success("Generated tailored cover letter ✉️");
      addHistoryEntry({ type: "cover", output: data.result });
    } catch (err) {
      console.error(err);
      const message = err.message || "Something went wrong";
      setError(message);
      toast.error(message);
    } finally {
      setIsCoverLoading(false);
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    setUploadedFileName(file.name);

    try {
      let text = "";

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        // 🔵 Use env var, but fall back to localhost:8000 if it's missing
        const baseUrl =
          process.env.NEXT_PUBLIC_PDF_SERVICE_URL || "http://127.0.0.1:8000";

        console.log("Using PDF service URL:", baseUrl);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${baseUrl}/parse-pdf`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        console.log("Python parse-pdf response:", res.status, data);

        if (data.error || !res.ok) {
          throw new Error(
            data.error ||
              "We couldn't read that PDF. Try exporting as .txt or copy-pasting your resume."
          );
        }

        text = data.text;
      } else {
        // 🟢 .txt or other text-like files
        text = await file.text();
      }

      if (!text || !text.trim()) {
        throw new Error("Could not extract any text from that file.");
      }

      setResume(text);
      toast.success("Loaded resume from file 📄");
    } catch (err) {
      console.error(err);
      const message =
        err.message ||
        "Could not read that file. Please upload a .txt or text-based PDF, or paste your resume manually.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  // async function handleFileChange(e) {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   setError("");
  //   setUploading(true);
  //   setUploadedFileName(file.name);

  //   try {
  //     const text = await file.text();
  //     setResume(text);
  //     toast.success("Loaded resume from file 📄");
  //   } catch (err) {
  //     console.error(err);
  //     const message =
  //       "Could not read that file. For now, please upload a .txt file or paste your resume manually.";
  //     setError(message);
  //     toast.error(message);
  //   } finally {
  //     setUploading(false);
  //   }
  // }

  async function handleCopy() {
    const text = activeTab === "resume" ? result : coverLetter;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      toast.success(
        activeTab === "resume"
          ? "Copied resume to clipboard ✅"
          : "Copied cover letter to clipboard ✅"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to copy");
    }
  }

  async function handleDownloadPdf() {
    const text = activeTab === "resume" ? result : coverLetter;
    if (!text) return;

    setDownloadingPdf(true);
    setError("");

    try {
      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "pt",
        format: "a4",
      });

      const margin = 40;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const lineHeight = 16;

      pdf.setFont("Helvetica", "normal");
      pdf.setFontSize(12);

      const lines = pdf.splitTextToSize(text, usableWidth);
      let y = margin;

      lines.forEach((line) => {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      });

      pdf.save(
        activeTab === "resume"
          ? "ai-optimized-resume.pdf"
          : "ai-cover-letter.pdf"
      );
      toast.success(
        activeTab === "resume"
          ? "Downloaded resume PDF 📁"
          : "Downloaded cover letter PDF 📁"
      );
    } catch (err) {
      console.error(err);
      const message = "Could not generate PDF";
      setError(message);
      toast.error(message);
    } finally {
      setDownloadingPdf(false);
    }
  }

  // helper: toggle edit based on active tab
  function toggleEdit() {
    if (activeTab === "resume") {
      if (!result) return;
      setIsEditingResume((prev) => !prev);
    } else if (activeTab === "cover") {
      if (!coverLetter) return;
      setIsEditingCover((prev) => !prev);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="font-semibold tracking-tight">
              AI Resume Builder
            </span>
          </div>

          {/* Auth status + actions */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {user ? (
              <>
                <span className="text-slate-300">
                  Signed in as{" "}
                  <span className="font-medium">
                    {user.email || user.user_metadata?.full_name || "User"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 text-[11px] text-slate-200"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLogin("github")}
                  className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-100"
                >
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin("google")}
                  className="px-3 py-1.5 rounded-md border border-slate-700 hover:border-slate-500 text-[11px] text-slate-100"
                >
                  Google
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <section className="max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-2">
        {/* Left side: inputs */}
        <div className="space-y-4">
          <h1 className="text-xl font-semibold mb-2">
            Paste your resume and job description
          </h1>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium mb-1">
                Your current resume
              </label>

              {/* File upload */}
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 rounded-md border border-slate-700 text-xs cursor-pointer hover:border-slate-500">
                  <input
                    type="file"
                    accept=".txt,text/plain,application/pdf,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <span>Upload resume (.txt/.pdf)</span>
                </label>
                <span className="text-xs text-slate-400 truncate max-w-xs">
                  {uploading
                    ? "Reading file..."
                    : uploadedFileName
                    ? `Uploaded: ${uploadedFileName}`
                    : "Or paste your resume below"}
                </span>
              </div>

              {/* Textarea */}
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume here, or upload a .txt file above..."
                className="w-full h-40 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Job description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-32 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || uploading || !resume || !jobDescription}
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isLoading ? "Generating..." : "Generate improved resume"}
              </button>

              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={
                  isCoverLoading || uploading || !resume || !jobDescription
                }
                className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isCoverLoading
                  ? "Generating cover letter..."
                  : "Generate cover letter"}
              </button>
            </div>
          </form>
        </div>

        {/* Right side: tabs + content */}
        <div className="space-y-3">
          {/* Tabs + actions */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center bg-slate-900 rounded-full p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("resume");
                  setIsEditingResume(false);
                  setIsEditingCover(false);
                }}
                className={`px-3 py-1.5 rounded-full ${
                  activeTab === "resume"
                    ? "bg-slate-700 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("cover");
                  setIsEditingResume(false);
                  setIsEditingCover(false);
                }}
                className={`px-3 py-1.5 rounded-full ${
                  activeTab === "cover"
                    ? "bg-slate-700 text-slate-50"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Cover Letter
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Edit toggle button */}
              <button
                type="button"
                onClick={toggleEdit}
                disabled={activeTab === "resume" ? !result : !coverLetter}
                className="px-3 py-1.5 rounded-md border border-slate-700 text-xs hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {activeTab === "resume"
                  ? isEditingResume
                    ? "Done editing"
                    : "Edit"
                  : isEditingCover
                  ? "Done editing"
                  : "Edit"}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                disabled={activeTab === "resume" ? !result : !coverLetter}
                className="px-3 py-1.5 rounded-md border border-slate-700 text-xs hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Copy text
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={
                  downloadingPdf ||
                  (activeTab === "resume" ? !result : !coverLetter)
                }
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
              </button>
            </div>
          </div>

          {error && <div className="text-xs text-red-400 mb-1">{error}</div>}

          {/* Tab content */}
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 text-sm text-slate-200 whitespace-pre-wrap h-[420px] overflow-auto">
            {activeTab === "resume" ? (
              isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-800 rounded w-4/5" />
                  <div className="h-4 bg-slate-800 rounded w-1/3" />
                  <div className="h-3 bg-slate-800 rounded w-2/3" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-800 rounded w-4/5" />
                </div>
              ) : isEditingResume ? (
                <textarea
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full h-full min-h-[380px] bg-transparent text-sm text-slate-100 outline-none resize-none"
                  placeholder="Edit your optimized resume here..."
                />
              ) : (
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      key={result}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="prose prose-invert prose-sm max-w-none"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {result}
                      </ReactMarkdown>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="resume-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-500"
                    >
                      No optimized resume yet. Upload or paste your resume and
                      job description on the left and click{" "}
                      <span className="font-semibold">
                        “Generate improved resume”
                      </span>
                      .
                    </motion.span>
                  )}
                </AnimatePresence>
              )
            ) : activeTab === "cover" ? (
              isCoverLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-800 rounded w-4/5" />
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-full" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                  <div className="h-3 bg-slate-800 rounded w-4/5" />
                </div>
              ) : isEditingCover ? (
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full h-full min-h-[380px] bg-transparent text-sm text-slate-100 outline-none resize-none"
                  placeholder="Edit your cover letter here..."
                />
              ) : (
                <AnimatePresence mode="wait">
                  {coverLetter ? (
                    <motion.div
                      key={coverLetter}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="prose prose-invert prose-sm max-w-none"
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {coverLetter}
                      </ReactMarkdown>
                    </motion.div>
                  ) : (
                    <motion.span
                      key="cover-empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-500"
                    >
                      No cover letter yet. Once your resume and job description
                      are set, click{" "}
                      <span className="font-semibold">
                        “Generate cover letter”
                      </span>
                      .
                    </motion.span>
                  )}
                </AnimatePresence>
              )
            ) : null}
          </div>

          {/* Generation history */}
          <div className="space-y-2 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">
                Generation history
              </h3>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="text-[11px] text-slate-500 hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-40 overflow-auto text-xs">
              {history.length === 0 ? (
                <p className="text-slate-500 text-[11px]">
                  {user
                    ? "No history yet. Generate a resume or cover letter to see it here."
                    : "Sign in to save and view your generation history across devices."}
                </p>
              ) : (
                history.map((entry) => {
                  const createdAt = entry.created_at || entry.createdAt;
                  const jobDesc =
                    entry.job_description || entry.jobDescription || "";

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleLoadFromHistory(entry)}
                      className="w-full text-left px-2 py-1 rounded-md hover:bg-slate-800 border border-slate-800/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {entry.type === "resume" ? "Resume" : "Cover letter"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {createdAt
                            ? new Date(createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        {jobDesc.slice(0, 80) || "No job description"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
