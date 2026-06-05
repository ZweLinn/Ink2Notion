import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeNotionCode } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
  }

  try {
    const token = await exchangeNotionCode(code);

    await supabaseAdmin.from("notion_connections").upsert(
      {
        user_id: session.user.id,
        access_token: token.access_token,
        workspace_id: token.workspace_id,
        workspace_name: token.workspace_name,
        bot_id: token.bot_id,
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.redirect(new URL("/dashboard?notion=connected", req.url));
  } catch (err) {
    console.error("Notion callback error:", err);
    return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
  }
}
