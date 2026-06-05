"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PenLine,
  ArrowRight,
  LogOut,
  Unlink,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import DatabasePicker from "@/components/notion/DatabasePicker";

interface ConnectionData {
  databases: Array<{ id: string; title: string }>;
  workspace_name?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/notion/databases");
      if (res.ok) {
        const data: ConnectionData = await res.json();
        setHasConnection(true);
        // If there's only one db or we detect a saved one, we could set it here
        // But DatabasePicker handles fetching the list itself
      } else {
        setHasConnection(false);
      }
    } catch {
      setHasConnection(false);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") checkConnection();
  }, [status, router, checkConnection]);

  // Handle URL notifications from Notion OAuth callback
  useEffect(() => {
    const notionStatus = searchParams.get("notion");
    if (notionStatus === "connected") {
      toast.success("Notion connected successfully!");
      checkConnection();
      router.replace("/dashboard");
    } else if (notionStatus === "error") {
      toast.error("Failed to connect Notion.");
      router.replace("/dashboard");
    }
  }, [searchParams, router, checkConnection]);

  async function handleConnect() {
    window.location.href = "/api/notion/connect";
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/notion/disconnect", { method: "POST" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setHasConnection(false);
      setSelectedDb(null);
      toast.success("Notion disconnected");
    } catch {
      toast.error("Failed to disconnect Notion");
    } finally {
      setDisconnecting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-accent/10 p-2">
            <PenLine className="h-5 w-5 text-accent" />
          </div>
          <span className="text-lg font-semibold">Ink2Notion</span>
        </Link>
        <div className="flex items-center gap-3">
          {session?.user?.name && (
            <span className="text-sm text-muted">{session.user.name}</span>
          )}
          <Button
            variant="ghost"
            onClick={() => router.push("/api/auth/signout")}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Notion Connection Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-1 text-lg font-semibold">Notion Integration</h2>
            <p className="mb-6 text-sm text-muted">
              Connect your Notion workspace to save notes automatically.
            </p>

            {hasConnection === null ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking connection...
              </div>
            ) : hasConnection ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Notion workspace connected</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Database</label>
                  <DatabasePicker
                    selectedDatabaseId={selectedDb}
                    onSelect={setSelectedDb}
                  />
                  <p className="text-xs text-muted">
                    Choose which Notion database your notes will be saved to.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Link href="/upload">
                    <Button>
                      Go to Upload
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    loading={disconnecting}
                    onClick={handleDisconnect}
                  >
                    <Unlink className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-muted">
                  <XCircle className="h-4 w-4" />
                  <span>Not connected to Notion</span>
                </div>
                <Button onClick={handleConnect} className="w-full">
                  Connect Notion
                </Button>
              </div>
            )}
          </div>

          {/* Account Card */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Account</h2>
            <div className="text-sm text-muted">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {session?.user?.email}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
