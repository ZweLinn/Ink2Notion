import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeNotionCode } from "@/lib/notion";
import { supabaseAdmin } from "@/lib/supabase";
import { authOptions } from "@/lib/auth-options";

/**
 * Ensure the user has a row in public.users so the foreign key
 * constraint on notion_connections(user_id → users(id)) is satisfied.
 */
async function ensureUserExists(userId: string, email: string | null, name: string | null) {
  if (!email) return;
  const { error } = await supabaseAdmin.from("users").upsert(
    {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) {
    console.error("ensureUserExists error:", error);
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
  }

  // Verify CSRF state token from cookie
  const cookieStore = await cookies();
  const storedState = cookieStore.get("notion_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    cookieStore.delete("notion_oauth_state");
    return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
  }

  // Consume the state token
  cookieStore.delete("notion_oauth_state");

  try {
    const token = await exchangeNotionCode(code);

    if (!session.user.id) {
      console.error("Notion callback error: session.user.id is missing");
      return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
    }

    // Ensure the user exists in public.users (handles edge cases where
    // the signIn callback's upsertOAuthUser might have failed silently)
    await ensureUserExists(
      session.user.id,
      session.user.email ?? null,
      session.user.name ?? null,
    );

    const { error: upsertError } = await supabaseAdmin
      .from("notion_connections")
      .upsert(
        {
          user_id: session.user.id,
          access_token: token.access_token,
          workspace_id: token.workspace_id,
          workspace_name: token.workspace_name,
          bot_id: token.bot_id,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      console.error("Notion callback upsert error:", upsertError);
      return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
    }

    return NextResponse.redirect(
      new URL("/dashboard?notion=connected", req.url),
    );
  } catch (err) {
    console.error("Notion callback error:", err);
    return NextResponse.redirect(new URL("/dashboard?notion=error", req.url));
  }
}
