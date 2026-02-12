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
  data: HotColdGame[];
  fetchedAt: number;
}

function getPeriodDates(period: HotColdPeriod): {
  dateFrom: number;
  dateTo: number;
} {
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  if (period === "daily") {
    return {
      dateFrom: Math.floor(startOfToday.getTime() / 1000),
      dateTo: Math.floor(endOfToday.getTime() / 1000),
    };
  }
  if (period === "weekly") {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return {
      dateFrom: Math.floor(sevenDaysAgo.getTime() / 1000),
      dateTo: Math.floor(endOfToday.getTime() / 1000),
    };
  }
  // monthly
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  return {
    dateFrom: Math.floor(thirtyDaysAgo.getTime() / 1000),
    dateTo: Math.floor(endOfToday.getTime() / 1000),
  };
}

function transformVendorsResponse(
  res: GetVendorsResponse,
  vendorMap: Map<string | number, string>
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
  filter: HotColdFilter
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

function readCache(clientId: string, period: HotColdPeriod): CachedData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getStorageKey(clientId, period));
    if (!raw) return null;
    const parsed: CachedData = JSON.parse(raw);
    if (!parsed.data || !Array.isArray(parsed.data) || !parsed.fetchedAt)
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
  data: HotColdGame[]
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
    null
  );
  const periodRef = useRef<HotColdPeriod>(period);
  periodRef.current = period;

  const fetchPeriod = useCallback(
    async (targetPeriod: HotColdPeriod): Promise<HotColdGame[]> => {
      const { dateFrom, dateTo } = getPeriodDates(targetPeriod);
      const url = `${process.env.NEXT_PUBLIC_API_HOT_COLD_URL}`;
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId,
          identifier: "list.main_vendor_cards_rtp",
          count: 20,
          dateFrom,
          dateTo,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 100)}`);
      }

      const res: GetVendorsResponse = await response.json();
      const vendorMap = buildVendorMap(res);
      const list = transformVendorsResponse(res, vendorMap);
      return list;
    },
    [clientId, authToken]
  );

  const loadPeriod = useCallback(
    async (targetPeriod: HotColdPeriod, fromCacheOnly = false) => {
      const cached = readCache(clientId, targetPeriod);
      if (cached?.data?.length) {
        const filtered = filterAndSort(cached.data, filter);
        setGames(filtered);
        setError(null);
        if (fromCacheOnly) return;
      }

      if (fromCacheOnly) return;

      try {
        const list = await fetchPeriod(targetPeriod);
        writeCache(clientId, targetPeriod, list);
        const filtered = filterAndSort(list, filter);
        setGames(filtered);
        setError(null);
      } catch (err) {
        console.error("[HotCold] Fetch error:", err);
        if (!readCache(clientId, targetPeriod)) {
          setError("Failed to load games");
          setGames([]);
        }
      }
    },
    [clientId, filter, fetchPeriod]
  );

  // Initial load: read from localStorage first, then optionally fetch
  useEffect(() => {
    if (!clientId) return;

    const cached = readCache(clientId, period);
    if (cached?.data?.length) {
      const filtered = filterAndSort(cached.data, filter);
      setGames(filtered);
      setError(null);
      setIsLoading(false);
      // Prefetch other periods in background
      const others: HotColdPeriod[] = ["daily", "weekly", "monthly"].filter(
        (p) => p !== period
      ) as HotColdPeriod[];
      others.forEach((p) => {
        if (!readCache(clientId, p)) {
          fetchPeriod(p)
            .then((list) => writeCache(clientId, p, list))
            .catch(() => {});
        }
      });
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchPeriod(period)
      .then((list) => {
        if (cancelled) return;
        writeCache(clientId, period, list);
        setGames(filterAndSort(list, filter));
        setIsLoading(false);
        const others: HotColdPeriod[] = ["daily", "weekly", "monthly"].filter(
          (p) => p !== period
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
    if (cached?.data?.length) {
      setGames(filterAndSort(cached.data, filter));
    }
  }, [clientId, period, filter]);

  const setPeriod = useCallback(
    (p: HotColdPeriod) => {
      setPeriodState(p);
      const cached = readCache(clientId, p);
      if (cached?.data?.length) {
        setGames(filterAndSort(cached.data, filter));
      } else {
        setIsLoading(true);
        fetchPeriod(p)
          .then((list) => {
            writeCache(clientId, p, list);
            if (periodRef.current === p) {
              setGames(filterAndSort(list, filter));
            }
            setIsLoading(false);
          })
          .catch(() => setIsLoading(false));
      }
    },
    [clientId, filter, fetchPeriod]
  );

  // Hourly refetch
  useEffect(() => {
    if (!clientId) return;

    refetchIntervalRef.current = setInterval(() => {
      const periods: HotColdPeriod[] = ["daily", "weekly", "monthly"];
      periods.forEach((p) => {
        fetchPeriod(p)
          .then((list) => {
            writeCache(clientId, p, list);
            if (p === period) setGames(filterAndSort(list, filter));
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
