"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserInfo } from "./types";

interface ChatHeaderProps {
  title?: string;
  isChatActive?: boolean;
  onEndChat?: () => void;
  onClose?: () => void;
  userInfo?: UserInfo;
}

export function ChatHeader({
  title = "Chat",
  isChatActive = false,
  onEndChat,
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-background">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex items-center gap-1">
        {isChatActive && onEndChat && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onEndChat}
          >
            End Chat
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
            <span className="sr-only">Close chat</span>
          </Button>
        )}
      </div>
    </div>
  );
}
