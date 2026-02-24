"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { ChatHeader } from "./chat-header";
import { PreChat } from "./pre-chat";
import { ChatBody } from "./chat-body";
import { ChatInput } from "./chat-input";
import { ChatRating } from "./chat-rating";
import { ChatBumpScreen } from "./chat-bump-screen";
import { useChat } from "./use-chat";
import { LanguageContext, useTranslations, type Language } from "@/lib/i18n";

interface FloatingChatWidgetProps {
  clientId: string;
  playerToken?: string | null;
  theme?: string;
  language?: Language;
  onOpenChange?: (isOpen: boolean) => void;
}

export function FloatingChatWidget({
  clientId,
  playerToken,
  theme,
  language = "en",
  onOpenChange,
}: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    chatStarted,
    messages,
    isInputEnabled,
    isChatClosed,
    isTyping,
    activeBump,
    ratingState,
    hasToken,
    startChat,
    autoStart,
    sendMessage,
    markMessagesAsRead,
    endChat,
    submitRating,
    resetChat,
  } = useChat({ clientId, playerToken, language });
  const t = useTranslations();

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        onOpenChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onOpenChange]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      onOpenChange?.(!prev);
      return !prev;
    });
  }, [onOpenChange]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleNewChat = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const handleSkipRating = useCallback(() => {
    resetChat();
  }, [resetChat]);

  return (
    <LanguageContext.Provider value={language}>
      <div
        ref={containerRef}
        className={`fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4 ${
          theme === "dark" ? "dark" : "light"
        }`}
      >
        {/* Chat Widget */}
        <div
          className={`
          transform transition-all duration-300 ease-out origin-bottom-right relative
          ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }
        `}
        >
          <Card className="w-95 h-150 flex flex-col overflow-hidden shadow-2xl gap-0 absolute right-4 bottom-0 z-99999">
            <ChatHeader
              title={t.chatTitle}
              isChatActive={chatStarted && !isChatClosed && !activeBump}
              onEndChat={endChat}
              onClose={handleClose}
            />

            {!chatStarted ? (
              <PreChat
                onStartChat={startChat}
                hasToken={hasToken}
                onTokenStart={autoStart}
              />
            ) : activeBump ? (
              <ChatBumpScreen secondsRemaining={activeBump.secondsRemaining} />
            ) : isChatClosed ? (
              <>
                <ChatBody
                  messages={messages}
                  isTyping={isTyping}
                  onMarkAsRead={markMessagesAsRead}
                />
                <ChatRating
                  ratingState={ratingState}
                  onSubmitRating={submitRating}
                  onSkip={handleSkipRating}
                  onNewChat={handleNewChat}
                />
              </>
            ) : (
              <>
                <ChatBody
                  messages={messages}
                  isTyping={isTyping}
                  onMarkAsRead={markMessagesAsRead}
                />
                <ChatInput
                  onSendMessage={sendMessage}
                  disabled={!isInputEnabled}
                  persistDraft={hasToken}
                />
              </>
            )}
            <CardFooter className="text-xs text-muted-foreground flex justify-center items-center h-8 w-full ">
              {t.poweredBy}
            </CardFooter>
          </Card>
        </div>

        {/* Floating Launcher Button */}
        <Button
          onClick={handleToggle}
          size="icon"
          className={`
          h-14 w-14 rounded-full shadow-lg
          transition-transform duration-300 ease-out
          hover:scale-105 active:scale-95
        `}
        >
          <MessageCircle className="h-6 w-6" />
          <span className="sr-only">{isOpen ? t.closeChat : t.openChat}</span>
        </Button>
      </div>
    </LanguageContext.Provider>
  );
}
