"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { Message, UserInfo, PersistedSession } from "./types";
import { getTranslations, type Language } from "@/lib/i18n";

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
  timestamp?: number;
  error?: string;
};

const SESSION_KEY = "gamblio_chat_session";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* SSR / quota */
  }
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
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export interface UseChatOptions {
  clientId: string;
  playerToken?: string | null;
  language?: Language;
}

export function useChat({
  clientId,
  playerToken = null,
  language = "en",
}: UseChatOptions) {
  const [chatStarted, setChatStarted] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [ratingState, setRatingState] = useState<
    "none" | "pending" | "submitted"
  >("none");

  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const chatIdRef = useRef<string | null>(null);
  const playerTokenRef = useRef<string | null>(playerToken);
  const playerNameRef = useRef<string | null>(null);
  const playerIdRef = useRef<number | null>(null);
  const welcomeMessageShownRef = useRef(false);
  const autoStartedRef = useRef(false);
  const isResumingRef = useRef(false);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMessagesRef = useRef<Message[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const hasUserMessagesRef = useRef(false);

  const t = useMemo(() => getTranslations(language), [language]);

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
                : { name: backendName, email: "" }
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
                  ? t.greetingWithName(displayName)
                  : t.greetingNoName,
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
          const nextChatId = (data.chat ?? data.chatId ?? chatIdRef.current) as
            | string
            | null;
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
                msg.id === messageId ? { ...msg, deliveredAt } : msg
              )
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
                msg.id === messageId ? { ...msg, seenBy } : msg
              )
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
                (entry) => entry.seen_at === seenAt
              );
              return hasCurrentSeen
                ? msg
                : { ...msg, seenBy: [...seenBy, { seen_at: seenAt }] };
            })
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

          // Player's message echo from backend: replace optimistic message with server version (server id + delivered_at)
          if (!isAgent) {
            const serverId = String(data.id ?? data.messageId ?? "");
            const text = String(data.text ?? "");
            const deliveredAt = (data.delivered_at ?? null) as number | null;
            const seenBy = (data.seen_by ?? null) as Array<{
              seen_at: number;
            }> | null;
            setMessages((prev) => {
              // Match last undelivered user message with same content (most recent send)
              let idx = -1;
              for (let i = prev.length - 1; i >= 0; i--) {
                const m = prev[i];
                if (
                  m.role === "user" &&
                  m.deliveredAt == null &&
                  m.content === text
                ) {
                  idx = i;
                  break;
                }
              }
              const serverMsg = {
                id: serverId,
                role: "user" as const,
                content: text,
                attachmentUrl: (data.attachment_url ?? null) as string | null,
                unix: (Number(data.timestamp) ||
                  Number(payload.timestamp) ||
                  null) as number | null,
                deliveredAt,
                seenBy,
              };
              if (idx === -1) return [...prev, serverMsg];
              return prev.map((m, i) => (i === idx ? serverMsg : m));
            });
            break;
          }

          const id = String(data.id ?? data.messageId ?? crypto.randomUUID());
          const agentMsg: Message = {
            id,
            role: "assistant" as const,
            content: String(data.text ?? ""),
            attachmentUrl: (data.attachment_url ?? null) as string | null,
            unix: (Number(data.timestamp) ||
              Number(payload.timestamp) ||
              null) as number | null,
            deliveredAt: (data.delivered_at ?? null) as number | null,
            seenBy: (data.seen_by ?? null) as Array<{
              seen_at: number;
            }> | null,
          };

          // Queue behind typing indicator
          if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          pendingMessagesRef.current.push(agentMsg);

          if (!isTypingRef.current) {
            isTypingRef.current = true;
            setIsTyping(true);
          }

          // Show queued messages 1s after the last one arrives
          if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
          messageTimerRef.current = setTimeout(() => {
            const pending = pendingMessagesRef.current;
            pendingMessagesRef.current = [];
            isTypingRef.current = false;
            setIsTyping(false);
            setMessages((prev) => [...prev, ...pending]);
          }, 1000);
          break;
        }
        case "switchedStatusToClosed":
        case "chatClosedBySystemAlready": {
          // Only show rating if user sent at least one message
          if (hasUserMessagesRef.current) {
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
          } else {
            // No messages sent - reset chat so user can start fresh
            clearSession();
            chatIdRef.current = null;
            welcomeMessageShownRef.current = false;
            hasUserMessagesRef.current = false;
            setChatStarted(false);
            setMessages([]);
            setIsInputEnabled(false);
            setIsChatClosed(false);
            setRatingState("none");
            if (socketRef.current) {
              socketRef.current.close();
              socketRef.current = null;
            }
          }
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
                content: t.authFailed,
              },
            ]);
            setIsInputEnabled(false);
          }
          break;
        }
        default:
      }
    },
    [t]
  );

  const handleExistingMessages = useCallback(
    (payload: {
      messages?: Array<Record<string, unknown>>;
      chat_id?: string;
    }) => {
      const incoming = Array.isArray(payload.messages) ? payload.messages : [];

      if (payload.chat_id) {
        chatIdRef.current = payload.chat_id;
      }

      const parsed: Message[] = incoming
        .filter(
          (msg) =>
            msg &&
            msg.role !== "system_event" &&
            msg.role !== "system_chat_rating" &&
            msg.is_sent_safely !== true
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

      if (parsed.length > 0) {
        // Replace messages entirely with server history, skip welcome message
        welcomeMessageShownRef.current = true;
        // Check if there are user messages in history
        hasUserMessagesRef.current = parsed.some((msg) => msg.role === "user");
        setMessages(parsed);
      }
    },
    []
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
        socket.send(JSON.stringify(payload));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.tag === "bump" && data.bump_type) {
            handleBump(data as ServerMessage, startName ?? "");
          } else if (data.tag === "existingMessages") {
            handleExistingMessages(data);
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      socket.onclose = () => {
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

      socket.onerror = () => {
        setIsInputEnabled(false);
      };
    },
    [handleBump, handleExistingMessages, wsUrl]
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
            content: t.backendNotConfigured,
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
    [connectSocket, wsUrl, clientId, t]
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

      hasUserMessagesRef.current = true;

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
            content: t.connectionUnavailable,
          },
        ]);
        return;
      }

      socket.send(JSON.stringify(payload));

      // Show typing dots after 1.5s (cleared when agent message arrives)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = true;
        setIsTyping(true);
      }, 1500);
    },
    [isInputEnabled, t]
  );

  const markMessagesAsRead = useCallback((ids: string[]) => {
    const unseen = ids.filter((id) => !seenIdsRef.current.has(id));
    if (unseen.length === 0) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN || !chatIdRef.current)
      return;

    unseen.forEach((id) => seenIdsRef.current.add(id));
    const numericIds = unseen.map(Number).filter((n) => !isNaN(n));
    if (numericIds.length === 0) return;
    socket.send(
      JSON.stringify({
        tag: "playerMarkMessagesAsRead",
        chatId: chatIdRef.current,
        messageIds: numericIds,
      })
    );
  }, []);

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

    // Only show rating if user sent at least one message
    if (hasUserMessagesRef.current) {
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
    } else {
      // No messages sent - reset chat so user can start fresh
      clearSession();
      chatIdRef.current = null;
      welcomeMessageShownRef.current = false;
      hasUserMessagesRef.current = false;
      setChatStarted(false);
      setMessages([]);
      setIsInputEnabled(false);
      setIsChatClosed(false);
      setRatingState("none");
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    }
  }, [clientId]);

  const submitRating = useCallback(
    (rating: number) => {
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
    },
    [clientId, wsUrl]
  );

  const resetChat = useCallback(() => {
    clearSession();
    chatIdRef.current = null;
    playerTokenRef.current = playerToken;
    welcomeMessageShownRef.current = false;
    autoStartedRef.current = false;
    hasUserMessagesRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    pendingMessagesRef.current = [];
    seenIdsRef.current.clear();
    isTypingRef.current = false;
    setChatStarted(false);
    setMessages([]);
    setIsInputEnabled(false);
    setIsChatClosed(false);
    setRatingState("none");
    setIsTyping(false);
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

      // Restore userInfo so avatar/name survives refresh
      if (session.playerName) {
        setUserInfo((prev) =>
          prev
            ? { ...prev, name: session.playerName! }
            : { name: session.playerName!, email: "" }
        );
      }

      // Show welcome message while waiting for server history
      const displayName = session.playerName || "";
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: displayName
            ? t.greetingWithName(displayName)
            : t.greetingNoName,
        },
      ]);

      // Set UI state immediately
      setChatStarted(true);
      setIsInputEnabled(false); // enabled by rejoinChatSuccess
      setIsChatClosed(session.status === "closed");
      setRatingState(
        session.status === "closed"
          ? session.hasSubmittedRating
            ? "submitted"
            : "pending"
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
    [clientId, playerToken, connectSocket, t]
  );

  // Clean up WebSocket on unmount — prevents Strict Mode double-mount
  // from leaving an orphaned socket whose onclose handler clears the session.
  useEffect(() => {
    return () => {
      isResumingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  // Restore session on mount (synchronous localStorage read — no waiting)
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const session = loadSession();
    if (!session) return;

    resumeChat(session);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-tab sync: the `storage` event fires in OTHER tabs when localStorage changes.
  // When tab A saves/clears the session, tabs B/C/… receive the event and sync their UI.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY) return;

      // Session was cleared in another tab → reset this tab
      if (!event.newValue) {
        if (chatIdRef.current) {
          resetChat();
        }
        return;
      }

      try {
        const session = JSON.parse(event.newValue) as PersistedSession;
        if (!session.chatId) return;
        if (Date.now() - session.timestamp > SESSION_MAX_AGE_MS) return;

        // Same chat — sync state changes (closed, rating)
        if (session.chatId === chatIdRef.current) {
          if (session.status === "closed") {
            setIsChatClosed(true);
            setIsInputEnabled(false);
            setRatingState(
              session.hasSubmittedRating ? "submitted" : "pending"
            );
          }
          if (session.hasSubmittedRating) {
            setRatingState("submitted");
          }
          return;
        }

        // Different chat or no current chat — resume it
        resumeChat(session);
      } catch {
        // ignore parse errors
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [resetChat, resumeChat]);

  return {
    chatStarted,
    userInfo,
    messages,
    isInputEnabled,
    isChatClosed,
    isTyping,
    ratingState,
    hasToken,
    startChat,
    autoStart,
    sendMessage,
    markMessagesAsRead,
    endChat,
    submitRating,
    resetChat,
  };
}
