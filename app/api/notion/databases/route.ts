import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOTION_VERSION } from "@/lib/notion";
import { authOptions } from "@/lib/auth-options";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get the user's Notion connection
  const { data: conn, error } = await supabaseAdmin
    .from("notion_connections")
    .select("access_token")
    .eq("user_id", session.user.id)
    .single();

  if (error || !conn) {
    console.error("Databases route - supabase error:", error, "user_id:", session.user.id);
    return NextResponse.json(
      { error: "Notion not connected" },
      { status: 400 },
    );
  }

  // Search for databases in the user's Notion workspace
  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      filter: { value: "database", property: "object" },
      page_size: 50,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json(
      { error: err.message ?? "Failed to fetch databases" },
      { status: 500 },
    );
  }

  const data = await res.json();

  // Return a minimal list for the frontend picker
  const databases = data.results.map((db: any) => ({
    id: db.id,
    title:
      db.title?.[0]?.plain_text ??
      db.description?.[0]?.plain_text ??
      "Untitled",
  }));

  return NextResponse.json({ databases });
}
