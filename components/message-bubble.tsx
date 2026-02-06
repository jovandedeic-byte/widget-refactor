import { cn } from "@/lib/utils";
import type { Message } from "./types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const hasAttachment = !!message.attachmentUrl;
  const isImageContent =
    message.content === "Image attachment" || message.content === "📷 Image";

  return (
    <div
      className={cn(
        "flex",
        message.role === "user" ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl text-sm",
          hasAttachment ? "p-1.5" : "px-4 py-2.5",
          message.role === "user"
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {hasAttachment && (
          <img
            src={message.attachmentUrl!}
            alt="Attachment"
            className="rounded-xl max-w-full max-h-48 object-contain"
          />
        )}
        {(!hasAttachment || !isImageContent) && message.content && (
          <p className={hasAttachment ? "px-2.5 py-1.5" : ""}>{message.content}</p>
        )}
      </div>
    </div>
  );
}
