const MODEL = "gemini-flash-latest";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const RATE_LIMIT_WAIT_MS = 60000; // Free tier rate-limit window (~30 req/min)

/** Add jitter (±25%) to prevent thundering herd when multiple requests retry simultaneously */
function addJitter(delayMs: number): number {
  const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 – 1.25
  return Math.round(delayMs * jitterFactor);
}

/** Status codes that warrant a retry (rate limiting or transient server errors) */
function isRetryable(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempt = 1,
): Promise<Response> {
  const res = await fetch(url, options);

  if (isRetryable(res.status) && attempt <= MAX_RETRIES) {
    // For 429 (rate limit), wait the full 60s rolling window so quota resets.
    // For other transient errors (502/503/504), use exponential backoff.
    const retryAfter = res.headers.get("Retry-After");
    const baseDelay =
      res.status === 429
        ? retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : RATE_LIMIT_WAIT_MS
        : BASE_DELAY_MS * Math.pow(2, attempt - 1);
    const delayMs = addJitter(baseDelay);

    console.warn(
      `Gemini API returned ${res.status}. Retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms...`,
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

    // Build a helpful rate-limit message
    if (res.status === 429) {
      throw new Error(
        `Gemini API rate limit exceeded after ${MAX_RETRIES} retries (free tier: ~30 req/min). Please wait 1-2 minutes before trying again, or upgrade to a paid tier for higher limits.`,
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
