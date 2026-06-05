export const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";
export const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";
export const NOTION_VERSION = "2022-06-28";

export function getNotionOAuthURL(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: "code",
    owner: "user",
    redirect_uri: process.env.NOTION_REDIRECT_URI!,
    state,
  });
  return `${NOTION_AUTH_URL}?${params.toString()}`;
}

export async function exchangeNotionCode(code: string): Promise<{
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  bot_id: string;
}> {
  const credentials = Buffer.from(
    `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.NOTION_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error_description ?? "Notion OAuth failed");
  }

  return res.json();
}
