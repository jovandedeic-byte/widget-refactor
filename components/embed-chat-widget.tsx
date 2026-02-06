"use client";

import { useCallback } from "react";
import { Card, CardFooter } from "@/components/ui/card";
import { ChatHeader } from "./chat-header";
import { PreChat } from "./pre-chat";
import { ChatBody } from "./chat-body";
import { ChatInput } from "./chat-input";
import { ChatRating } from "./chat-rating";
import { useChat } from "./use-chat";

interface EmbedChatWidgetProps {
  clientId: string;
  playerToken?: string | null;
}

export function EmbedChatWidget({ clientId, playerToken }: EmbedChatWidgetProps) {
  const {
    chatStarted,
    messages,
    isInputEnabled,
    isChatClosed,
    ratingState,
    hasToken,
    startChat,
    autoStart,
    sendMessage,
    endChat,
    submitRating,
    resetChat,
  } = useChat({ clientId, playerToken });

  const handleNewChat = useCallback(() => {
    resetChat();
  }, [resetChat]);

  const handleSkipRating = useCallback(() => {
    resetChat();
  }, [resetChat]);

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden gap-0 rounded-none border-0">
      <ChatHeader
        title="Chat"
        isChatActive={chatStarted && !isChatClosed}
        onEndChat={endChat}
      />

      {!chatStarted ? (
        <PreChat onStartChat={startChat} hasToken={hasToken} onTokenStart={autoStart} />
      ) : isChatClosed ? (
        <>
          <ChatBody messages={messages} />
          <ChatRating
            ratingState={ratingState}
            onSubmitRating={submitRating}
            onSkip={handleSkipRating}
            onNewChat={handleNewChat}
          />
        </>
      ) : (
        <>
          <ChatBody messages={messages} />
          <ChatInput
            onSendMessage={sendMessage}
            disabled={!isInputEnabled}
          />
        </>
      )}
      <CardFooter className="text-xs text-muted-foreground flex justify-center items-center h-8 w-full">
        Powered by Gamblio
      </CardFooter>
    </Card>
  );
}
