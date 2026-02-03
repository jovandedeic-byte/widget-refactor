export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachmentUrl?: string | null;
  unix?: number | null;
  deliveredAt?: number | null;
  seenBy?: Array<{ seen_at: number }> | null;
}

export interface UserInfo {
  name: string;
  email: string;
}
