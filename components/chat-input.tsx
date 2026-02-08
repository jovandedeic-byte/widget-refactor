"use client";

import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Smile, Send, X } from "lucide-react";
import EmojiPicker, {
  Theme,
  EmojiStyle,
  EmojiClickData,
} from "emoji-picker-react";
import { useTranslations } from "@/lib/i18n";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_CHARS = 600;
const WARN_THRESHOLD = 580;
const DRAFT_KEY = "gamblio_chat_draft";

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: string | null) => void;
  disabled?: boolean;
  persistDraft?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false, persistDraft = false }: ChatInputProps) {
  const t = useTranslations();
  const [message, setMessage] = useState(() => {
    if (persistDraft && typeof window !== "undefined") {
      return localStorage.getItem(DRAFT_KEY) ?? "";
    }
    return "";
  });
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close emoji picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Debounced draft persistence
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!persistDraft) return;
    draftTimerRef.current = setTimeout(() => {
      if (message) {
        localStorage.setItem(DRAFT_KEY, message);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [message, persistDraft]);

  // Update warning state when message changes
  useEffect(() => {
    setShowLimitWarning(message.length >= WARN_THRESHOLD);
  }, [message]);

  // Cleanup preview blob URL
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const removeFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(t.invalidFileType);
        e.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(t.fileTooLarge);
        e.target.value = "";
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [previewUrl]
  );

  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text && !selectedFile) return;
    if (disabled) return;

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        onSendMessage(text || "Image attachment", reader.result as string);
        removeFile();
      };
      reader.onerror = () => {
        removeFile();
      };
      reader.readAsDataURL(selectedFile);
    } else {
      onSendMessage(text);
    }

    setMessage("");
    if (persistDraft) localStorage.removeItem(DRAFT_KEY);
  }, [message, selectedFile, disabled, onSendMessage, removeFile, persistDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => {
      const next = prev + emojiData.emoji;
      return next.length > MAX_CHARS ? next.slice(0, MAX_CHARS) : next;
    });
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > MAX_CHARS) {
      setMessage(value.slice(0, MAX_CHARS));
    } else {
      setMessage(value);
    }
  };

  return (
    <div className="border-t border-border p-3 bg-background relative">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div ref={emojiRef} className="absolute bottom-full right-0 mb-2 z-50">
          <EmojiPicker
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.NATIVE}
            onEmojiClick={handleEmojiClick}
            width={320}
            height={350}
            searchPlaceholder={t.searchEmoji}
            lazyLoadEmojis
            previewConfig={{ showPreview: false }}
          />
        </div>
      )}

      {/* File Preview */}
      {selectedFile && previewUrl && (
        <div className="flex items-center gap-2 mb-2 p-2 rounded-md bg-muted">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-12 w-12 rounded object-cover"
          />
          <span className="flex-1 text-xs text-muted-foreground truncate">
            {selectedFile.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
            onClick={removeFile}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* File Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t.attachFile}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        {/* Emoji Toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t.addEmoji}
          onClick={() => setShowEmojiPicker((prev) => !prev)}
        >
          <Smile className="h-5 w-5" />
        </Button>

        <Input
          ref={inputRef}
          type="text"
          placeholder={t.typePlaceholder}
          maxLength={MAX_CHARS}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={disabled}
        />

        <Button
          type="submit"
          size="icon"
          disabled={(!message.trim() && !selectedFile) || disabled}
          aria-label={t.sendMessage}
          className="cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {showLimitWarning && (
        <p className="text-xs text-destructive mt-1 px-1">
          {t.messageLimit(message.length, MAX_CHARS)}
        </p>
      )}
    </div>
  );
}
