import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOTION_VERSION } from "@/lib/notion";
import { NoteType } from "@/types";
import { authOptions } from "@/lib/auth-options";

/* ─── Notion Block Helpers ──────────────────────────── */

function heading(text: string, level: 1 | 2 | 3 = 2) {
  const key = `heading_${level}` as const;
  return {
    object: "block" as const,
    type: key,
    [key]: { rich_text: [{ text: { content: text } }] },
  };
}

function paragraph(text: string) {
  return {
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: { rich_text: [{ text: { content: text } }] },
  };
}

function bullet(text: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: { rich_text: [{ text: { content: text } }] },
  };
}

function toDo(task: string, checked = false) {
  return {
    object: "block" as const,
    type: "to_do" as const,
    to_do: {
      rich_text: [{ text: { content: task } }],
      checked,
    },
  };
}

function divider() {
  return {
    object: "block" as const,
    type: "divider" as const,
    divider: {},
  };
}

/* ─── Block Builders per Note Type ──────────────────── */

function buildGeneralBlocks(extracted: Record<string, unknown>) {
  const blocks: any[] = [];
  const title = (extracted.title as string) || "";
  const content = (extracted.content as string) || "";
  const tags = (extracted.tags as string[]) || [];

  if (title) blocks.push(heading(title, 1));
  if (content) blocks.push(paragraph(content));
  if (tags.length > 0) {
    blocks.push(heading("Tags", 2));
    for (const tag of tags) blocks.push(bullet(tag));
  }
  return blocks;
}

function buildMeetingBlocks(extracted: Record<string, unknown>) {
  const blocks: any[] = [];
  const title = (extracted.title as string) || "";
  const attendees = (extracted.attendees as string[]) || [];
  const agenda = (extracted.agenda as string[]) || [];
  const actionItems = (extracted.action_items as string[]) || [];
  const notes = (extracted.notes as string) || "";

  if (title) blocks.push(heading(title, 1));
  if (extracted.date) blocks.push(paragraph(`📅 ${extracted.date}`));
  blocks.push(divider());

  if (attendees.length > 0) {
    blocks.push(heading("Attendees", 2));
    for (const a of attendees) blocks.push(bullet(a));
  }

  if (agenda.length > 0) {
    blocks.push(heading("Agenda", 2));
    for (const a of agenda) blocks.push(bullet(a));
  }

  if (actionItems.length > 0) {
    blocks.push(heading("Action Items", 2));
    for (const item of actionItems) blocks.push(toDo(item, false));
  }

  if (notes) {
    blocks.push(heading("Notes", 2));
    blocks.push(paragraph(notes));
  }

  return blocks;
}

function buildTodoBlocks(extracted: Record<string, unknown>) {
  const blocks: any[] = [];
  const title = (extracted.title as string) || "";
  const items = (extracted.items as Array<{
    task: string;
    priority?: string;
    done?: boolean;
  }>) || [];

  if (title) blocks.push(heading(title, 1));
  blocks.push(divider());

  for (const item of items) {
    const label = item.priority ? `[${item.priority.toUpperCase()}] ${item.task}` : item.task;
    blocks.push(toDo(label, item.done ?? false));
  }

  return blocks;
}

function buildStudyBlocks(extracted: Record<string, unknown>) {
  const blocks: any[] = [];
  const title = (extracted.title as string) || "";
  const subject = (extracted.subject as string) || "";
  const keyConcepts = (extracted.key_concepts as string[]) || [];
  const notes = (extracted.notes as string) || "";
  const questions = (extracted.questions as string[]) || [];

  if (title) blocks.push(heading(title, 1));
  if (subject) blocks.push(paragraph(`📚 Subject: ${subject}`));
  blocks.push(divider());

  if (keyConcepts.length > 0) {
    blocks.push(heading("Key Concepts", 2));
    for (const c of keyConcepts) blocks.push(bullet(c));
  }

  if (notes) {
    blocks.push(heading("Notes", 2));
    blocks.push(paragraph(notes));
  }

  if (questions.length > 0) {
    blocks.push(heading("Questions", 2));
    for (const q of questions) blocks.push(bullet(q));
  }

  return blocks;
}

/* ─── Properties per Note Type ─────────────────────── */

function buildProperties(
  noteType: NoteType,
  extracted: Record<string, unknown>,
) {
  const title = (extracted.title as string) ?? "Untitled Note";

  const props: Record<string, unknown> = {
    Name: { title: [{ text: { content: title } }] },
    Type: { select: { name: noteType } },
  };

  // Meeting also gets a Date property if extracted
  if (noteType === "meeting" && extracted.date) {
    props.Date = { date: { start: extracted.date } };
  }

  return props;
}

/* ─── Route Handler ────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
      return NextResponse.json(
        { error: "No Notion database selected" },
        { status: 400 },
      );
    }

    // Build children blocks based on note type
    let children: any[];
    switch (noteType) {
      case "meeting":
        children = buildMeetingBlocks(extracted);
        break;
      case "todo":
        children = buildTodoBlocks(extracted);
        break;
      case "study":
        children = buildStudyBlocks(extracted);
        break;
      default:
        children = buildGeneralBlocks(extracted);
    }

    const body = {
      parent: { database_id: conn.notion_database_id },
      properties: buildProperties(noteType, extracted),
      children,
    };

    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.message ?? "Notion save failed" },
        { status: 500 },
      );
    }

    const page = await res.json();
    return NextResponse.json({
      success: true,
      pageId: page.id,
      pageUrl: page.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error saving to Notion";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
