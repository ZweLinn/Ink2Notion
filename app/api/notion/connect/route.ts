import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getNotionOAuthURL } from "@/lib/notion";
import crypto from "crypto";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // state = random token to prevent CSRF
  const state = crypto.randomBytes(16).toString("hex");
  const url = getNotionOAuthURL(state);

  // TODO Phase 4: store state in Supabase or signed cookie for verification
  return NextResponse.redirect(url);
}
