"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";
import type { HotColdGame, HotColdResponse } from "./types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFETCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export type HotColdPeriod = "daily" | "weekly" | "monthly";
export type HotColdFilter = "hot" | "cold";

const STORAGE_KEY_PREFIX = "gamblio-hotcold";

function getStorageKey(clientId: string, period: HotColdPeriod): string {
  return `${STORAGE_KEY_PREFIX}-${clientId}-${period}`;
}

interface CachedData {
  hot: HotColdGame[];
  cold: HotColdGame[];
  fetchedAt: number;
}

const PERIOD_DAYS: Record<HotColdPeriod, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
};

// function sortByRtp(games: HotColdGame[], filter: HotColdFilter): HotColdGame[] {
//   return filter === "hot"
//     ? [...games].sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
//     : [...games].sort((a, b) => (a.rtp ?? 0) - (b.rtp ?? 0));
// }

function mapGames(rawGames: HotColdGame[]): HotColdGame[] {
  return rawGames.map((game) => ({
    ...game,
    rtp: Number(game.rtp) || 0,
    gameVendorId: Number(game.gameVendorId) || 0,
  }));
}

function getGamesForFilter(
  cached: CachedData,
  filter: HotColdFilter,
): HotColdGame[] {
  return filter === "hot" ? cached.hot : cached.cold;
}

function readCache(clientId: string, period: HotColdPeriod): CachedData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(clientId, period));
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (
      !Array.isArray(parsed.hot) ||
      !Array.isArray(parsed.cold) ||
      !parsed.fetchedAt
    )
      return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(
  clientId: string,
  period: HotColdPeriod,
  data: Pick<CachedData, "hot" | "cold">,
): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(clientId, period);
    localStorage.setItem(
      key,
      JSON.stringify({ hot: data.hot, cold: data.cold, fetchedAt: Date.now() }),
    );
  } catch {
    // ignore
  }
}

export interface UseHotColdOptions {
  clientId: string;
  playerToken?: string | null;
  authToken?: string | null;
  containerRef?: RefObject<HTMLDivElement | null>;
}

export function useHotCold({
  clientId,
  playerToken = null,
  authToken = null,
  containerRef,
}: UseHotColdOptions) {
  const [games, setGames] = useState<HotColdGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriodState] = useState<HotColdPeriod>("daily");
  const [filter, setFilter] = useState<HotColdFilter>("hot");
  const refetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const periodRef = useRef<HotColdPeriod>(period);
  periodRef.current = period;

  const fetchPeriod = useCallback(
    async (
      targetPeriod: HotColdPeriod,
    ): Promise<Pick<CachedData, "hot" | "cold">> => {
      const timeframeDays = PERIOD_DAYS[targetPeriod] ?? 1;
      const url = `${process.env.NEXT_PUBLIC_API_HOT_COLD_URL}?clientId=${process.env.NEXT_PUBLIC_CLIENT_ID}`;
      const bearerToken = authToken ?? playerToken;
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          identifier: "widget.hot_and_cold",
          timeframeDays,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }

      const res: HotColdResponse = await response.json();

      const hotGames = mapGames(res.hot ?? []);
      const coldGames = mapGames(res.cold ?? []);
      return {
        hot: hotGames,
        cold: coldGames,
      };
    },
    [clientId, authToken, playerToken],
  );

  const loadPeriod = useCallback(
    async (targetPeriod: HotColdPeriod, fromCacheOnly = false) => {
      const cached = readCache(clientId, targetPeriod);
      if (cached) {
        setGames(getGamesForFilter(cached, filter));
        setError(null);
        if (fromCacheOnly) return;
      }

      if (fromCacheOnly) return;

      try {
        const periodGames = await fetchPeriod(targetPeriod);
        writeCache(clientId, targetPeriod, periodGames);
        setGames(periodGames[filter]);
        setError(null);
      } catch (err) {
        console.error("[HotCold] Fetch error:", err);
        if (!readCache(clientId, targetPeriod)) {
          setError("Failed to load games");
          setGames([]);
        }
      }
    },
    [clientId, filter, fetchPeriod],
  );

  // Initial load: read from localStorage first, then optionally fetch
  useEffect(() => {
    if (!clientId) return;

    const cached = readCache(clientId, period);
    if (cached) {
      setGames(getGamesForFilter(cached, filter));
      setError(null);
      setIsLoading(false);
      // Prefetch other periods in background
      const others: HotColdPeriod[] = ["daily", "weekly", "monthly"].filter(
        (p) => p !== period,
      ) as HotColdPeriod[];
      others.forEach((p) => {
        if (!readCache(clientId, p)) {
          fetchPeriod(p)
            .then((periodGames) => writeCache(clientId, p, periodGames))
            .catch(() => {});
        }
      });
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPeriod(period)
      .then((periodGames) => {
        if (cancelled) return;
        writeCache(clientId, period, periodGames);
        setGames(periodGames[filter]);
        setIsLoading(false);
        const others: HotColdPeriod[] = ["daily", "weekly", "monthly"].filter(
          (p) => p !== period,
        ) as HotColdPeriod[];
        others.forEach((p) => {
          fetchPeriod(p)
            .then((data) => writeCache(clientId, p, data))
            .catch(() => {});
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[HotCold] Initial fetch error:", err);
          setError("Failed to load games");
          setGames([]);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, period, filter, fetchPeriod]);

  // When period or filter changes and we already have cache
  useEffect(() => {
    if (!clientId) return;
    const cached = readCache(clientId, period);
    if (cached) {
      setGames(getGamesForFilter(cached, filter));
    }
  }, [clientId, period, filter]);

  const setPeriod = useCallback(
    (p: HotColdPeriod) => {
      setPeriodState(p);
      const cached = readCache(clientId, p);
      if (cached) {
        setGames(getGamesForFilter(cached, filter));
      } else {
        setIsLoading(true);
        fetchPeriod(p)
          .then((periodGames) => {
            writeCache(clientId, p, periodGames);
            if (periodRef.current === p) {
              setGames(periodGames[filter]);
            }
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      }
    },
    [clientId, filter, fetchPeriod],
  );

  // Hourly refetch
  useEffect(() => {
    if (!clientId) return;

    refetchIntervalRef.current = setInterval(() => {
      const periods: HotColdPeriod[] = ["daily", "weekly", "monthly"];
      periods.forEach((p) => {
        fetchPeriod(p)
          .then((periodGames) => {
            writeCache(clientId, p, periodGames);
            if (p === period) setGames(periodGames[filter]);
          })
          .catch(() => {});
      });
    }, REFETCH_INTERVAL_MS);

    return () => {
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
        refetchIntervalRef.current = null;
      }
    };
  }, [clientId, period, filter, fetchPeriod]);

  const trackClick = useCallback((_gameId: string) => {
    // Optional: POST to click endpoint if backend provides one
  }, []);

  return {
    games,
    isLoading,
    error,
    period,
    setPeriod,
    filter,
    setFilter,
    trackClick,
  };
}
