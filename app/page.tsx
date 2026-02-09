import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { RecommendationWidget } from "@/components/recommendation-widget";
import type { Language } from "@/lib/i18n";

const CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID || "0b7e7dee87b1c3b98e72131173dfbbbf";
const PLAYER_TOKEN = process.env.NEXT_PUBLIC_PLAYER_TOKEN || null;
const THEME = process.env.NEXT_PUBLIC_THEME || "dark";
const LANGUAGE = (process.env.NEXT_PUBLIC_LANGUAGE || "en") as Language;

export default function Home() {
  return (
    <>
    <RecommendationWidget
      clientId={CLIENT_ID}
      playerToken={PLAYER_TOKEN}
      // theme={THEME}
      // language={LANGUAGE}
    />
    <FloatingChatWidget
      clientId={CLIENT_ID}
      playerToken={PLAYER_TOKEN}
      theme={THEME}
      language={LANGUAGE}
    />
    </>
  );
}
