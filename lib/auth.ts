import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

const SALT_ROUNDS = 10;

/* ─── Helpers ────────────────────────────────────────── */

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/* ─── User CRUD ──────────────────────────────────────── */

export async function getUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createCredentialsUser(
  email: string,
  password: string,
  name?: string
) {
  const normalizedEmail = email.toLowerCase().trim();
  const password_hash = await hashPassword(password);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      email: normalizedEmail,
      name: name ?? null,
      password_hash,
      provider: "credentials",
      id: crypto.randomUUID(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function upsertOAuthUser(user: {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  provider: string;
}) {
  if (!user.email) return null;

  const { data, error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email.toLowerCase().trim(),
        name: user.name,
        avatar_url: user.image,
        provider: user.provider,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" }
    )
    .select()
    .single();

  if (error) console.error("Supabase upsertOAuthUser error:", error);
  return data;
}
