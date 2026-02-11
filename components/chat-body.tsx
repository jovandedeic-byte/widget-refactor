"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import type { Message } from "./types";
import { useTranslations } from "@/lib/i18n";

interface ChatBodyProps {
  messages: Message[];
  isTyping?: boolean;
  onMarkAsRead?: (ids: string[]) => void;
}

function getDayKey (unix: number): string {
  const d = new Date(unix * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDateLabel (
  unix: number,
  todayKey: string,
  yesterdayKey: string,
  t: { dateToday: string; dateYesterday: string }
): string {
  const key = getDayKey(unix);
  if (key === todayKey) return t.dateToday;
  if (key === yesterdayKey) return t.dateYesterday;
  const d = new Date(unix * 1000);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const FLOATING_PILL_HIDE_MS = 2000;

function TypingDots () {
  const t = useTranslations();
  return (
    <div className="flex justify-start items-end gap-2">
      <Avatar>
        <AvatarImage src="https://app.gamblio.ai/wasco.png" alt={t.wascoAlt} />
        <AvatarFallback>W</AvatarFallback>
      </Avatar>
      <div className="bg-gray-200 dark:bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce" />
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0.2s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}

type DateGroup = { label: string; messages: Message[] };

function buildDateGroups (
  messages: Message[],
  t: { dateToday: string; dateYesterday: string }
): DateGroup[] {
  const now = new Date();
  const todayKey = getDayKey(Math.floor(now.getTime() / 1000));
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDayKey(Math.floor(yesterday.getTime() / 1000));
  const groups: DateGroup[] = [];
  let current: DateGroup | null = null;

  for (const message of messages) {
    const unix = message.unix ?? 0;
    const key = unix ? getDayKey(unix) : null;
    const label = key ? getDateLabel(unix, todayKey, yesterdayKey, t) : "";
    if (key !== null && (!current || current.label !== label)) {
      current = { label, messages: [] };
      groups.push(current);
    }
    if (!current) {
      current = { label: "", messages: [] };
      groups.push(current);
    }
    current.messages.push(message);
  }
  return groups;
}

export function ChatBody ({ messages, isTyping = false, onMarkAsRead }: ChatBodyProps) {
  const t = useTranslations();
  const viewportRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [floatingDate, setFloatingDate] = useState<string | null>(null);
  const [pillVisible, setPillVisible] = useState(false);
  const hidePillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateGroups = useMemo(
    () => buildDateGroups(messages, { dateToday: t.dateToday, dateYesterday: t.dateToday }),
    [messages, t.dateToday]
  );

  // Floating date pill: show on scroll, hide after 2s of no scroll; only one pill, no stacking
  const updateFloatingDate = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { scrollTop, clientHeight, scrollHeight } = viewport;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 8;
    if (atBottom) {
      setPillVisible(false);
      if (hidePillTimerRef.current) {
        clearTimeout(hidePillTimerRef.current);
        hidePillTimerRef.current = null;
      }
      return;
    }
    const markers = viewport.querySelectorAll<HTMLElement>("[data-date-marker]");
    let currentLabel: string | null = null;
    for (const m of markers) {
      const top = m.offsetTop;
      if (top <= scrollTop + 60) currentLabel = m.dataset.dateLabel ?? null;
    }
    if (currentLabel) {
      setFloatingDate(currentLabel);
      setPillVisible(true);
      if (hidePillTimerRef.current) clearTimeout(hidePillTimerRef.current);
      hidePillTimerRef.current = setTimeout(() => {
        setPillVisible(false);
        hidePillTimerRef.current = null;
      }, FLOATING_PILL_HIDE_MS);
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.addEventListener("scroll", updateFloatingDate, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", updateFloatingDate);
      if (hidePillTimerRef.current) {
        clearTimeout(hidePillTimerRef.current);
        hidePillTimerRef.current = null;
      }
    };
  }, [updateFloatingDate]);

  // Auto-scroll to bottom
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTop = viewport.scrollHeight;
      });
    }
  }, [messages, isTyping]);

  // Batch visible IDs and flush after a short debounce
  const flushSeen = useCallback(() => {
    if (batchRef.current.length === 0 || !onMarkAsRead) return;
    onMarkAsRead(batchRef.current);
    batchRef.current = [];
  }, [onMarkAsRead]);

  // Observe agent messages for read receipts
  useEffect(() => {
    if (!onMarkAsRead) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.messageId;
          if (id) batchRef.current.push(id);
        }
        if (batchRef.current.length > 0) {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          flushTimerRef.current = setTimeout(flushSeen, 300);
        }
      },
      { root: viewport, threshold: 0.5 }
    );

    const elements = viewport.querySelectorAll("[data-message-id]");
    elements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      flushSeen();
    };
  }, [messages, onMarkAsRead, flushSeen]);

  return (
    <ScrollArea ref={viewportRef} className="flex-1">
      <div className="relative">
        {/* Single floating date pill: shows on scroll, auto-hides after 2s */}
        {floatingDate && (
          <div
            className={`absolute top-0 left-0 right-0 z-10 flex justify-center py-2 pointer-events-none transition-opacity duration-300 ${pillVisible ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          >
            <span className="text-xs font-medium text-muted-foreground bg-muted/90 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50">
              {floatingDate}
            </span>
          </div>
        )}
        <div className="p-4">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-muted-foreground">
                {t.noMessages}
              </p>
            </div>
          ) : (
            <>
              {dateGroups.map((group, i) => (
                <div key={group.label || `g-${i}`} className={i > 0 ? "mt-4" : undefined}>
                  {group.label ? (
                    <div
                      data-date-marker
                      data-date-label={group.label}
                      className="h-0 overflow-hidden"
                      aria-hidden
                    />
                  ) : null}
                  <div className="space-y-4">
                    {group.messages.map((m) => (
                      <MessageBubble key={m.id} message={m} />
                    ))}
                  </div>
                </div>
              ))}
              {isTyping && <TypingDots />}
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
