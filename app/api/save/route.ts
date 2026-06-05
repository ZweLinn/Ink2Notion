import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOTION_VERSION } from "@/lib/notion";
import { NoteType } from "@/types";

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { noteType, extracted } = (await req.json()) as {
    noteType: NoteType;
    extracted: Record<string, unknown>;
  };

  // Get user's Notion connection
  const { data: conn, error } = await supabaseAdmin
    .from("notion_connections")
    .select("access_token, notion_database_id")
    .eq("user_id", session.user.id)
    .single();

  if (error || !conn) {
    return NextResponse.json({ error: "Notion not connected" }, { status: 400 });
  }

  if (!conn.notion_database_id) {
    return NextResponse.json({ error: "No Notion database selected" }, { status: 400 });
  }

  // Build Notion page properties (Phase 5 will flesh this out per note type)
  const title = (extracted.title as string) ?? "Untitled Note";

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${conn.access_token}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: conn.notion_database_id },
      properties: {
        Name: { title: [{ text: { content: title } }] },
        Type: { select: { name: noteType } },
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: JSON.stringify(extracted, null, 2) } }],
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err.message ?? "Notion save failed" }, { status: 500 });
  }

  const page = await res.json();
  return NextResponse.json({ success: true, pageId: page.id, pageUrl: page.url });
}
