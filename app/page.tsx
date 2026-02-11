import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { RecommendationWidget } from "@/components/recommendation-widget";
import type { Language } from "@/lib/i18n";

// Client ID and player token come from the embedding site via postMessage (see /embed).
// When opening this app directly, widgets get no identity and will not connect;
// use the embed URLs in an iframe and send gamblio-chat-init / gamblio-recommendation-init.
const THEME = process.env.NEXT_PUBLIC_THEME || "dark";
const LANGUAGE = (process.env.NEXT_PUBLIC_LANGUAGE || "en") as Language;

export default function Home () {
  return (
    <>
      <RecommendationWidget clientId="" playerToken={null} />
      <FloatingChatWidget
        clientId=""
        playerToken={null}
        theme={THEME}
        language={LANGUAGE}
      />
    </>
  );
}
