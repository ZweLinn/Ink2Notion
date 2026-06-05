"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PenLine,
  ArrowLeft,
  Loader2,
  Layers,
  FileUp,
  LogOut,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { NoteType } from "@/types";
import Button from "@/components/ui/Button";
import DropZone from "@/components/upload/DropZone";
import NoteTypeSelector from "@/components/upload/NoteTypeSelector";
import ResultCard from "@/components/upload/ResultCard";

type UploadMode = "single" | "bulk";

interface ExtractionResult {
  success: boolean;
  filename?: string;
  noteType?: NoteType;
  extracted?: Record<string, unknown>;
  error?: string;
  pageUrl?: string;
}

export default function UploadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<UploadMode>("single");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [savingAll, setSavingAll] = useState(false);

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.replace("/login");
    return null;
  }

  const handleFiles = useCallback(
    async (files: File[]) => {
      setProcessing(true);
      setResults([]);

      try {
        const formData = new FormData();

        if (mode === "single") {
          formData.append("image", files[0]);
          formData.append("noteType", noteType);

          const res = await fetch("/api/process", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.success) {
            setResults([data]);
          } else {
            setResults([
              {
                success: false,
                filename: files[0].name,
                error: data.error || "Processing failed",
              },
            ]);
          }
        } else {
          // Bulk
          for (const file of files) {
            formData.append("images", file);
          }
          formData.append("noteType", noteType);

          const res = await fetch("/api/bulk", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        toast.error("Failed to process image(s)");
        console.error(err);
      } finally {
        setProcessing(false);
      }
    },
    [mode, noteType],
  );

  async function handleSaveAll() {
    setSavingAll(true);
    const successful = results.filter((r) => r.success && !r.pageUrl);

    let saved = 0;
    for (const result of successful) {
      try {
        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteType: result.noteType,
            extracted: result.extracted,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          result.pageUrl = data.pageUrl;
          saved++;
        }
      } catch {
        // Continue with others
      }
    }

    setSavingAll(false);
    toast.success(`${saved} of ${successful.length} notes saved to Notion`);
    // Force re-render so saved cards show the Open in Notion link
    setResults([...results]);
  }

  const hasResults = results.length > 0;
  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent/10 p-2">
              <PenLine className="h-5 w-5 text-accent" />
            </div>
            <span className="text-lg font-semibold">Upload Notes</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-muted hidden sm:inline">
              {session.user.name}
            </span>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push("/api/auth/signout")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col px-6 py-8">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          {/* Mode + Note Type in one row */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            {/* Note Type */}
            <div className="flex-1 space-y-3">
              <label className="text-sm font-medium">Note Type</label>
              <NoteTypeSelector selected={noteType} onChange={setNoteType} />
            </div>

            {/* Upload Mode Toggle */}
            <div className="shrink-0 space-y-3">
              <label className="text-sm font-medium">Upload Mode</label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setMode("single")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    mode === "single"
                      ? "bg-accent text-white"
                      : "bg-card text-muted hover:text-foreground"
                  }`}
                >
                  <FileUp className="h-4 w-4" />
                  Single
                </button>
                <button
                  onClick={() => setMode("bulk")}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                    mode === "bulk"
                      ? "bg-accent text-white"
                      : "bg-card text-muted hover:text-foreground"
                  }`}
                >
                  <Layers className="h-4 w-4" />
                  Bulk
                </button>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          {!processing && !hasResults && (
            <DropZone
              key={`${mode}-${noteType}`}
              onFiles={handleFiles}
              multiple={mode === "bulk"}
              maxFiles={mode === "bulk" ? 10 : 1}
            />
          )}

          {/* Processing spinner */}
          {processing && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted">
                {mode === "single"
                  ? "Extracting handwriting with AI..."
                  : "Extracting handwriting from images..."}
              </p>
              <p className="text-xs text-muted">
                This may take a moment per image
              </p>
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <p className="text-sm text-muted">
                  {successCount} of {results.length} processed successfully
                </p>
                <div className="flex gap-2">
                  {mode === "bulk" && successCount > 0 && (
                    <Button loading={savingAll} onClick={handleSaveAll}>
                      <Save className="h-4 w-4" />
                      Save All
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => setResults([])}
                  >
                    Upload More
                  </Button>
                </div>
              </div>

              {/* Result cards */}
              <div className="grid gap-4">
                {results.map((result, i) => (
                  <ResultCard
                    key={i}
                    result={result}
                    standalone={mode === "single"}
                    onDiscard={
                      mode === "bulk"
                        ? () => {
                            const updated = [...results];
                            updated.splice(i, 1);
                            setResults(updated);
                          }
                        : () => setResults([])
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
