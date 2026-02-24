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
  /** Epoch ms when swearword cooldown expires (null = no active cooldown) */
  bumpExpiresAt?: number | null;
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

// Hot/Cold widget: game with RTP and vendor
export interface HotColdGame extends Game {
  rtp?: number | null;
  vendorName?: string | null;
}

// Get-vendors API response (hot/cold RTP list)
export interface GetVendorsVendor {
  id?: string | number;
  name?: string;
  data?: { id?: string | number; name?: string };
}

export interface GetVendorsGame {
  id?: string | number;
  name?: string;
  rtp?: number;
  desktop_image?: string;
  game_image?: string;
  logo?: string;
  image?: string;
  game_vendor_id?: string | number;
  game_vendor_name?: string;
  data?: {
    id?: string | number;
    name?: string;
    rtp?: number;
    desktop_image?: string;
    game_image?: string;
    logo?: string;
    image?: string;
    game_vendor_id?: string | number;
    game_vendor_name?: string;
  };
}

export interface GetVendorsResponse {
  vendors?: GetVendorsVendor[];
  games?: GetVendorsGame[];
  data?: { cards?: unknown[] };
  cards?: unknown[];
}

// Hot/Cold widget settings (customization via postMessage)
export interface HotColdSettings {
  backgroundType?: "image" | "video" | "gradient" | "transparent" | "vortex";
  glow?: boolean;
  hotVideoIndex?: number;
  hotImageIndex?: number;
  hotGradientColors?: [string, string];
  hotGradientDirection?: string;
  coldVideoIndex?: number;
  coldImageIndex?: number;
  coldGradientColors?: [string, string];
  coldGradientDirection?: string;
  videoIndex?: number;
  imageIndex?: number;
  imageExtension?: "jpg" | "png";
  gradientColors?: [string, string];
  gradientDirection?: string;
  /** Play URL pattern, use {gameId} as placeholder */
  gameUrl?: string;
}

export interface HotColdWidgetProps {
  clientId: string;
  playerToken?: string | null;
  settings?: HotColdSettings;
}
