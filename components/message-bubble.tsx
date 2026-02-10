import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "./types";
import { Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import Link from "next/link";
import { useTranslations } from "@/lib/i18n";

interface MessageBubbleProps {
  message: Message;
}

function renderContent(content: string): ReactNode {
  const parts = content.split(/(https:\/\/[^\s<>"'()]+)/g);
  if (parts.length === 1) return content;

  return parts.map((part, i) =>
    part.startsWith("https://") ? (
      <Link
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all hover:opacity-80"
      >
        {part}
      </Link>
    ) : (
      part
    )
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const t = useTranslations();
  const hasAttachment = !!message.attachmentUrl;
  const isImageContent =
    message.content === "Image attachment" || message.content === "📷 Image";
  const isDelivered = message.role === "user" && message.deliveredAt != null;
  const isRead =
    message.role === "user" &&
    Array.isArray(message.seenBy) &&
    message.seenBy.length > 0;
  const timestamp = message.unix
    ? new Date(message.unix * 1000).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : null;
  // data-message-id on agent messages lets IntersectionObserver detect visibility for read receipts
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        message.role === "user" ? "justify-end" : "justify-start"
      )}
    >
      {message.role !== "user" && (
        <Avatar className="shrink-0">
          <AvatarImage src="https://app.gamblio.ai/wasco.png" alt={t.wascoAlt} />
          <AvatarFallback>W</AvatarFallback>
        </Avatar>
      )}

      <div
        {...(message.role === "assistant" && message.unix ? { "data-message-id": message.id } : {})}
        className={cn(
          "flex items-end gap-1.5",
          message.role === "user" ? "flex-row-reverse" : "flex-row"
        )}
      >
        <div
          className={cn(
            "max-w-[80%] rounded-2xl text-sm",
            hasAttachment ? "p-1.5" : "px-4 py-2.5",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-gray-200 dark:bg-muted text-foreground rounded-bl-md"
          )}
        >
          {hasAttachment && (
            <img
              src={message.attachmentUrl!}
              alt={t.attachmentAlt}
              className="rounded-xl max-w-full max-h-48 object-contain"
            />
          )}
          {(!hasAttachment || !isImageContent) && message.content && (
            <p className={hasAttachment ? "px-2.5 py-1.5" : ""}>
              {renderContent(message.content)}
            </p>
          )}
        </div>

        {timestamp && (
          <span className="text-[11px] text-muted-foreground/80 whitespace-nowrap pb-1">
            {timestamp}
          </span>
        )}
      </div>

      {message.role === "user" && (
        <>
          {isDelivered && !isRead && <Check className="h-4 w-4 shrink-0 text-muted-foreground" />}
          {isRead && isDelivered && (
            <CheckCheck className="h-4 w-4 shrink-0 text-green-500" />
          )}
        </>
      )}
    </div>
  );
}
