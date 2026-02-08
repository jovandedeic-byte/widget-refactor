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

  // data-message-id on agent messages lets IntersectionObserver detect visibility for read receipts
  return (
    <div
      {...(message.role === "assistant" && message.unix ? { "data-message-id": message.id } : {})}
      className={cn(
        "flex ",
        message.role === "user"
          ? "justify-end flex-col items-end"
          : "justify-start items-end gap-2"
      )}
    >
      {message.role !== "user" && (
        <Avatar>
          <AvatarImage src="https://app.gamblio.ai/wasco.png" alt={t.wascoAlt} />
          <AvatarFallback>W</AvatarFallback>
        </Avatar>
      )}

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
      {isDelivered && !isRead && <Check className="h-4 w-4 text-gray-500" />}
      {isRead && isDelivered && (
        <CheckCheck className="h-4 w-4 text-green-500" />
      )}
    </div>
  );
}
