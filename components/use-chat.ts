"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, UserInfo } from "./types";

type StartChatPayload = {
  tag: "playerStartChatAndJoin";
  playerToken: string | null;
  clientId: string | null;
  playerName: string | null;
  playerId: number | null;
};

type SendMessagePayload = {
  tag: "sendMessage";
  chatId: string | null;
  text: string;
};

type ServerMessage = {
  tag?: string;
  bump_type?: string;
  bump_data?: Record<string, unknown>;
  error?: string;
};

export function useChat() {
  const [chatStarted, setChatStarted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const welcomeMessageShownRef = useRef(false);

  const wsUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "";

  const handleBump = useCallback(
    (payload: ServerMessage, startName?: string) => {
      const data = (payload.bump_data ?? {}) as Record<string, unknown>;

      switch (payload.bump_type) {
        case "startChatSuccess": {
          const nextChatId = (data.chat ?? data.chatId ?? null) as
            | string
            | null;
          chatIdRef.current = nextChatId;
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
            const displayName = backendName || startName || "";
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                content: displayName
                  ? `Hi ${displayName}! Thanks for reaching out. How can I help you today?`
                  : "Hi! Thanks for reaching out. How can I help you today?",
              },
            ]);
            welcomeMessageShownRef.current = true;
          }
          break;
        }
        case "rejoinChatSuccess": {
          const nextChatId = (
            data.chat ??
            data.chatId ??
            chatIdRef.current
          ) as string | null;
          chatIdRef.current = nextChatId;
          setChatStarted(true);
          setIsChatClosed(false);
          setIsInputEnabled(true);
          break;
        }
        case "messageDelivered": {
          const messageId = String(data.messageId ?? "");
          const deliveredAt = (data.delivered_at ?? null) as number | null;
          if (messageId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, deliveredAt } : msg,
              ),
            );
          }
          break;
        }
        case "messageSeen":
        case "messageRead": {
          const messageId = String(data.messageId ?? "");
          const seenBy = (data.seen_by ?? []) as Array<{ seen_at: number }>;
          if (messageId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === messageId ? { ...msg, seenBy } : msg,
              ),
            );
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
          const isAgent =
            data.role === "system_human" ||
            data.role === "system_ai_wasco" ||
            data.role === "system_ai_vector";
          const role = (isAgent ? "assistant" : "user") as
            | "assistant"
            | "user";
          setMessages((prev) => [
            ...prev,
            {
              id,
              role,
              content: String(data.text ?? ""),
              attachmentUrl: (data.attachment_url ?? null) as string | null,
              unix: (Number(data.timestamp) || null) as number | null,
              deliveredAt: (data.delivered_at ?? null) as number | null,
              seenBy: (data.seen_by ?? null) as Array<{
                seen_at: number;
              }> | null,
            },
          ]);
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
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant" as const,
                content:
                  "Authentication failed. Please refresh and try again.",
              },
            ]);
            setIsInputEnabled(false);
          }
          break;
        }
        default:
      }
    },
    [],
  );

  const connectSocket = useCallback(
    (startPayload: StartChatPayload, startName: string) => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (!wsUrl) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[useChat] socket opened, sending:", startPayload);
        socket.send(JSON.stringify(startPayload));
      };

      socket.onmessage = (event) => {
        console.log("[useChat] raw message:", event.data);
        try {
          const data = JSON.parse(event.data) as ServerMessage;
          console.log("[useChat] parsed:", data);

          if (data.tag === "bump" && data.bump_type) {
            handleBump(data, startName);
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = (event) => {
        console.log("[useChat] socket closed:", event.code, event.reason);
        setIsInputEnabled(false);
      };

      socket.onerror = (event) => {
        console.error("[useChat] socket error:", event);
        setIsInputEnabled(false);
      };
    },
    [handleBump, wsUrl],
  );

  const startChat = useCallback(
    (name: string, email: string) => {
      setUserInfo({ name, email });
      setChatStarted(true);
      setIsInputEnabled(false);
      setIsChatClosed(false);

      if (!wsUrl) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content:
              "Chat backend is not configured. Set NEXT_PUBLIC_CHAT_WS_URL to connect.",
          },
        ]);
        return;
      }

      const parsedId = email.trim() ? parseInt(email.trim(), 10) : null;

      const payload: StartChatPayload = {
        tag: "playerStartChatAndJoin",
        playerToken: null,
        clientId: "0b7e7dee87b1c3b98e72131173dfbbbf",
        playerName: name,
        playerId: Number.isNaN(parsedId) ? null : parsedId,
      };

      connectSocket(payload, name);
    },
    [connectSocket, wsUrl],
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!isInputEnabled) return;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content,
        },
      ]);

      const payload: SendMessagePayload = {
        tag: "sendMessage",
        chatId: chatIdRef.current,
        text: content,
      };

      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant" as const,
            content: "Message not sent. Connection is unavailable.",
          },
        ]);
        return;
      }

      socket.send(JSON.stringify(payload));
    },
    [isInputEnabled],
  );

  return {
    chatStarted,
    userInfo,
    messages,
    isInputEnabled,
    isChatClosed,
    startChat,
    sendMessage,
  };
}
