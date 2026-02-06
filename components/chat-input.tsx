"use client";

import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Smile, Send, X } from "lucide-react";
import EmojiPicker, { Theme, EmojiStyle, EmojiClickData } from "emoji-picker-react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

interface ChatInputProps {
  onSendMessage: (message: string, attachment?: string | null) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
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
        alert("Please select an image (JPEG, PNG, or WebP).");
        e.target.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert("File size must be less than 5 MB.");
        e.target.value = "";
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [previewUrl],
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
  }, [message, selectedFile, disabled, onSendMessage, removeFile]);

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
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
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
            searchPlaceholder="Search emoji..."
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
          aria-label="Attach file"
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
          aria-label="Add emoji"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
        >
          <Smile className="h-5 w-5" />
        </Button>

        <Input
          ref={inputRef}
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
          disabled={disabled}
        />

        <Button
          type="submit"
          size="icon"
          disabled={(!message.trim() && !selectedFile) || disabled}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
