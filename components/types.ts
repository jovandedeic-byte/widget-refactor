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
export interface Game {
  id: string;
  title: string;
  genre?: string | null;
  cover: string;
  accentColor: string;
  tag?: "HOT" | "NEW" | "POPULAR" | "JACKPOT";
}

// Recommendation widget (customization via postMessage)
export interface RecommendationSettings {
  displayMode?: "stack" | "carousel";
  backgroundType?: "image" | "video" | "gradient" | "transparent";
  imageIndex?: number;
  imageExtension?: "jpg" | "png" | "svg";
  videoIndex?: number;
  gradientDirection?: string;
  gradientColors?: [string, string];
  withHeadline?: boolean;
  headlineTitle?: string;
  headlineSubtitle?: string;
  // Game URL patterns - use {gameId} as placeholder
  // e.g., "https://casino.com/games/{gameId}" or "https://casino.com/play/{gameId}"
  gameUrl?: string;
  demoUrl?: string;
}

export interface RecommendationWidgetProps {
  clientId: string;
  playerToken?: string | null;
  settings?: RecommendationSettings;
}

// API response game type (from recommendation backend)
export interface ApiGame {
  id?: string | number;
  gameId?: string | number;
  gameName?: string;
  name?: string;
  gameImage?: string;
  logo?: string;
  [key: string]: unknown;
}
