"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserInfo } from "./types";
import { useTranslations } from "@/lib/i18n";

interface ChatHeaderProps {
  title?: string;
  isChatActive?: boolean;
  onEndChat?: () => void;
  onClose?: () => void;
  userInfo?: UserInfo;
}

export function ChatHeader({
  title,
  isChatActive = false,
  onEndChat,
  onClose,
}: ChatHeaderProps) {
  const t = useTranslations();
  const displayTitle = title ?? t.chatTitle;
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      <h2 className="text-sm font-semibold text-foreground">{displayTitle}</h2>
      <div className="flex items-center gap-1">
        {isChatActive && onEndChat && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onEndChat}
          >
            {t.endChat}
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">{t.closeChat}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
