"use client";

import { useState, useEffect } from "react";
import {
  HotColdWidget,
  type HotColdSettings,
} from "@/components/hot-cold-widget";

interface HotColdConfig {
  clientId: string;
  playerToken?: string | null;
  hotColdSettings: HotColdSettings;
}

export default function HotColdEmbedPage() {
  const [config, setConfig] = useState<HotColdConfig | null>(null);

  useEffect(() => {
    let initialized = false;

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type === "gamblio-hotcold-init" && data.clientId) {
        initialized = true;
        setConfig({
          clientId: data.clientId,
          playerToken: data.playerToken || null,
          hotColdSettings: data.hotColdSettings || {},
        });
      }
    }

    window.addEventListener("message", handleMessage);

    // Signal to parent that we're ready
    window.parent.postMessage({ type: "gamblio-hotcold-ready" }, "*");
    const interval = setInterval(() => {
      if (!initialized) {
        window.parent.postMessage({ type: "gamblio-hotcold-ready" }, "*");
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
    <HotColdWidget
      clientId={config.clientId}
      playerToken={config.playerToken}
      settings={config.hotColdSettings}
    />
  );
}
