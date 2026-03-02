import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { HotColdWidget } from "@/components/hot-cold-widget";
import { RecommendationWidget } from "@/components/recommendation-widget";
import type { Language } from "@/lib/i18n";

// Client ID and player token come from the embedding site via postMessage (see /embed).
// When opening this app directly, widgets get no identity and will not connect;
// use the embed URLs in an iframe and send gamblio-chat-init / gamblio-recommendation-init / gamblio-hotcold-init.
const THEME = process.env.NEXT_PUBLIC_THEME || "dark";
const LANGUAGE = (process.env.NEXT_PUBLIC_LANGUAGE || "en") as Language;
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID || "";

export default function Home() {
  return (
    <>
      {/* <RecommendationWidget
        clientId={CLIENT_ID}
        playerToken="269f54186d39f8da2c2837b42e8170b9e835aca3269b942c664eb3e5af0eef38615c424e06d5db3ccba30895f038226720c2feab6de37296710756fdf52456c4"
      /> */}
      <section className="w-full  mx-auto px-4 py-8">
        <HotColdWidget
          clientId={CLIENT_ID}
          playerToken={null}
          settings={{
            gameUrl: "https://example.com/play/{gameId}",
            backgroundType: "vortex",
          }}
        />
      </section>
      <FloatingChatWidget
        clientId={CLIENT_ID}
        playerToken={null}
        theme={THEME}
        language={LANGUAGE}
      />
    </>
  );
}
