"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Game } from "./types";

interface GameCardProps {
  game: Game;
  index: number;
}

const tagConfig: Record<
  string,
  { bg: string; text: string; border: string; glow: string }
> = {
  HOT: {
    bg: "linear-gradient(135deg, #dc2626 0%, #f97316 100%)",
    text: "#fff",
    border: "rgba(249, 115, 22, 0.5)",
    glow: "rgba(249, 115, 22, 0.3)",
  },
  NEW: {
    bg: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
    text: "#fff",
    border: "rgba(6, 182, 212, 0.5)",
    glow: "rgba(6, 182, 212, 0.3)",
  },
  POPULAR: {
    bg: "linear-gradient(135deg, #7c3aed 0%, #c026d3 100%)",
    text: "#fff",
    border: "rgba(192, 38, 211, 0.5)",
    glow: "rgba(192, 38, 211, 0.3)",
  },
  JACKPOT: {
    bg: "linear-gradient(135deg, #d97706 0%, #fbbf24 100%)",
    text: "#1a0a00",
    border: "rgba(251, 191, 36, 0.6)",
    glow: "rgba(251, 191, 36, 0.4)",
  },
};

export function GameCard({ game, index }: GameCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tag = game.tag ? tagConfig[game.tag] : null;

  return (
    <motion.article
      className="relative shrink-0 w-[260px] sm:w-[280px] md:w-[300px] group cursor-pointer select-none"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      tabIndex={0}
      role="group"
      aria-label={`${game.title} - ${game.genre}`}
    >
      <motion.div
        className="relative rounded-2xl overflow-hidden"
        animate={{
          scale: isHovered ? 1.05 : 1,
          y: isHovered ? -8 : 0,
        }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        style={{
          boxShadow: isHovered
            ? `0 24px 60px -10px rgba(218, 165, 32, 0.25), 0 0 50px -15px rgba(218, 165, 32, 0.15), 0 0 0 1px rgba(218, 165, 32, 0.2)`
            : "0 8px 30px -6px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(218, 165, 32, 0.06)",
        }}
      >
        {/* Card gold border frame */}
        <div
          className="absolute inset-0 rounded-2xl z-10 pointer-events-none transition-all duration-500"
          style={{
            border: isHovered
              ? "1.5px solid rgba(218, 165, 32, 0.5)"
              : "1px solid rgba(218, 165, 32, 0.1)",
          }}
        />

        {/* Shimmer sweep on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute inset-0 z-30 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(218, 165, 32, 0.08) 45%, rgba(218, 165, 32, 0.15) 50%, rgba(218, 165, 32, 0.08) 55%, transparent 60%)",
                }}
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{
                  duration: 1.2,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                  repeatDelay: 2.5,
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cover image */}
        <div className="relative aspect-3/4 w-full">
          <Image
            src={game.cover || "/placeholder.svg"}
            alt={`${game.title} cover art`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 260px, (max-width: 768px) 280px, 300px"
            priority={index < 3}
            unoptimized
          />

          {/* Rich dark gradient overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-[hsl(240,15%,3%)] via-[hsl(240,15%,3%)]/30 to-transparent" />

          {/* Subtle warm vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 50%, rgba(10, 5, 0, 0.5) 100%)",
            }}
          />

          {/* Gold accent top bar */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: isHovered
                ? "linear-gradient(90deg, transparent, rgb(218, 165, 32), transparent)"
                : "linear-gradient(90deg, transparent, rgba(218, 165, 32, 0.3), transparent)",
            }}
            animate={{ opacity: isHovered ? 1 : 0.5 }}
            transition={{ duration: 0.4 }}
          />

          {/* Casino tag badge */}
          {game.tag && tag && (
            <div
              className="absolute top-3 right-3 z-20 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{
                background: tag.bg,
                color: tag.text,
                border: `1px solid ${tag.border}`,
                boxShadow: `0 2px 12px ${tag.glow}`,
              }}
            >
              {game.tag}
            </div>
          )}

          {/* Hover overlay with buttons */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute inset-0 z-20 flex items-center justify-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  background:
                    "linear-gradient(to top, hsl(240, 15%, 3%) 0%, rgba(218, 165, 32, 0.05) 50%, transparent 100%)",
                }}
              >
                {/* Play button - gold gradient */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, delay: 0.06 }}
                >
                  <Button
                    size="sm"
                    className="rounded-full px-5 text-xs font-bold tracking-wide uppercase gap-1.5 border-0 cursor-pointer"
                    style={{
                      background:
                        "linear-gradient(135deg, #d97706 0%, #fbbf24 50%, #d97706 100%)",
                      color: "#1a0a00",
                      boxShadow:
                        "0 4px 20px rgba(218, 165, 32, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                    }}
                    aria-label={`Play ${game.title}`}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </Button>
                </motion.div>
                {/* Demo button - outlined */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3, delay: 0.13 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full px-5 text-xs font-semibold tracking-wide uppercase gap-1.5 bg-transparent cursor-pointer hover:bg-primary!"
                    style={{
                      borderColor: "rgba(218, 165, 32, 0.35)",
                      color: "rgb(218, 185, 100)",
                    }}
                    aria-label={`Try ${game.title} demo`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    Demo
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom card info */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
            <div className="flex items-center gap-2 mb-2">
              {/* <span
                className="inline-block rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: "rgba(218, 165, 32, 0.12)",
                  color: "rgb(218, 185, 100)",
                  border: "1px solid rgba(218, 165, 32, 0.2)",
                }}
              >
                {game.genre}
              </span> */}
            
            </div>
            <h3 className="text-base font-bold tracking-tight leading-tight text-balance"
              style={{ color: "rgb(240, 230, 210)" }}
            >
              {game.title}
            </h3>
          </div>
        </div>
      </motion.div>
    </motion.article>
  );
}
