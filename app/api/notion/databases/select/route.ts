import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { NOTION_VERSION } from "@/lib/notion";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { databaseId } = (await req.json()) as { databaseId: string };

    if (!databaseId) {
      return NextResponse.json(
        { error: "databaseId is required" },
        { status: 400 },
      );
    }

    // Get the user's Notion connection
    const { data: conn, error } = await supabaseAdmin
      .from("notion_connections")
      .select("access_token")
      .eq("user_id", session.user.id)
      .single();

    if (error || !conn) {
      return NextResponse.json(
        { error: "Notion not connected" },
        { status: 400 },
      );
    }

    // Validate that the database exists and is accessible
    const validateRes = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          "Notion-Version": NOTION_VERSION,
        },
      },
    );

    if (!validateRes.ok) {
      return NextResponse.json(
        { error: "Database not found or not accessible" },
        { status: 400 },
      );
    }

    // Save the selection
    const { error: updateError } = await supabaseAdmin
      .from("notion_connections")
      .update({ notion_database_id: databaseId })
      .eq("user_id", session.user.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save database selection" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, databaseId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error selecting database";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
