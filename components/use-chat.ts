"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, UserInfo, PersistedSession } from "./types";

type StartChatPayload = {
  tag: "playerStartChatAndJoin";
  playerToken: string | null;
  clientId: string | null;
  playerName: string | null;
  playerId: number | null;
};

type SendMessagePayload = {
  tag: "playerSendMessage";
  playerToken: string | null;
  chatId: string | null;
  message: string;
  attachment: string | null;
};

type EndChatPayload = {
  tag: "playerLeaveChatAndClose";
  playerToken: string | null;
  chatId: string | null;
  clientId: string | null;
  playerName: string | null;
};

type RatingPayload = {
  tag: "playerNewChatRating";
  chatId: string | null;
  clientId: string | null;
  rating: number;
  playerToken?: string | null;
  playerId: number | null;
};

type ResumeChatPayload = {
  tag: "playerResumeChat";
  chatId: string;
  playerToken: string | null;
  clientId: string;
  playerId: number | null;
};

type ServerMessage = {
  tag?: string;
  bump_type?: string;
  bump_data?: Record<string, unknown>;
  error?: string;
};

const SESSION_KEY = "gamblio_chat_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch { /* SSR / quota */ }
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.chatId) return null;
    if (Date.now() - parsed.timestamp > SESSION_MAX_AGE_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

export interface UseChatOptions {
  clientId: string;
  playerToken?: string | null;
}

export function useChat({ clientId, playerToken = null }: UseChatOptions) {
  const [chatStarted, setChatStarted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [ratingState, setRatingState] = useState<
    "none" | "pending" | "submitted"
  >("none");

  const socketRef = useRef<WebSocket | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const playerTokenRef = useRef<string | null>(playerToken);
  const playerNameRef = useRef<string | null>(null);
  const playerIdRef = useRef<number | null>(null);
  const welcomeMessageShownRef = useRef(false);
  const autoStartedRef = useRef(false);
  const isResumingRef = useRef(false);

  const hasToken = !!playerToken;
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

          // Store token if backend returns one
          if (data.playerToken) {
            playerTokenRef.current = data.playerToken as string;
          }

          setChatStarted(true);
          setIsInputEnabled(true);
          setIsChatClosed(false);
          setRatingState("none");

          const backendName = data.full_name as string | undefined;
          if (backendName) {
            playerNameRef.current = backendName;
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

          saveSession({
            chatId: chatIdRef.current!,
            playerToken: playerTokenRef.current,
            playerName: playerNameRef.current,
            playerId: playerIdRef.current,
            status: "active",
            hasSubmittedRating: false,
            timestamp: Date.now(),
          });
          break;
        }
        case "rejoinChatSuccess": {
          const nextChatId = (
            data.chat ??
            data.chatId ??
            chatIdRef.current
          ) as string | null;
          chatIdRef.current = nextChatId;

          // Capture updated token if backend returns one
          if (data.playerToken) {
            playerTokenRef.current = data.playerToken as string;
          }
          isResumingRef.current = false;

          setChatStarted(true);
          setIsChatClosed(false);
          setIsInputEnabled(true);

          saveSession({
            chatId: chatIdRef.current!,
            playerToken: playerTokenRef.current,
            playerName: playerNameRef.current,
            playerId: playerIdRef.current,
            status: "active",
            hasSubmittedRating: false,
            timestamp: Date.now(),
          });
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

          const isAgent =
            data.role === "system_human" ||
            data.role === "system_ai_wasco" ||
            data.role === "system_ai_vector";

          // Skip player's own messages — already added optimistically in sendMessage()
          if (!isAgent) break;

          const id = String(data.id ?? data.messageId ?? crypto.randomUUID());
          setMessages((prev) => [
            ...prev,
            {
              id,
              role: "assistant" as const,
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
          setRatingState("pending");

          saveSession({
            chatId: chatIdRef.current!,
            playerToken: playerTokenRef.current,
            playerName: playerNameRef.current,
            playerId: playerIdRef.current,
            status: "closed",
            hasSubmittedRating: false,
            timestamp: Date.now(),
          });
          break;
        }
        case "chatRatingSuccess": {
          setRatingState("submitted");

          saveSession({
            chatId: chatIdRef.current!,
            playerToken: playerTokenRef.current,
            playerName: playerNameRef.current,
            playerId: playerIdRef.current,
            status: "closed",
            hasSubmittedRating: true,
            timestamp: Date.now(),
          });
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

  const handleExistingMessages = useCallback(
    (payload: { messages?: Array<Record<string, unknown>>; chat_id?: string }) => {
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];
      console.log("[useChat] existingMessages count:", incoming.length);
      if (incoming.length > 0) {
        console.log("[useChat] first message sample:", incoming[0]);
      }

      if (payload.chat_id) {
        chatIdRef.current = payload.chat_id;
      }

      const parsed: Message[] = incoming
        .filter(
          (msg) =>
            msg &&
            msg.role !== "system_event" &&
            msg.role !== "system_chat_rating" &&
            msg.is_sent_safely !== true,
        )
        .map((msg) => {
          const role = String(msg.role ?? "");
          const isAgent =
            role === "system_human" ||
            role === "system_ai_wasco" ||
            role === "system_ai_vector";
          return {
            id: String(msg.id ?? msg.messageId ?? crypto.randomUUID()),
            role: (isAgent ? "assistant" : "user") as "assistant" | "user",
            content: String(msg.content ?? msg.text ?? ""),
            attachmentUrl: (msg.attachment_url as string) ?? null,
            unix: (Number(msg.timestamp) || null) as number | null,
            deliveredAt: (msg.delivered_at ?? null) as number | null,
            seenBy: (msg.seen_by ?? null) as Array<{ seen_at: number }> | null,
          };
        });

      console.log("[useChat] parsed messages count:", parsed.length);

      if (parsed.length > 0) {
        // Replace messages entirely with server history, skip welcome message
        welcomeMessageShownRef.current = true;
        setMessages(parsed);
      }
    },
    [],
  );

  const connectSocket = useCallback(
    (payload: StartChatPayload | ResumeChatPayload, startName?: string) => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      if (!wsUrl) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("[useChat] socket opened, sending:", payload);
        socket.send(JSON.stringify(payload));
      };

      socket.onmessage = (event) => {
        console.log("[useChat] raw message:", event.data);
        try {
          const data = JSON.parse(event.data);
          console.log("[useChat] parsed:", data);

          if (data.tag === "bump" && data.bump_type) {
            handleBump(data as ServerMessage, startName ?? "");
          } else if (data.tag === "existingMessages") {
            handleExistingMessages(data);
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = (event) => {
        console.log("[useChat] socket closed:", event.code, event.reason);
        setIsInputEnabled(false);
        // If socket closes during resume attempt, session is stale — reset
        if (isResumingRef.current) {
          isResumingRef.current = false;
          clearSession();
          setChatStarted(false);
          setMessages([]);
          setIsChatClosed(false);
          setRatingState("none");
          welcomeMessageShownRef.current = false;
        }
      };

      socket.onerror = (event) => {
        console.error("[useChat] socket error:", event);
        setIsInputEnabled(false);
      };
    },
    [handleBump, handleExistingMessages, wsUrl],
  );

  const startChat = useCallback(
    (name: string, email: string) => {
      setUserInfo({ name, email });
      setChatStarted(true);
      setIsInputEnabled(false);
      setIsChatClosed(false);
      setRatingState("none");

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
      playerNameRef.current = name;
      playerIdRef.current = Number.isNaN(parsedId) ? null : parsedId;

      const payload: StartChatPayload = {
        tag: "playerStartChatAndJoin",
        playerToken: playerTokenRef.current,
        clientId: clientId,
        playerName: name,
        playerId: playerIdRef.current,
      };

      connectSocket(payload, name);
    },
    [connectSocket, wsUrl, clientId],
  );

  const autoStart = useCallback(() => {
    if (autoStartedRef.current || !playerToken || !wsUrl) return;
    autoStartedRef.current = true;

    setChatStarted(true);
    setIsInputEnabled(false);
    setIsChatClosed(false);
    setRatingState("none");

    const payload: StartChatPayload = {
      tag: "playerStartChatAndJoin",
      playerToken: playerToken,
      clientId: clientId,
      playerName: "",
      playerId: null,
    };

    connectSocket(payload, "");
  }, [connectSocket, wsUrl, clientId, playerToken]);

  const sendMessage = useCallback(
    (content: string, attachment?: string | null) => {
      if (!isInputEnabled) return;

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          content,
          attachmentUrl: attachment ?? null,
        },
      ]);

      const payload: SendMessagePayload = {
        tag: "playerSendMessage",
        playerToken: playerTokenRef.current,
        chatId: chatIdRef.current,
        message: content,
        attachment: attachment ?? null,
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

  const endChat = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !chatIdRef.current) {
      return;
    }

    const payload: EndChatPayload = {
      tag: "playerLeaveChatAndClose",
      playerToken: playerTokenRef.current,
      chatId: chatIdRef.current,
      clientId: clientId,
      playerName: playerNameRef.current,
    };

    socket.send(JSON.stringify(payload));
    setIsChatClosed(true);
    setIsInputEnabled(false);
    setRatingState("pending");

    saveSession({
      chatId: chatIdRef.current!,
      playerToken: playerTokenRef.current,
      playerName: playerNameRef.current,
      playerId: playerIdRef.current,
      status: "closed",
      hasSubmittedRating: false,
      timestamp: Date.now(),
    });
  }, [clientId]);

  const submitRating = useCallback((rating: number) => {
    if (!chatIdRef.current) return;

    const ratingPayload: RatingPayload = {
      tag: "playerNewChatRating",
      chatId: chatIdRef.current,
      clientId: clientId,
      rating,
      playerId: playerIdRef.current,
    };

    if (playerTokenRef.current) {
      ratingPayload.playerToken = playerTokenRef.current;
    }

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(ratingPayload));
      setRatingState("submitted");
      saveSession({
        chatId: chatIdRef.current!,
        playerToken: playerTokenRef.current,
        playerName: playerNameRef.current,
        playerId: playerIdRef.current,
        status: "closed",
        hasSubmittedRating: true,
        timestamp: Date.now(),
      });
      return;
    }

    // No open socket (e.g. page was refreshed) — open one to send the rating
    if (!wsUrl) return;
    const tempSocket = new WebSocket(wsUrl);

    tempSocket.onopen = () => {
      tempSocket.send(JSON.stringify(ratingPayload));
      setRatingState("submitted");
      saveSession({
        chatId: chatIdRef.current!,
        playerToken: playerTokenRef.current,
        playerName: playerNameRef.current,
        playerId: playerIdRef.current,
        status: "closed",
        hasSubmittedRating: true,
        timestamp: Date.now(),
      });
      tempSocket.close();
    };

    tempSocket.onerror = () => {
      tempSocket.close();
    };
  }, [clientId, wsUrl]);

  const resetChat = useCallback(() => {
    clearSession();
    chatIdRef.current = null;
    playerTokenRef.current = playerToken;
    welcomeMessageShownRef.current = false;
    autoStartedRef.current = false;
    setChatStarted(false);
    setMessages([]);
    setIsInputEnabled(false);
    setIsChatClosed(false);
    setRatingState("none");
    setUserInfo(null);

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, [playerToken]);

  const resumeChat = useCallback(
    (session: PersistedSession) => {
      // Restore refs
      chatIdRef.current = session.chatId;
      playerNameRef.current = session.playerName;
      playerIdRef.current = session.playerId;
      welcomeMessageShownRef.current = true; // server sends existingMessages

      // Prefer prop token over saved (user may have re-authenticated)
      if (playerToken) {
        playerTokenRef.current = playerToken;
      } else {
        playerTokenRef.current = session.playerToken;
      }

      // Set UI state immediately
      setChatStarted(true);
      setIsInputEnabled(false); // enabled by rejoinChatSuccess
      setIsChatClosed(session.status === "closed");
      setRatingState(
        session.status === "closed"
          ? session.hasSubmittedRating ? "submitted" : "pending"
          : "none"
      );

      // Closed session — just restore UI (rating or thanks), no WS reconnect
      if (session.status === "closed") {
        return;
      }

      // Active session — reconnect via playerResumeChat
      isResumingRef.current = true;
      const payload: ResumeChatPayload = {
        tag: "playerResumeChat",
        chatId: session.chatId,
        playerToken: playerTokenRef.current,
        clientId: clientId,
        playerId: session.playerId,
      };
      connectSocket(payload);
    },
    [clientId, playerToken, connectSocket],
  );

  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const session = loadSession();
    if (!session) return;

    console.log("[useChat] Restoring session:", session.chatId, "status:", session.status);
    resumeChat(session);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    chatStarted,
    userInfo,
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
  };
}
