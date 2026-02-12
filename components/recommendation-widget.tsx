"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/game-card";
import type { Game, RecommendationWidgetProps } from "@/components/types";
import { useRecommendation } from "./use-recommendation";

export type {
  RecommendationSettings,
  RecommendationWidgetProps,
} from "@/components/types";

export function RecommendationWidget({
  clientId,
  playerToken,
  settings = {},
}: RecommendationWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { games, isLoading, error, trackClick } = useRecommendation({
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

  const handlePlay = (game: Game) => {
    trackClick(game.id);
  };

  const handleDemo = (game: Game) => {
    trackClick(game.id);
  };

  if (isLoading) {
    return (
      <section
        className="relative w-full h-full min-h-[200px]"
        aria-label="Loading recommendations"
      >
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="relative w-full h-full min-h-[200px]"
        aria-label="Error"
      >
        <div className="flex items-center justify-center h-full text-muted-foreground">
          {error}
        </div>
      </section>
    );
  }

  if (games.length === 0) {
    return null;
  }

  const headlineTitle = settings.headlineTitle ?? "Top Picks For You";
  const headlineSubtitle = settings.headlineSubtitle ?? "Featured Games";
  const showHeadline = settings.withHeadline !== false;

  return (
    <section
      className="relative w-full h-full flex flex-col"
      aria-label="Game recommendations"
    >
      {showHeadline && (
        <div className="flex items-end justify-between mb-8 px-6 md:px-12 lg:px-16">
          {/* <div>
            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {headlineTitle}
            </motion.p>
            <motion.h2
              className="text-2xl md:text-3xl font-bold text-foreground tracking-tight text-balance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {headlineSubtitle}
            </motion.h2>
          </div> */}
        </div>
      )}

      <div className="relative flex-1 flex flex-col justify-center pl-10">
        <div className="hidden md:flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer rounded-full border-[rgba(218,165,32,0.2)] text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 disabled:opacity-30 bg-transparent transition-colors duration-200"
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 cursor-pointer rounded-full border-[rgba(218,165,32,0.2)] text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 disabled:opacity-30 bg-transparent transition-colors duration-200"
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-8"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            paddingLeft: "40px",
            paddingRight: "24px",
          }}
          role="list"
          aria-label="Game cards"
        >
          {games.map((game, i) => (
            <div
              key={game.id}
              className="snap-start"
              role="listitem"
              data-game-id={game.id}
            >
              <GameCard
                game={game}
                index={i}
                gameUrl={settings.gameUrl}
                demoUrl={settings.demoUrl}
                onPlay={handlePlay}
                onDemo={handleDemo}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
