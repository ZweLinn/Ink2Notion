"use client";

import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface Database {
  id: string;
  title: string;
}

interface DatabasePickerProps {
  selectedDatabaseId: string | null;
  onSelect: (dbId: string) => void;
}

export default function DatabasePicker({
  selectedDatabaseId,
  onSelect,
}: DatabasePickerProps) {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchDatabases() {
      try {
        const res = await fetch("/api/notion/databases");
        if (!res.ok) throw new Error("Failed to fetch databases");
        const data = await res.json();
        setDatabases(data.databases || []);
      } catch (err) {
        toast.error("Could not load Notion databases");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabases();
  }, []);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const dbId = e.target.value;
    if (!dbId) return;

    setSaving(true);
    try {
      const res = await fetch("/api/notion/databases/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseId: dbId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save selection");
      }

      onSelect(dbId);
      toast.success("Database selected");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to select database",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading databases...
      </div>
    );
  }

  if (databases.length === 0) {
    return (
      <p className="text-sm text-muted">
        No databases found in your Notion workspace.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedDatabaseId || ""}
        onChange={handleChange}
        disabled={saving}
        className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      >
        <option value="">
          {selectedDatabaseId
            ? "Change database..."
            : "Select a database..."}
        </option>
        {databases.map((db) => (
          <option key={db.id} value={db.id}>
            {db.title}
          </option>
        ))}
      </select>
      {saving && <Loader2 className="h-4 w-4 animate-spin text-muted" />}
      {!saving && selectedDatabaseId && (
        <Check className="h-4 w-4 text-green-500" />
      )}
    </div>
  );
}
