const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function extractHandwriting(
  base64Image: string,
  mimeType: string,
  noteType: "general" | "meeting" | "todo" | "study" = "general"
): Promise<Record<string, unknown>> {
  const prompts: Record<string, string> = {
    general: `Extract all handwritten text from this image. Return a JSON object with:
      { "title": "...", "content": "...", "tags": ["..."] }`,
    meeting: `Extract handwritten meeting notes. Return JSON:
      { "title": "...", "date": "...", "attendees": ["..."], "agenda": ["..."], "action_items": ["..."], "notes": "..." }`,
    todo: `Extract handwritten to-do items. Return JSON:
      { "title": "...", "items": [{ "task": "...", "priority": "high|medium|low", "done": false }] }`,
    study: `Extract handwritten study notes. Return JSON:
      { "title": "...", "subject": "...", "key_concepts": ["..."], "notes": "...", "questions": ["..."] }`,
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: base64Image } },
            { text: prompts[noteType] + "\n\nRespond ONLY with valid JSON. No markdown, no explanation." },
          ],
        },
      ],
      generationConfig: { temperature: 0.1 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}
