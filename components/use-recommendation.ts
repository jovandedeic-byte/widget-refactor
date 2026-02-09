"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Game, ApiGame } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://core.gamblio.ai";

function transformGame(apiGame: ApiGame, index: number): Game {
  const id = String(apiGame.id ?? apiGame.gameId ?? index);
  const title = apiGame.gameName ?? apiGame.name ?? `Game ${id}`;
  const cover = apiGame.gameImage ?? apiGame.logo ?? "/placeholder.svg";

  return {
    id,
    title,
    genre: "",
    cover,
    accentColor: "#daa520",
  };
}

export interface UseRecommendationOptions {
  clientId: string;
  playerToken?: string | null;
}

export function useRecommendation({
  clientId,
  playerToken = null,
}: UseRecommendationOptions) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const impressionsSent = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_URL}/recommendation/`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId,
            playerToken,
          }),
        });

        if (response.status === 500) {
          console.warn("[RecommendationWidget] Server error - hiding widget");
          setGames([]);
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const apiGames: ApiGame[] = data.data ?? data ?? [];
        const transformedGames = apiGames.map(transformGame);
        setGames(transformedGames);
      } catch (err) {
        console.error("[RecommendationWidget] Fetch error:", err);
        setError("Failed to load recommendations");
      } finally {
        setIsLoading(false);
      }
    }

    if (clientId) {
      fetchRecommendations();
    }
  }, [clientId, playerToken]);

  const trackImpression = useCallback(
    async (gameId: string) => {
      if (impressionsSent.current.has(gameId)) return;
      impressionsSent.current.add(gameId);

      try {
        await fetch(`${API_URL}/recommendation/impression/`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId,
            playerToken,
            gameId,
          }),
        });
      } catch (err) {
        console.warn("[RecommendationWidget] Impression tracking failed:", err);
      }
    },
    [clientId, playerToken],
  );

  const trackClick = useCallback(
    async (gameId: string) => {
      try {
        await fetch(`${API_URL}/recommendation/click/`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            clientId,
            playerToken,
            gameId,
          }),
        });
      } catch (err) {
        console.warn("[RecommendationWidget] Click tracking failed:", err);
      }
    },
    [clientId, playerToken],
  );

  // Intersection observer for impression tracking
  useEffect(() => {
    if (games.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const gameId = entry.target.getAttribute("data-game-id");
            if (gameId) {
              trackImpression(gameId);
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    const cards = document.querySelectorAll("[data-game-id]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [games, trackImpression]);

  return {
    games,
    isLoading,
    error,
    trackImpression,
    trackClick,
  };
}
