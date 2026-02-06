"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  if (ratingState === "none") return null;

  return (
    <div className="flex flex-col items-center gap-4 p-6 border-y shadow-xl">
      {ratingState === "submitted" ? (
        <>
          <p className="text-sm text-muted-foreground">
            Thanks for your feedback!
          </p>
          <Button onClick={onNewChat} variant="outline" size="sm">
            Start new chat
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">
            How was your experience?
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSelectedRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-6 w-6 transition-colors",
                    value <= (hoveredRating || selectedRating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground",
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
            >
              Submit
            </Button>
            <Button onClick={onSkip} variant="ghost" size="sm">
              Skip
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
