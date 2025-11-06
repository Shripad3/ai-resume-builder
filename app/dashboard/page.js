"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ai-resume-history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("ai-resume-history", JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history", err);
    }
  }, [history]);

  function addHistoryEntry({ type, output }) {
    const entry = {
      id: Date.now(),
      type, // "resume" | "cover"
      createdAt: new Date().toISOString(),
      resume,
      jobDescription,
      output,
    };

    setHistory((prev) => [entry, ...prev].slice(0, 20)); // keep last 20
  }

  function handleLoadFromHistory(entry) {
    setResume(entry.resume || "");
    setJobDescription(entry.jobDescription || "");

    if (entry.type === "resume") {
      setResult(entry.output || "");
      setActiveTab("resume");
    } else {
      setCoverLetter(entry.output || "");
      setActiveTab("cover");
    }

    toast.success(
      entry.type === "resume"
        ? "Loaded resume from history"
        : "Loaded cover letter from history"
    );
  }

  function handleClearHistory() {
    setHistory([]);
    toast.success("Cleared history");
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setResult("");
    setError("");
    setIsLoading(true);

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
      const text = await file.text(); // text-based upload
      setResume(text);
      toast.success("Loaded resume from file 📄");
    } catch (err) {
      console.error(err);
      const message =
        "Could not read that file. For now, please upload a .txt file or paste your resume manually.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold">
              AI
            </div>
            <span className="font-semibold tracking-tight">
              AI Resume Builder
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Dashboard · Draft version
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
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <span>Upload resume (.txt)</span>
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
                type="submit"
                disabled={isLoading || uploading}
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

        {/* Right side: result */}
        {/* Right side: tabs + content */}
        <div className="space-y-3">
          {/* Tabs + actions */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <div className="flex items-center bg-slate-900 rounded-full p-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("resume")}
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
                onClick={() => setActiveTab("cover")}
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
              ) : (
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div
                      key={result}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {result}
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
              ) : (
                <AnimatePresence mode="wait">
                  {coverLetter ? (
                    <motion.div
                      key={coverLetter}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {coverLetter}
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
                  No history yet. Generate a resume or cover letter to see it
                  here.
                </p>
              ) : (
                history.map((entry) => (
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
                        {new Date(entry.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 truncate">
                      {entry.jobDescription?.slice(0, 80) ||
                        "No job description"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
