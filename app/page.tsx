"use client";

import { useSession } from "next-auth/react";
import { PenLine, ArrowRight, Code2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-background px-6">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-12 text-center">
        {/* Icon */}
        {/*<div className="rounded-2xl bg-accent/10 p-4">
          <PenLine className="h-10 w-10 text-accent" />
        </div>*/}

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ink2Notion
          </h1>
          <p className="mx-auto max-w-md text-lg text-muted">
            Snap a photo of your handwritten notes. AI extracts the text and
            saves them straight to your Notion database.
          </p>
        </div>

        {/* CTA */}
        {session ? (
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
          >
            Go to Upload
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium transition-colors hover:bg-card-hover"
            >
              Create Account
            </Link>
          </div>
        )}

        {/* Features */}
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 text-left">
            <h3 className="mb-2 text-sm font-semibold">📸 Snap & Extract</h3>
            <p className="text-sm text-muted">
              Upload a photo of handwritten notes — AI extracts the text
              automatically.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-left">
            <h3 className="mb-2 text-sm font-semibold">
              🏷️ Smart Classification
            </h3>
            <p className="text-sm text-muted">
              Choose a note type (General, Meeting, Todo, Study) — extraction
              adapts to each format.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 text-left">
            <h3 className="mb-2 text-sm font-semibold">📋 Save to Notion</h3>
            <p className="text-sm text-muted">
              One click pushes the structured note into your Notion database
              with proper formatting.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-8 text-xs text-muted">
          <a
            href="https://github.com/zwelinn/handwriting-to-notion"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <Code2 className="h-3.5 w-3.5" />
            zwelinn/handwriting-to-notion
          </a>
        </div>
      </main>
    </div>
  );
}
