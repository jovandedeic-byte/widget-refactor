"use client";

import React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";

interface PreChatProps {
  onStartChat: (name: string, email: string) => void;
}

export function PreChat({ onStartChat }: PreChatProps) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
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
          Start a conversation
        </h2>
        <p className="text-sm text-muted-foreground text-center">
          Enter your details below to begin chatting with us.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name or Email</Label>
          <Input
            id="name"
            type="text"
            placeholder="Your name or you@example.com"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="id">Id</Label>
          <Input
            id="id"
            type="text"
            placeholder="Your unique id"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full">
          Start chat
        </Button>
      </form>
    </div>
  );
}
