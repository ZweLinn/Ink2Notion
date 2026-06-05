"use client";

import { NoteType } from "@/types";

interface NoteTypeSelectorProps {
  selected: NoteType;
  onChange: (type: NoteType) => void;
}

const types: Array<{
  value: NoteType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    value: "general",
    label: "General",
    icon: "📝",
    description: "Any handwritten notes",
  },
  {
    value: "meeting",
    label: "Meeting",
    icon: "🤝",
    description: "Meeting minutes & action items",
  },
  {
    value: "todo",
    label: "Todo",
    icon: "✅",
    description: "Task lists & checkboxes",
  },
  {
    value: "study",
    label: "Study",
    icon: "📚",
    description: "Study notes & key concepts",
  },
];

export default function NoteTypeSelector({
  selected,
  onChange,
}: NoteTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {types.map((t) => {
        const active = selected === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all ${
              active
                ? "border-accent bg-accent/10 ring-1 ring-accent"
                : "border-border bg-card hover:border-accent/50 hover:bg-card-hover"
            }`}
          >
            <span className="text-2xl">{t.icon}</span>
            <span className="text-sm font-medium">{t.label}</span>
            <span className="text-xs text-muted">{t.description}</span>
          </button>
        );
      })}
    </div>
  );
}
