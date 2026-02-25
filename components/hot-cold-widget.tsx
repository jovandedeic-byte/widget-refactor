"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Snowflake,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HotColdGameCard } from "@/components/hot-cold-game-card";
import type { HotColdGame, HotColdWidgetProps } from "@/components/types";
import { useHotCold, type HotColdPeriod } from "./use-hot-cold";
import LightVortex from "./light-vortex";

export type { HotColdSettings, HotColdWidgetProps } from "@/components/types";

const PERIODS: { value: HotColdPeriod; label: string }[] = [
  { value: "daily", label: "24H" },
  { value: "weekly", label: "7D" },
  { value: "monthly", label: "30D" },
];

export function HotColdWidget({
  clientId,
  playerToken,
  settings = {},
}: HotColdWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const {
    games,
    isLoading,
    error,
    period,
    setPeriod,
    filter,
    setFilter,
    trackClick,
  } = useHotCold({
    clientId,
    playerToken,
    containerRef: scrollRef,
  });

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
  }, [games]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 350);
  };

  const handlePlay = (game: HotColdGame) => {
    trackClick(game.id);
  };

  if (isLoading) {
    return (
      <section
        className="relative w-full h-full min-h-75 flex items-center justify-center rounded-2xl bg-linear-to-br from-slate-900 to-slate-800"
        aria-label="Loading hot/cold games"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="relative w-full h-full min-h-75 flex items-center justify-center rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 text-muted-foreground"
        aria-label="Error"
      >
        {error}
      </section>
    );
  }

  const title = "LIVE RTP HEATMAP";
  const isHot = filter === "hot";
  const gameUrl = settings.gameUrl;
  const bgType = settings.backgroundType;

  // Determine background style (only for gradient / default)
  const sectionBg =
    bgType === "gradient" || !bgType
      ? isHot
        ? "linear-gradient(135deg, rgba(30, 20, 10, 0.98) 0%, rgba(60, 30, 10, 0.95) 100%)"
        : "linear-gradient(135deg, rgba(10, 20, 40, 0.98) 0%, rgba(20, 35, 60, 0.95) 100%)"
      : bgType === "vortex"
        ? "#000"
        : undefined;

  // Inner content (shared by all background modes)
  const widgetContent = (
    <>
      <h2 className="text-center text-2xl md:text-3xl font-extrabold uppercase tracking-tight mt-6 mb-6 text-white/95 px-4 bg-transparent">
        {title}
      </h2>

      {/* Controls: toggle + period selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 md:gap-6 mb-6 px-4">
        <div />
        {/* Hot / Cold toggle */}
        <motion.div
          className="relative flex items-center h-11.5 rounded-[23px] cursor-pointer overflow-hidden p-0"
          onClick={() => setFilter(isHot ? "cold" : "hot")}
          role="switch"
          aria-checked={isHot}
          aria-label="Toggle hot or cold games"
          whileTap={{ scale: 0.97 }}
        >
          {/* HOT label */}
          <motion.div
            className="relative flex items-center gap-2 h-full z-1 pointer-events-none whitespace-nowrap font-medium text-white/90 pl-5 pr-9"
            style={{
              order: 1,
              fontSize: "0.85em",
              letterSpacing: "0.01em",
              background: "hsla(25, 79%, 57%, 0.5)",
              borderRadius: "23px 0 0 23px",
              border: "2px solid #e8843c",
              borderRight: "none",
            }}
            animate={{ opacity: isHot ? 1 : 0.6 }}
            transition={{ duration: 0.3 }}
          >
            <Flame
              className="h-4 w-4"
              style={{
                color: "#ff9a4a",
                filter: "drop-shadow(0 0 3px rgba(255, 154, 74, 0.5))",
              }}
            />
            <span
              style={{
                color: "#ff9a4a",
                fontSize: "1.15em",
                filter: "drop-shadow(0 0 3px rgba(255, 154, 74, 0.5))",
              }}
            >
              HOT
            </span>
          </motion.div>

          {/* Toggle knob */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 shrink-0"
            style={{
              order: 2,
              width: 60,
              height: 36,
              borderRadius: 18,
              background: "linear-gradient(180deg, #4a4d55 0%, #35383f 100%)",
              boxShadow:
                "0 2px 8px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: 28,
                height: 28,
                background: "linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%)",
                boxShadow:
                  "0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.8)",
              }}
              initial={false}
              animate={{ left: isHot ? 4 : "calc(100% - 32px)" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>

          {/* COLD label */}
          <motion.div
            className="relative flex items-center gap-2 h-full z-1 pointer-events-none whitespace-nowrap font-medium text-white/90 pr-5 pl-9"
            style={{
              order: 3,
              fontSize: "0.85em",
              letterSpacing: "0.01em",
              background: "hsla(216, 79%, 57%, 0.5)",
              borderRadius: "0 23px 23px 0",
              border: "2px solid #4a9eff",
              borderLeft: "none",
            }}
            animate={{ opacity: isHot ? 0.6 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Snowflake
              className="h-4 w-4"
              style={{
                color: "#5cb8ff",
                filter: "drop-shadow(0 0 3px rgba(92, 184, 255, 0.5))",
              }}
            />
            <span
              style={{
                color: "#5cb8ff",
                fontSize: "1.15em",
                filter: "drop-shadow(0 0 3px rgba(92, 184, 255, 0.5))",
              }}
            >
              COLD
            </span>
          </motion.div>
        </motion.div>

        {/* Period selector */}
        <div
          className="flex rounded-[15px] overflow-hidden"
          style={{ background: "rgba(255, 255, 255, 0.1)" }}
        >
          {PERIODS.map((p) => {
            const isActive = period === p.value;
            return (
              <Button
                key={p.value}
                variant="ghost"
                onClick={() => setPeriod(p.value)}
                className="relative rounded-none border-none cursor-pointer font-semibold px-5 py-2.5 h-auto hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                style={{
                  color: isActive ? "#fff" : "#aaa",
                  transition: "all 0.3s ease",
                }}
                aria-pressed={isActive}
                aria-label={`Period: ${p.label}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="period-pill"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: 50,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      backgroundImage:
                        "radial-gradient(75% 50% at 50% 0%, rgba(255, 255, 255, 0.4), transparent), radial-gradient(75% 35% at 50% 80%, rgba(255, 255, 255, 0.2), transparent)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      boxShadow:
                        "inset 0 -2px 4px 1px rgba(0, 0, 0, 0.1), inset 0 -4px 4px 1px rgba(255, 255, 255, 0.1), inset 0 0 2px 1px rgba(255, 255, 255, 0.3), 0 1px 4px 1px rgba(0, 0, 0, 0.1), 0 1px 4px 1px rgba(0, 0, 0, 0.05)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="period-shine"
                    className="absolute pointer-events-none"
                    style={{
                      top: 1,
                      left: "50%",
                      transform: "translateX(-50%)",
                      borderRadius: 50,
                      width: "80%",
                      height: "40%",
                      backgroundImage:
                        "linear-gradient(to bottom, rgba(255, 255, 255, 0.4), transparent)",
                      opacity: 0.75,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Scroll area + cards */}
      <div className="relative flex-1 flex flex-col justify-center bg-transparent">
        <div className="hidden md:flex items-center justify-end gap-2 pr-4">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-2 border-white/50 text-white/90 hover:text-white hover:border-white/70 hover:bg-white/20 hover:scale-110 disabled:opacity-30 bg-white/10 cursor-pointer transition-all duration-300"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full border-2 border-white/50 text-white/90 hover:text-white hover:border-white/70 hover:bg-white/20 hover:scale-110 disabled:opacity-30 bg-white/10 cursor-pointer transition-all duration-300"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-6 bg-transparent"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
          role="list"
          aria-label="Game cards"
        >
          <AnimatePresence mode="popLayout">
            {games.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center min-w-full py-12 text-white/60"
              >
                No games in this period
              </motion.p>
            ) : (
              games.map((game, i) => (
                <motion.div
                  key={game.id}
                  layout
                  className="snap-start shrink-0 bg-transparent pl-4 md:pl-10"
                  role="listitem"
                  data-game-id={game.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    duration: 0.35,
                    delay: i * 0.04,
                    ease: "easeOut",
                  }}
                >
                  <HotColdGameCard
                    game={game}
                    index={i}
                    filter={filter}
                    gameUrl={gameUrl}
                    onPlay={handlePlay}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );

  // Vortex background: wraps all content
  if (bgType === "vortex") {
    return (
      <section
        className="relative w-full h-full rounded-2xl overflow-hidden min-h-100"
        aria-label="Live RTP heatmap"
      >
        <LightVortex hue={isHot ? "red" : "blue"}>{widgetContent}</LightVortex>
      </section>
    );
  }

  // Gradient (default) background
  return (
    <section
      className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden min-h-100"
      aria-label="Live RTP heatmap"
      style={{ background: sectionBg }}
    >
      {widgetContent}
    </section>
  );
}
