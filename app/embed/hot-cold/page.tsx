"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  HotColdWidget,
  type HotColdSettings,
} from "@/components/hot-cold-widget";

const MIN_WIDTH = 320;
const MIN_HEIGHT = 600;

interface HotColdConfig {
  clientId: string;
  playerToken?: string | null;
  hotColdSettings: HotColdSettings;
}

function notifyParentSize(width: number | string, height: number) {
  window.parent.postMessage(
    {
      type: "gamblio-hotcold-resize",
      width,
      height,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
    },
    "*",
  );
}

export default function HotColdEmbedPage() {
  const [config, setConfig] = useState<HotColdConfig | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const publishSize = useCallback(() => {
    const root = rootRef.current;
    const measuredHeight = root
      ? Math.ceil(root.getBoundingClientRect().height)
      : document.documentElement.scrollHeight;

    notifyParentSize("100%", Math.max(MIN_HEIGHT, measuredHeight));
  }, []);

  useEffect(() => {
    let initialized = false;

    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (data?.type === "gamblio-hotcold-init" && data.clientId) {
        initialized = true;
        // Merge defaults with parent-provided settings (parent overrides)
        setConfig({
          clientId: data.clientId,
          playerToken: data.playerToken || null,
          hotColdSettings: {
            backgroundType: "vortex",
            ...data.hotColdSettings,
          },
        });
      }
    }

    window.addEventListener("message", handleMessage);

    // Signal to parent that we're ready
    window.parent.postMessage({ type: "gamblio-hotcold-ready" }, "*");
    notifyParentSize("100%", MIN_HEIGHT);
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

  useEffect(() => {
    if (!config) return;

    publishSize();
    const frame = window.requestAnimationFrame(publishSize);

    const observer = new ResizeObserver(() => {
      publishSize();
    });

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }
    observer.observe(document.body);
    observer.observe(document.documentElement);

    window.addEventListener("resize", publishSize);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", publishSize);
    };
  }, [config, publishSize]);

  if (!config) return null;

  return (
    <main ref={rootRef} className="w-full h-full min-h-screen p-4 md:p-6">
      <HotColdWidget
        clientId={config.clientId}
        playerToken={config.playerToken}
        settings={config.hotColdSettings}
      />
    </main>
  );
}
