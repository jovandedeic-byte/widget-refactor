"use client";

import { useState, useEffect, useCallback, useRef, RefObject } from "react";
import type {
  HotColdGame,
  GetVendorsResponse,
  GetVendorsGame,
  GetVendorsVendor,
} from "./types";

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

function transformVendorsResponse(
  res: GetVendorsResponse,
  vendorMap: Map<string | number, string>,
): HotColdGame[] {
  const games = res.games ?? [];
  return games.map((g: GetVendorsGame, index: number) => {
    const data = g.data ?? g;
    const id = String(data.id ?? g.id ?? index);
    const title = data.name ?? g.name ?? `Game ${id}`;
    const cover =
      data.desktop_image ??
      g.desktop_image ??
      data.game_image ??
      g.game_image ??
      data.logo ??
      g.logo ??
      data.image ??
      g.image ??
      "/placeholder.svg";
    const rtp = data.rtp ?? g.rtp ?? null;
    const gameVendorId = data.game_vendor_id ?? g.game_vendor_id;
    const vendorName =
      data.game_vendor_name ??
      g.game_vendor_name ??
      (gameVendorId != null ? vendorMap.get(gameVendorId) : null) ??
      "Unknown";
    return {
      id,
      title,
      cover,
      accentColor: "#daa520",
      rtp: rtp != null ? Number(rtp) : null,
      vendorName: vendorName ?? null,
    };
  });
}

function buildVendorMap(res: GetVendorsResponse): Map<string | number, string> {
  const map = new Map<string | number, string>();
  const vendors = res.vendors ?? [];
  vendors.forEach((v: GetVendorsVendor) => {
    const id = v.id ?? v.data?.id;
    const name = v.name ?? v.data?.name;
    if (id != null && name) map.set(id, name);
  });
  return map;
}

function filterAndSort(
  games: HotColdGame[],
  filter: HotColdFilter,
): HotColdGame[] {
  const threshold = 95;
  const filtered =
    filter === "hot"
      ? games.filter((g) => (g.rtp ?? 0) > threshold)
      : games.filter((g) => (g.rtp ?? 0) <= threshold);
  return filter === "hot"
    ? [...filtered].sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
    : [...filtered].sort((a, b) => (a.rtp ?? 0) - (b.rtp ?? 0));
}

function sortByRtp(games: HotColdGame[], filter: HotColdFilter): HotColdGame[] {
  return filter === "hot"
    ? [...games].sort((a, b) => (b.rtp ?? 0) - (a.rtp ?? 0))
    : [...games].sort((a, b) => (a.rtp ?? 0) - (b.rtp ?? 0));
}

function mapGames(rawGames: GetVendorsGame[]): HotColdGame[] {
  return rawGames.map((game, index) => {
    const data = game.data ?? game;
    const id = String(data.id ?? game.id ?? index);
    const title = data.name ?? game.name ?? `Game ${id}`;
    const cover =
      data.desktop_image ??
      game.desktop_image ??
      data.game_image ??
      game.game_image ??
      data.logo ??
      game.logo ??
      data.image ??
      game.image ??
      "/placeholder.svg";
    const rtp = data.rtp ?? game.rtp ?? null;
    const vendorName =
      data.game_vendor_name ?? game.game_vendor_name ?? "Unknown";

    return {
      id,
      title,
      cover,
      accentColor: "#daa520",
      rtp: rtp != null ? Number(rtp) : null,
      vendorName,
    };
  });
}

function getGamesForFilter(
  cached: CachedData,
  filter: HotColdFilter,
): HotColdGame[] {
  return sortByRtp(cached[filter] ?? [], filter);
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
    localStorage.setItem(key, JSON.stringify({ data, fetchedAt: Date.now() }));
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

      const res: GetVendorsResponse = await response.json();

      if (res.hot || res.cold) {
        const hotGames = mapGames(res.hot ?? []);
        const coldGames = mapGames(res.cold ?? []);
        return {
          hot: sortByRtp(hotGames, "hot"),
          cold: sortByRtp(coldGames, "cold"),
        };
      }

      const vendorMap = buildVendorMap(res);
      const list = transformVendorsResponse(res, vendorMap);
      return {
        hot: filterAndSort(list, "hot"),
        cold: filterAndSort(list, "cold"),
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
        setGames(sortByRtp(periodGames[filter], filter));
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
        setGames(sortByRtp(periodGames[filter], filter));
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
              setGames(sortByRtp(periodGames[filter], filter));
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
            if (p === period) setGames(sortByRtp(periodGames[filter], filter));
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
