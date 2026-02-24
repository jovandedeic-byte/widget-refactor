"use client";

import { useCallback } from "react";
import { Card, CardFooter } from "@/components/ui/card";
import { ChatHeader } from "./chat-header";
import { PreChat } from "./pre-chat";
import { ChatBody } from "./chat-body";
import { ChatInput } from "./chat-input";
import { ChatRating } from "./chat-rating";
import { ChatBumpScreen } from "./chat-bump-screen";
import { useChat } from "./use-chat";
import { LanguageContext, useTranslations, type Language } from "@/lib/i18n";

interface EmbedChatWidgetProps {
  clientId: string;
  playerToken?: string | null;
  language?: Language;
}

export function EmbedChatWidget({
  clientId,
  playerToken,
  language = "en",
}: EmbedChatWidgetProps) {
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

  const handleNewChat = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const handleSkipRating = useCallback(() => {
    resetChat();
  }, [resetChat]);

  return (
    <LanguageContext.Provider value={language}>
      <Card className="w-full h-full flex flex-col overflow-hidden gap-0 rounded-none border-0">
        <ChatHeader
          title={t.chatTitle}
          isChatActive={chatStarted && !isChatClosed && !activeBump}
          onEndChat={endChat}
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
        <CardFooter className="text-xs text-muted-foreground flex justify-center items-center h-8 w-full">
          {t.poweredBy}
        </CardFooter>
      </Card>
    </LanguageContext.Provider>
  );
}
