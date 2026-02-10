"use client";

import { useState, useEffect } from "react";
import {
  RecommendationWidget,
  type RecommendationSettings,
} from "@/components/recommendation-widget";

interface RecommendationConfig {
  clientId: string;
  playerToken?: string | null;
  recommendationSettings: RecommendationSettings;
}

export default function RecommendationEmbedPage() {
  const [config, setConfig] = useState<RecommendationConfig | null>(null);

  useEffect(() => {
    let initialized = false;

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type === "gamblio-recommendation-init" && data.clientId) {
        initialized = true;
        setConfig({
          clientId: data.clientId,
          playerToken: data.playerToken || null,
          recommendationSettings: data.recommendationSettings || {},
        });
      }
    }

    window.addEventListener("message", handleMessage);

    // Signal to parent that we're ready
    window.parent.postMessage({ type: "gamblio-recommendation-ready" }, "*");
    const interval = setInterval(() => {
      if (!initialized) {
        window.parent.postMessage({ type: "gamblio-recommendation-ready" }, "*");
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, []);

  if (!config) return null;

  return (
    <main className="w-full h-full min-h-screen">
      <RecommendationWidget
        clientId={config.clientId}
        playerToken={config.playerToken}
        settings={config.recommendationSettings}
      />
    </main>
  );
}
