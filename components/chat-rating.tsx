"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/i18n";

interface ChatRatingProps {
  ratingState: "none" | "pending" | "submitted";
  onSubmitRating: (rating: number) => void;
  onSkip: () => void;
  onNewChat: () => void;
}

export function ChatRating({
  ratingState,
  onSubmitRating,
  onSkip,
  onNewChat,
}: ChatRatingProps) {
  const t = useTranslations();
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  if (ratingState === "none") return null;

  return (
    <div className="flex flex-col items-center gap-4 p-6 border-y shadow-xl">
      {ratingState === "submitted" ? (
        <>
          <p className="text-sm text-muted-foreground">
            {t.thanksFeedback}
          </p>
          <Button
            onClick={onNewChat}
            variant="outline"
            size="sm"
            className="cursor-pointer"
          >
            {t.startNewChat}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            {t.howWasExperience}
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110 cursor-pointer"
                aria-label={t.rateStars(value)}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    value <= (hoveredRating || selectedRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (selectedRating > 0) onSubmitRating(selectedRating);
              }}
              size="sm"
              disabled={selectedRating === 0}
              className="cursor-pointer"
            >
              {t.submit}
            </Button>
            <Button
              onClick={onSkip}
              variant="ghost"
              size="sm"
              className="cursor-pointer"
            >
              {t.skip}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
