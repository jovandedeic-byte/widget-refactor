"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import type { Language } from "@/lib/i18n";

const BUTTON_SIZE = 80;
const OPEN_WIDTH = 500;
const OPEN_HEIGHT = 800;

interface ChatConfig {
  clientId: string;
  playerToken?: string | null;
  language?: Language;
}

function notifyParentSize(width: number, height: number) {
  window.parent.postMessage(
    { type: "gamblio-chat-resize", width, height },
    "*"
  );
}

export default function EmbedPage() {
  const [config, setConfig] = useState<ChatConfig | null>(null);

  useEffect(() => {
    let initialized = false;

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type === "gamblio-chat-init" && data.clientId) {
        initialized = true;
        setConfig({
          clientId: data.clientId,
          playerToken: data.playerToken || null,
          language: data.language === "me" ? "me" : "en",
        });
      }
    }

    window.addEventListener("message", handleMessage);

    window.parent.postMessage({ type: "gamblio-chat-ready" }, "*");
    const interval = setInterval(() => {
      if (!initialized) {
        window.parent.postMessage({ type: "gamblio-chat-ready" }, "*");
      } else {
        clearInterval(interval);
      }
    }, 500);

    notifyParentSize(BUTTON_SIZE, BUTTON_SIZE);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, []);

  const closeTimer = useRef<ReturnType<typeof setTimeout>>(null);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (isOpen) {
      // Expand instantly so the widget animation has room
      notifyParentSize(OPEN_WIDTH, OPEN_HEIGHT);
    } else {
      // Wait for the 300ms close animation to finish, then shrink
      closeTimer.current = setTimeout(() => {
        notifyParentSize(BUTTON_SIZE, BUTTON_SIZE);
      }, 300);
    }
  }, []);

  if (!config) return null;

  return (
    <FloatingChatWidget
      clientId={config.clientId}
      playerToken={config.playerToken}
      theme="dark"
      language={config.language}
      onOpenChange={handleOpenChange}
    />
  );
}
