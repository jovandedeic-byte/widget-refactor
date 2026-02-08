"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

interface PreChatProps {
  onStartChat: (name: string, email: string) => void;
  hasToken?: boolean;
  onTokenStart?: () => void;
}

export function PreChat({
  onStartChat,
  hasToken = false,
  onTokenStart,
}: PreChatProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [id, setId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasToken && onTokenStart) {
      onTokenStart();
    } else if (name.trim()) {
      onStartChat(name, id);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <MessageCircle className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          {t.startConversation}
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          {hasToken
            ? t.clickBelowToStart
            : t.enterDetailsToStart}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        {!hasToken && (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">{t.nameOrEmail}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t.nameOrEmailPlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="id">{t.idLabel}</Label>
              <Input
                id="id"
                type="text"
                placeholder={t.idPlaceholder}
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
          </>
        )}

        <Button type="submit" className="w-full cursor-pointer">
          {t.startChat}
        </Button>
      </form>
    </div>
  );
}
