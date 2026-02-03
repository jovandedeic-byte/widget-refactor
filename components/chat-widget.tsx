"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { PreChat } from "./pre-chat";
import { ChatHeader } from "./chat-header";
import { ChatBody } from "./chat-body";
import { ChatInput } from "./chat-input";
import type { Message, UserInfo } from "./types";

type StartChatPayload = {
  tag: "playerStartChatAndJoin";
  playerToken: string | null;
  clientId: string | null;
  playerName: string | null;
  playerId: string | null;
};

type SendMessagePayload = {
  tag: "sendMessage";
  chatId: string | null;
  text: string;
};

type BumpPayload = {
  bump_type?: string;
  bump_data?: Record<string, unknown>;
};

export function ChatWidget() {
  const [chatStarted, setChatStarted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const pendingStartPayloadRef = useRef<StartChatPayload | null>(null);
  const pendingStartInfoRef = useRef<{ name: string; email: string } | null>(
    null,
  );
  const welcomeMessageShownRef = useRef(false);

  const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "";

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const updateMessage = useCallback(
    (messageId: string, updater: (msg: Message) => Message) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? updater(msg) : msg)),
      );
    },
    [],
  );

  const sendPayload = useCallback(
    (payload: StartChatPayload | SendMessagePayload) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return false;
      }
      socket.send(JSON.stringify(payload));
      return true;
    },
    [],
  );

  const handleBump = useCallback(
    (payload: BumpPayload) => {
      const data = (payload.bump_data ?? {}) as Record<string, unknown>;

      switch (payload.bump_type) {
        case "startChatSuccess": {
          const nextChatId = (data.chat ?? data.chatId ?? null) as
            | string
            | null;
          setChatId(nextChatId);
          setChatStarted(true);
          setIsInputEnabled(true);
          setIsChatClosed(false);

          const backendName = data.full_name as string | undefined;
          if (backendName) {
            setUserInfo((prev) =>
              prev
                ? { ...prev, name: backendName }
                : { name: backendName, email: "" },
            );
          }

          if (!welcomeMessageShownRef.current) {
            const fallbackName = pendingStartInfoRef.current?.name ?? "";
            const displayName = backendName || fallbackName;
            appendMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: displayName
                ? `Hi ${displayName}! Thanks for reaching out. How can I help you today?`
                : "Hi! Thanks for reaching out. How can I help you today?",
            });
            welcomeMessageShownRef.current = true;
          }
          break;
        }
        case "rejoinChatSuccess": {
          const nextChatId = (data.chat ?? data.chatId ?? chatId) as
            | string
            | null;
          setChatId(nextChatId);
          setChatStarted(true);
          setIsChatClosed(false);
          setIsInputEnabled(true);
          break;
        }
        case "messageDelivered": {
          const messageId = String(data.messageId ?? "");
          const deliveredAt = (data.delivered_at ?? null) as number | null;
          if (messageId) {
            updateMessage(messageId, (msg) => ({ ...msg, deliveredAt }));
          }
          break;
        }
        case "messageSeen":
        case "messageRead": {
          const messageId = String(data.messageId ?? "");
          const seenBy = (data.seen_by ?? []) as Array<{ seen_at: number }>;
          if (messageId) {
            updateMessage(messageId, (msg) => ({ ...msg, seenBy }));
          }
          break;
        }
        case "messagesMarkedAsRead": {
          const messageIds = (data.messageIds ?? []) as Array<string | number>;
          const messageIdsStrings = messageIds.map((id) => String(id));
          const seenAt = Math.floor(Date.now() / 1000);
          setMessages((prev) =>
            prev.map((msg) => {
              if (!messageIdsStrings.includes(msg.id)) return msg;
              const seenBy = msg.seenBy ?? [];
              const hasCurrentSeen = seenBy.some(
                (entry) => entry.seen_at === seenAt,
              );
              return hasCurrentSeen
                ? msg
                : { ...msg, seenBy: [...seenBy, { seen_at: seenAt }] };
            }),
          );
          break;
        }
        case "newMessage": {
          const isSentSafely = data.is_sent_safely === true;
          if (isSentSafely) break;

          const id = String(data.id ?? data.messageId ?? crypto.randomUUID());
          const role = (data.role === "assistant" ? "assistant" : "user") as
            | "assistant"
            | "user";
          appendMessage({
            id,
            role,
            content: String(data.text ?? ""),
            attachmentUrl: (data.attachment_url ?? null) as string | null,
            unix: (Number(data.timestamp) || null) as number | null,
            deliveredAt: (data.delivered_at ?? null) as number | null,
            seenBy: (data.seen_by ?? null) as Array<{ seen_at: number }> | null,
          });
          break;
        }
        case "switchedStatusToClosed":
        case "chatClosedBySystemAlready": {
          setIsChatClosed(true);
          setIsInputEnabled(false);
          break;
        }
        case "playerUnauthenticated": {
          if (data.is_authenticated === false) {
            appendMessage({
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Authentication failed. Please refresh and try again.",
            });
            setIsInputEnabled(false);
          }
          break;
        }
        default:
      }
    },
    [appendMessage, chatId, updateMessage],
  );

  useEffect(() => {
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      const pending = pendingStartPayloadRef.current;
      if (pending) {
        socket.send(JSON.stringify(pending));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as BumpPayload;
        if (payload?.bump_type) {
          handleBump(payload);
        }
      } catch {
        // Ignore malformed payloads
      }
    };

    socket.onclose = () => {
      setIsInputEnabled(false);
    };

    socket.onerror = () => {
      setIsInputEnabled(false);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [handleBump, wsUrl]);

  const handleStartChat = useCallback(
    (name: string, email: string) => {
      setUserInfo({ name, email });
      setChatStarted(true);
      setIsInputEnabled(false);
      setIsChatClosed(false);

      if (!wsUrl) {
        appendMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Chat backend is not configured. Set NEXT_PUBLIC_CHAT_WS_URL to connect.",
        });
        return;
      }

      const payload: StartChatPayload = {
        tag: "playerStartChatAndJoin",
        playerToken: null,
        clientId: "0b7e7dee87b1c3b98e72131173dfbbbf",
        playerName: name,
        playerId: email,
      };

      pendingStartInfoRef.current = { name, email };
      pendingStartPayloadRef.current = payload;

      const sent = sendPayload(payload);
      if (!sent) {
        appendMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Connecting to chat...",
        });
      }
    },
    [appendMessage, sendPayload, wsUrl],
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      if (!isInputEnabled) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };

      appendMessage(userMessage);

      const payload: SendMessagePayload = {
        tag: "sendMessage",
        chatId,
        text: content,
      };

      if (!sendPayload(payload)) {
        appendMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Message not sent. Connection is unavailable.",
        });
      }
    },
    [appendMessage, chatId, isInputEnabled, sendPayload],
  );

  return (
    <Card className="w-full max-w-[400px] h-[500px] flex flex-col overflow-hidden shadow-lg">
      {!chatStarted ? (
        <PreChat onStartChat={handleStartChat} />
      ) : (
        <>
          <ChatHeader userInfo={userInfo!} />
          <ChatBody messages={messages} />
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={!isInputEnabled || isChatClosed}
          />
        </>
      )}
    </Card>
  );
}
