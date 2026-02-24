"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "@/lib/i18n";

interface ChatBumpScreenProps {
  secondsRemaining?: number;
}

export function ChatBumpScreen({ secondsRemaining = 0 }: ChatBumpScreenProps) {
  const t = useTranslations();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <div className="flex justify-center">
          <ShieldAlert className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{t.bumpCooldownTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.bumpCooldownDescription}</p>
        <p className="text-xs text-muted-foreground">{t.bumpCooldownTimer(Math.max(0, secondsRemaining))}</p>
      </div>
    </div>
  );
}
