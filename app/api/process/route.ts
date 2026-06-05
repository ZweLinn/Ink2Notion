import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { extractHandwriting } from "@/lib/gemini";
import { NoteType } from "@/types";

export async function POST(req: NextRequest) {
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

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const extracted = await extractHandwriting(base64, file.type, noteType);

  return NextResponse.json({ success: true, noteType, extracted });
}
