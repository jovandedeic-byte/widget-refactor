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

export interface PersistedSession {
  chatId: string;
  playerToken: string | null;
  playerName: string | null;
  playerId: number | null;
  status: "active" | "closed";
  hasSubmittedRating: boolean;
  timestamp: number;
}
