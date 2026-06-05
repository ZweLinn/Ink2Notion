import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { extractHandwriting } from "@/lib/gemini";
import { NoteType } from "@/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const noteType = (formData.get("noteType") as NoteType) ?? "general";

    if (!file) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large — maximum size is 10 MB" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const extracted = await extractHandwriting(base64, file.type, noteType);

    return NextResponse.json({
      success: true,
      noteType,
      extracted,
      filename: file.name,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error processing image";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
