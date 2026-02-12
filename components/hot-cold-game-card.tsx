"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import ElectricBorder from "@/components/ElectricBorder";
import type { HotColdGame } from "./types";
import type { HotColdFilter } from "./use-hot-cold";

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
  const isHot = filter === "hot";
  const rtpDisplay =
    game.rtp != null ? `${Number(game.rtp).toFixed(2)}%` : "—";

  const resolveUrl = () => {
    if (!gameUrl) return undefined;
    return gameUrl.replace("{gameId}", game.id);
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
    <motion.article
      className="relative shrink-0 w-[250px] sm:w-[260px] md:w-[280px] group cursor-pointer select-none"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: "easeOut",
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      role="group"
      aria-label={`${game.title} - RTP ${rtpDisplay}`}
    >
      <ElectricBorder
        color={electricColor}
        speed={1.2}
        chaos={0.1}
        borderRadius={16}
      >
        <div className="relative rounded-2xl overflow-hidden bg-black/60 p-4">
          <img
            src={game.cover || "/placeholder.svg"}
            alt={game.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
            }}
            className="w-full rounded-xl mb-3 object-cover"
            style={{ aspectRatio: "16/12" }}
          />

          <h3 className="text-sm font-bold text-white truncate mb-1 uppercase tracking-tight">
            {game.title}
          </h3>

          <div
            className={`text-sm font-semibold mb-1 ${rtpColor}`}
          >
            {rtpDisplay} RTP {isHot ? "↑" : "↓"}
          </div>

          {game.vendorName && (
            <p className="text-xs text-gray-400 mb-3 truncate">
              {game.vendorName}
            </p>
          )}

          <Button
            size="sm"
            className="w-full rounded-lg font-bold text-xs uppercase gap-1.5 cursor-pointer border-0"
            style={{
              background:
                "linear-gradient(to right, #28a745, #218838)",
              color: "#fff",
              boxShadow: "0 4px 12px rgba(40, 167, 69, 0.4)",
            }}
            aria-label={`Play ${game.title}`}
            onClick={handlePlay}
          >
            <Play className="h-3.5 w-3.5" />
            Play now
          </Button>
        </div>
      </ElectricBorder>
    </motion.article>
  );
}
