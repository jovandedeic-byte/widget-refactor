"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ElectricBorder from "@/components/ElectricBorder";
import type { HotColdGame } from "./types";
import type { HotColdFilter } from "./use-hot-cold";
import Image from "next/image";

interface HotColdGameCardProps {
  game: HotColdGame;
  index: number;
  filter: HotColdFilter;
  gameUrl?: string;
  onPlay?: (game: HotColdGame) => void;
}

export function HotColdGameCard({
  game,
  index,
  filter,
  gameUrl,
  onPlay,
}: HotColdGameCardProps) {
  const [desktopImageError, setDesktopImageError] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);
  const isHot = filter === "hot";
  const rtpDisplay = game.rtp != null ? `${Number(game.rtp).toFixed(2)}%` : "—";
  const desktopSrc = desktopImageError ? "/placeholder.svg" : game.desktopImage;
  const mobileSrc = mobileImageError
    ? "/placeholder.svg"
    : game.mobileImage || game.desktopImage;
  const isRemoteDesktop = /^https?:\/\//i.test(desktopSrc);
  const isRemoteMobile = /^https?:\/\//i.test(mobileSrc);

  const resolveUrl = () => {
    if (!gameUrl) return undefined;
    return gameUrl.replace("{gameId}", String(game.id));
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.(game);
    const url = resolveUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const electricColor = isHot ? "#e8843c" : "#4a9eff";
  const rtpColor = isHot ? "text-emerald-400" : "text-rose-400";
  return (
    <article
      className="relative shrink-0 w-62.5 sm:w-65 md:w-70 group cursor-pointer select-none transition-transform duration-200 hover:scale-[1.02]"
      role="group"
      aria-label={`${game.name} - RTP ${rtpDisplay}`}
    >
      <div
        className={`border ${isHot ? "border-[#e8843c]" : "border-[#4a9eff]"} rounded-2xl`}
      >
        <div className="relative rounded-2xl overflow-hidden bg-black/60 p-4">
          <div
            className="relative w-full rounded-xl mb-3 overflow-hidden"
            style={{ aspectRatio: "16/12" }}
          >
            <Image
              src={mobileSrc}
              alt={game.name}
              fill
              sizes="(max-width: 639px) 100vw"
              className="object-cover sm:hidden"
              onError={() => {
                setMobileImageError(true);
              }}
            />
            <Image
              src={desktopSrc}
              alt={game.name}
              fill
              sizes="(min-width: 640px) 100vw"
              unoptimized={isRemoteDesktop}
              className="hidden object-cover sm:block"
              onError={() => {
                setDesktopImageError(true);
              }}
            />
          </div>
          <h3 className="text-sm font-bold text-white truncate mb-1 uppercase tracking-tight">
            {game.name}
          </h3>
          <div className={`text-sm font-semibold mb-1 ${rtpColor}`}>
            {rtpDisplay} RTP {isHot ? "↑" : "↓"}
          </div>
          {game.gameVendorName && (
            <p className="text-xs text-gray-400 mb-3 truncate">
              {game.gameVendorName}
            </p>
          )}
          <Button
            size="sm"
            className="w-full rounded-lg font-bold text-xs uppercase gap-1.5 cursor-pointer border-0"
            style={{
              background: "linear-gradient(to right, #28a745, #218838)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(40, 167, 69, 0.4)",
            }}
            aria-label={`Play ${game.name}`}
            onClick={handlePlay}
          >
            <Play className="h-3.5 w-3.5" />
            Play now
          </Button>
        </div>
      </div>
    </article>
  );
}
