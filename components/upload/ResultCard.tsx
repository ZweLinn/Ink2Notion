"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { NoteType } from "@/types";
import Button from "@/components/ui/Button";

interface ExtractionResult {
  success: boolean;
  filename?: string;
  noteType?: NoteType;
  extracted?: Record<string, unknown>;
  error?: string;
  pageUrl?: string;
}

interface ResultCardProps {
  result: ExtractionResult;
  onDiscard?: () => void;
  standalone?: boolean; // single mode — shows save button immediately
}

function renderExtracted(
  noteType: NoteType | undefined,
  extracted: Record<string, unknown> | undefined,
) {
  if (!extracted) return null;

  // Common fields
  const title = extracted.title as string;
  const content = extracted.content as string;
  const tags = extracted.tags as string[];
  const notes = extracted.notes as string;

  switch (noteType) {
    case "meeting": {
      const attendees = extracted.attendees as string[];
      const agenda = extracted.agenda as string[];
      const actionItems = extracted.action_items as string[];
      return (
        <div className="space-y-2 text-sm">
          {attendees?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Attendees
              </p>
              {attendees.map((a, i) => (
                <p key={i} className="text-foreground">
                  • {a}
                </p>
              ))}
            </>
          )}
          {agenda?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Agenda
              </p>
              {agenda.map((a, i) => (
                <p key={i} className="text-foreground">
                  • {a}
                </p>
              ))}
            </>
          )}
          {actionItems?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Action Items
              </p>
              {actionItems.map((a, i) => (
                <p key={i} className="text-foreground">
                  ☐ {a}
                </p>
              ))}
            </>
          )}
          {notes && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Notes
              </p>
              <p className="text-foreground">{notes}</p>
            </>
          )}
        </div>
      );
    }
    case "todo": {
      const items = extracted.items as Array<{
        task: string;
        priority?: string;
        done?: boolean;
      }>;
      return (
        <div className="space-y-1.5 text-sm">
          {items?.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0">
                {item.done ? "✅" : "☐"}
              </span>
              <div>
                <span className="text-foreground">{item.task}</span>
                {item.priority && (
                  <span
                    className={`ml-2 text-xs ${
                      item.priority === "high"
                        ? "text-red-500"
                        : item.priority === "medium"
                          ? "text-yellow-500"
                          : "text-muted"
                    }`}
                  >
                    ({item.priority})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "study": {
      const subject = extracted.subject as string;
      const keyConcepts = extracted.key_concepts as string[];
      const questions = extracted.questions as string[];
      return (
        <div className="space-y-2 text-sm">
          {subject && (
            <p className="text-foreground">📚 Subject: {subject}</p>
          )}
          {keyConcepts?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Key Concepts
              </p>
              {keyConcepts.map((c, i) => (
                <p key={i} className="text-foreground">
                  • {c}
                </p>
              ))}
            </>
          )}
          {notes && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Notes
              </p>
              <p className="text-foreground">{notes}</p>
            </>
          )}
          {questions?.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Questions
              </p>
              {questions.map((q, i) => (
                <p key={i} className="text-foreground">
                  • {q}
                </p>
              ))}
            </>
          )}
        </div>
      );
    }
    default: {
      // general
      return (
        <div className="space-y-2 text-sm">
          {content && <p className="text-foreground">{content}</p>}
          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
  }
}

export default function ResultCard({
  result,
  onDiscard,
  standalone,
}: ResultCardProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!result.success) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-500">Extraction failed</p>
            <p className="mt-1 text-sm text-muted">
              {result.filename && `${result.filename}: `}
              {result.error || "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { noteType, extracted, filename } = result;
  const title = (extracted?.title as string) || filename || "Untitled";

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType, extracted }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save to Notion");
      }

      setSaved(true);
      toast.success("Note saved to Notion!");
      return data;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save to Notion",
      );
    } finally {
      setSaving(false);
    }
  }

  if (saved && result.pageUrl) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-500">Saved!</p>
          </div>
          <a
            href={result.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            Open in Notion
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted">
            {filename && `${filename} • `}
            {noteType && (
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                {noteType}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Extracted content */}
      <div className="mb-4 max-h-60 overflow-y-auto rounded-lg bg-background p-3">
        {renderExtracted(noteType, extracted)}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {standalone && !saved && (
          <Button loading={saving} onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save to Notion
          </Button>
        )}
        {saved && result.pageUrl && (
          <a
            href={result.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:bg-card-hover"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Notion
          </a>
        )}
        {onDiscard && !saved && (
          <Button variant="ghost" onClick={onDiscard}>
            <Trash2 className="h-4 w-4" />
            Discard
          </Button>
        )}
      </div>
    </div>
  );
}
