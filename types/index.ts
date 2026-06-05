export type NoteType = "general" | "meeting" | "todo" | "study";

export interface NotionConnection {
  id: string;
  user_id: string;
  access_token: string;
  workspace_id: string;
  workspace_name: string;
  notion_database_id: string | null;
  connected_at: string;
}

export interface ProcessedNote {
  noteType: NoteType;
  imageUrl?: string;
  extracted: Record<string, unknown>;
}

export interface UploadResult {
  success: boolean;
  note?: ProcessedNote;
  error?: string;
}
