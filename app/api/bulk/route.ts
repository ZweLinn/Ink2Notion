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
  const files = formData.getAll("images") as File[];
  const noteType = (formData.get("noteType") as NoteType) ?? "general";

  if (!files.length) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  // Process sequentially to stay within Gemini free tier limits
  const results = [];
  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const extracted = await extractHandwriting(base64, file.type, noteType);
      results.push({ success: true, filename: file.name, noteType, extracted });
    } catch (err) {
      results.push({
        success: false,
        filename: file.name,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ results });
}
