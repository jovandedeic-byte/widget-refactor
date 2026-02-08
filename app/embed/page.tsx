"use client";

import { useState, useEffect } from "react";
import { EmbedChatWidget } from "@/components/embed-chat-widget";
import type { Language } from "@/lib/i18n";

interface ChatConfig {
  clientId: string;
  playerToken?: string;
  language?: Language;
}

export default function EmbedPage() {
  const [config, setConfig] = useState<ChatConfig | null>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type === "gamblio-chat-init" && data.clientId) {
        setConfig({
          clientId: data.clientId,
          playerToken: data.playerToken || null,
          language: data.language === "me" ? "me" : "en",
        });
      }
    }

    window.addEventListener("message", handleMessage);

    // Signal to parent that iframe is ready to receive config
    window.parent.postMessage({ type: "gamblio-chat-ready" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
        Initializing...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <EmbedChatWidget
        clientId={config.clientId}
        playerToken={config.playerToken}
        language={config.language}
      />
    </div>
  );
}
