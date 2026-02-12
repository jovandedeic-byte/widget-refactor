import type { Game } from "@/components/types";

/**
 * Dummy game data for local development when the recommendation API is unavailable.
 * Toggle with NEXT_PUBLIC_USE_DUMMY_RECOMMENDATIONS=true in .env
 */
export const dummyRecommendations: Game[] = [
  {
    id: "dummy-sweet-bonanza",
    title: "Sweet Bonanza",
    genre: "Slots",
    cover: "https://picsum.photos/seed/sweet/300/400",
    accentColor: "#daa520",
    tag: "HOT",
  },
  {
    id: "dummy-gates-olympus",
    title: "Gates of Olympus",
    genre: "Slots",
    cover: "https://picsum.photos/seed/olympus/300/400",
    accentColor: "#daa520",
    tag: "POPULAR",
  },
  {
    id: "dummy-sugar-rush",
    title: "Sugar Rush",
    genre: "Slots",
    cover: "https://picsum.photos/seed/sugar/300/400",
    accentColor: "#daa520",
    tag: "NEW",
  },
  {
    id: "dummy-mega-moolah",
    title: "Mega Moolah",
    genre: "Jackpot",
    cover: "https://picsum.photos/seed/mega/300/400",
    accentColor: "#daa520",
    tag: "JACKPOT",
  },
  {
    id: "dummy-book-dead",
    title: "Book of Dead",
    genre: "Slots",
    cover: "https://picsum.photos/seed/book/300/400",
    accentColor: "#daa520",
  },
  {
    id: "dummy-starburst",
    title: "Starburst",
    genre: "Slots",
    cover: "https://picsum.photos/seed/starburst/300/400",
    accentColor: "#daa520",
    tag: "POPULAR",
  },
  {
    id: "dummy-big-bass",
    title: "Big Bass Bonanza",
    genre: "Fishing",
    cover: "https://picsum.photos/seed/bass/300/400",
    accentColor: "#daa520",
    tag: "HOT",
  },
  {
    id: "dummy-lightning-roulette",
    title: "Lightning Roulette",
    genre: "Live Casino",
    cover: "https://picsum.photos/seed/roulette/300/400",
    accentColor: "#daa520",
  },
];
