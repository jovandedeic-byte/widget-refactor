"use client";

import { createContext, useContext } from "react";

export type Language = "en" | "me";

export interface Translations {
  chatTitle: string;
  endChat: string;
  closeChat: string;
  openChat: string;
  noMessages: string;
  invalidFileType: string;
  fileTooLarge: string;
  searchEmoji: string;
  typePlaceholder: string;
  attachFile: string;
  addEmoji: string;
  sendMessage: string;
  messageLimit: (current: number, max: number) => string;
  thanksFeedback: string;
  startNewChat: string;
  howWasExperience: string;
  rateStars: (value: number) => string;
  submit: string;
  skip: string;
  startConversation: string;
  clickBelowToStart: string;
  enterDetailsToStart: string;
  nameOrEmail: string;
  nameOrEmailPlaceholder: string;
  idLabel: string;
  idPlaceholder: string;
  startChat: string;
  poweredBy: string;
  greetingWithName: (name: string) => string;
  greetingNoName: string;
  authFailed: string;
  backendNotConfigured: string;
  connectionUnavailable: string;
  attachmentAlt: string;
  wascoAlt: string;
  dateToday: string;
  bumpCooldownTitle: string;
  bumpCooldownDescription: string;
  bumpCooldownTimer: (seconds: number) => string;
}

const en: Translations = {
  chatTitle: "Chat",
  endChat: "End Chat",
  closeChat: "Close chat",
  openChat: "Open chat",
  noMessages: "No messages yet. Start the conversation!",
  invalidFileType: "Please select an image (JPEG, PNG, or WebP).",
  fileTooLarge: "File size must be less than 5 MB.",
  searchEmoji: "Search emoji...",
  typePlaceholder: "Type a message...",
  attachFile: "Attach file",
  addEmoji: "Add emoji",
  sendMessage: "Send message",
  messageLimit: (current, max) => `Message limit: ${current}/${max} characters`,
  thanksFeedback: "Thanks for your feedback!",
  startNewChat: "Start new chat",
  howWasExperience: "How was your experience?",
  rateStars: (value) => `Rate ${value} star${value > 1 ? "s" : ""}`,
  submit: "Submit",
  skip: "Skip",
  startConversation: "Start a conversation",
  clickBelowToStart: "Click below to start chatting with us.",
  enterDetailsToStart: "Enter your details below to begin chatting with us.",
  nameOrEmail: "Name or Email",
  nameOrEmailPlaceholder: "Your name or you@example.com",
  idLabel: "Id",
  idPlaceholder: "Your unique id",
  startChat: "Start chat",
  poweredBy: "Powered by Gamblio",
  greetingWithName: (name) =>
    `Hi ${name}! Thanks for reaching out. How can I help you today?`,
  greetingNoName: "Hi! Thanks for reaching out. How can I help you today?",
  authFailed: "Authentication failed. Please refresh and try again.",
  backendNotConfigured:
    "Chat backend is not configured. Set NEXT_PUBLIC_CHAT_WS_URL to connect.",
  connectionUnavailable: "Message not sent. Connection is unavailable.",
  attachmentAlt: "Attachment",
  wascoAlt: "@wasco",
  dateToday: "Today",
  bumpCooldownTitle: "Chat temporarily blocked",
  bumpCooldownDescription: "You cannot continue this conversation right now.",
  bumpCooldownTimer: (seconds) =>
    `Please wait ${seconds} second${seconds === 1 ? "" : "s"}.`,
};

const me: Translations = {
  chatTitle: "Razgovor",
  endChat: "Zavrsi razgovor",
  closeChat: "Zatvori razgovor",
  openChat: "Otvori razgovor",
  noMessages: "Nema poruka. Zapocnite razgovor!",
  invalidFileType: "Izaberite sliku (JPEG, PNG ili WebP).",
  fileTooLarge: "Velicina fajla mora biti manja od 5 MB.",
  searchEmoji: "Pretrazi emoji...",
  typePlaceholder: "Unesite poruku...",
  attachFile: "Prikaci fajl",
  addEmoji: "Dodaj emoji",
  sendMessage: "Posalji poruku",
  messageLimit: (current, max) => `Ogranicenje: ${current}/${max} karaktera`,
  thanksFeedback: "Hvala na povratnoj informaciji!",
  startNewChat: "Zapocni novi razgovor",
  howWasExperience: "Kako ste zadovoljni uslugom?",
  rateStars: (value) => `Ocijenite ${value} zvjezdica`,
  submit: "Posalji",
  skip: "Preskoci",
  startConversation: "Zapocnite razgovor",
  clickBelowToStart: "Kliknite ispod da zapocnete razgovor.",
  enterDetailsToStart: "Unesite podatke ispod da zapocnete razgovor.",
  nameOrEmail: "Ime ili Email",
  nameOrEmailPlaceholder: "Vase ime ili vi@primjer.com",
  idLabel: "Id",
  idPlaceholder: "Vas jedinstveni id",
  startChat: "Zapocni razgovor",
  poweredBy: "Powered by Gamblio",
  greetingWithName: (name) =>
    `Zdravo ${name}! Hvala sto ste nas kontaktirali. Kako vam mozemo pomoci?`,
  greetingNoName:
    "Zdravo! Hvala sto ste nas kontaktirali. Kako vam mozemo pomoci?",
  authFailed:
    "Autentifikacija neuspjesna. Osvjezite stranicu i pokusajte ponovo.",
  backendNotConfigured:
    "Chat server nije konfigurisan. Postavite NEXT_PUBLIC_CHAT_WS_URL za konekciju.",
  connectionUnavailable: "Poruka nije poslata. Konekcija nije dostupna.",
  attachmentAlt: "Prilog",
  wascoAlt: "@wasco",
  dateToday: "Danas",
  bumpCooldownTitle: "Razgovor je privremeno blokiran",
  bumpCooldownDescription: "Trenutno ne mozete nastaviti ovu konverzaciju.",
  bumpCooldownTimer: (seconds) =>
    `Sacekajte ${seconds} sekund${seconds === 1 ? "" : "i"}.`,
};

export function getTranslations(lang: Language): Translations {
  return lang === "me" ? me : en;
}

export const LanguageContext = createContext<Language>("en");

export function useTranslations(): Translations {
  const lang = useContext(LanguageContext);
  return getTranslations(lang);
}
