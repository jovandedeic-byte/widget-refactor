"use client";

import { useEffect, useRef, useCallback } from "react";
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

function TypingDots() {
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

export function ChatBody({ messages, isTyping = false, onMarkAsRead }: ChatBodyProps) {
  const t = useTranslations();
  const viewportRef = useRef<HTMLDivElement>(null);
  const batchRef = useRef<string[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div className="p-4 space-y-4">
        {messages.length === 0 && !isTyping ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground">
              {t.noMessages}
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && <TypingDots />}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
