"use client";

import { useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatHeader } from "./chat-header";
import { PreChat } from "./pre-chat";
import { ChatBody } from "./chat-body";
import { ChatInput } from "./chat-input";
import { useChat } from "./use-chat";

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    chatStarted,
    userInfo,
    messages,
    isInputEnabled,
    isChatClosed,
    startChat,
    sendMessage,
  } = useChat();

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-4">
      {/* Chat Widget */}
      <div
        className={`
          transform transition-all duration-300 ease-out origin-bottom-right
          ${
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 translate-y-4 pointer-events-none"
          }
        `}
      >
        <Card className="w-95 h-150 flex flex-col overflow-hidden shadow-2xl">
          <ChatHeader title="Chat" onClose={handleClose} />

          {!chatStarted ? (
            <PreChat onStartChat={startChat} />
          ) : (
            <>
              <ChatBody messages={messages} userInfo={userInfo} />
              <ChatInput
                onSendMessage={sendMessage}
                disabled={!isInputEnabled || isChatClosed}
              />
              <div className="flex justify-center items-center h-8 w-full">
                Powered by Gamblio
              </div>
            </>
          )}
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
          ${isOpen ? "rotate-0" : "rotate-0"}
        `}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="sr-only">{isOpen ? "Close chat" : "Open chat"}</span>
      </Button>
    </div>
  );
}
