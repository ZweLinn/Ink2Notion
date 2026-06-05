import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getNotionOAuthURL } from "@/lib/notion";
import crypto from "crypto";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Generate random state token for CSRF protection
  const state = crypto.randomBytes(16).toString("hex");

  // Store state in an httpOnly cookie (10 min expiry)
  const cookieStore = await cookies();
  cookieStore.set("notion_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const url = getNotionOAuthURL(state);
  return NextResponse.redirect(url);
}
