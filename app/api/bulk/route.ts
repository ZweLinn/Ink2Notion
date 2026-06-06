import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { extractHandwriting } from "@/lib/gemini";
import { NoteType } from "@/types";
import { authOptions } from "@/lib/auth-options";

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const noteType = (formData.get("noteType") as NoteType) ?? "general";

    if (!files.length) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} files at a time` },
        { status: 400 },
      );
    }

    // Process sequentially with a delay between each to stay within
    // Gemini free tier limits (~30 requests per minute = 2s spacing).
    const MIN_INTERVAL_MS = 3000;
    const results = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];

      // Wait before each subsequent request to avoid rate limiting
      if (idx > 0) {
        await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS));
      }
      try {
        // Validate per file
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({
            success: false,
            filename: file.name,
            error: "Unsupported file type",
          });
          continue;
        }

        if (file.size > MAX_FILE_SIZE) {
          results.push({
            success: false,
            filename: file.name,
            error: "File too large — maximum size is 10 MB",
          });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64 = buffer.toString("base64");
        const extracted = await extractHandwriting(base64, file.type, noteType);

        results.push({
          success: true,
          filename: file.name,
          noteType,
          extracted,
        });
      } catch (err) {
        results.push({
          success: false,
          filename: file.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error processing batch";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
