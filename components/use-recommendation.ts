"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";
import type { Game, ApiGame } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://core.gamblio.ai";

// Test function - call from console: window.testImpression()
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).testImpression = () => {
    console.log("[Test] Sending test impression to:", API_URL);
    fetch(`${API_URL}/recommendation/impression/`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: "test",
        playerToken: null,
        gameId: "test-123",
      }),
    })
      .then((r) => {
        console.log("[Test] Status:", r.status);
        return r.text();
      })
      .then((t) => console.log("[Test] Body:", t))
      .catch((e) => console.error("[Test] Error:", e));
  };
}

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
  containerRef?: RefObject<HTMLDivElement | null>;
}

export function useRecommendation({
  clientId,
  playerToken = null,
  containerRef,
}: UseRecommendationOptions) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const impressionsSent = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

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
    (gameId: string) => {
      if (impressionsSent.current.has(gameId)) {
        console.log("[Impression] Already sent for:", gameId);
        return;
      }
      impressionsSent.current.add(gameId);

      const url = `${API_URL}/recommendation/impression/`;
      const payload = { clientId, playerToken, gameId };
      console.log("[Impression] POST to:", url, "payload:", payload);

      // Fire and forget - don't await
      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          console.log("[Impression] Response status:", response.status);
          return response.text();
        })
        .then((text) => {
          console.log("[Impression] Response body:", text);
        })
        .catch((err) => {
          console.error("[Impression] Fetch error:", err);
        });

      console.log("[Impression] Fetch initiated");
    },
    [clientId, playerToken]
  );

  const trackClick = useCallback(
    (gameId: string) => {
      const url = `${API_URL}/recommendation/click/`;
      const payload = { clientId, playerToken, gameId };
      console.log("[Click] POST to:", url, "payload:", payload);

      fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((response) => {
          console.log("[Click] Response status:", response.status);
          return response.text();
        })
        .then((text) => {
          console.log("[Click] Response body:", text);
        })
        .catch((err) => {
          console.error("[Click] Fetch error:", err);
        });

      console.log("[Click] Fetch initiated");
    },
    [clientId, playerToken]
  );

  // Intersection observer for impression tracking
  useEffect(() => {
    if (games.length === 0 || !containerRef?.current) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const gameId = entry.target.getAttribute("data-game-id");
            if (gameId) {
              console.log("[Impression] Game visible:", gameId);
              trackImpression(gameId);
            }
          }
        });
      },
      {
        threshold: 0.5,
        root: null, // viewport
      }
    );

    observerRef.current = observer;

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const container = containerRef.current;
      if (container) {
        const cards = container.querySelectorAll("[data-game-id]");
        console.log("[Impression] Observing", cards.length, "cards");
        cards.forEach((card) => observer.observe(card));
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [games, trackImpression, containerRef]);

  return {
    games,
    isLoading,
    error,
    trackImpression,
    trackClick,
  };
}
