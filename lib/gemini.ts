const MODEL = "gemini-2.0-flash";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000; // 1 second initial backoff

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 1,
): Promise<Response> {
  const res = await fetch(url, options);

  if (res.status === 429 && attempt <= MAX_RETRIES) {
    // Use Retry-After header if provided, otherwise exponential backoff
    const retryAfter = res.headers.get("Retry-After");
    const delayMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : BASE_DELAY_MS * Math.pow(2, attempt - 1);

    console.warn(
      `Gemini API rate limited (429). Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`,
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithRetry(url, options, attempt + 1);
  }

  return res;
}

export async function extractHandwriting(
  base64Image: string,
  mimeType: string,
  noteType: "general" | "meeting" | "todo" | "study" = "general",
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

  const res = await fetchWithRetry(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Image } },
              {
                text:
                  prompts[noteType] +
                  "\n\nRespond ONLY with valid JSON. No markdown, no explanation.",
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1 },
      }),
    },
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    // Provide a clearer message for rate limiting
    if (res.status === 429) {
      throw new Error(
        `Gemini API rate limit exceeded after ${MAX_RETRIES} retries. Please wait 1-2 minutes before trying again. The free tier allows ~30 requests per minute.`,
      );
    }
    throw new Error(
      `Gemini API error (${res.status}): ${res.statusText}${errorBody ? ` — ${errorBody}` : ""}`,
    );
  }

  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }
}
