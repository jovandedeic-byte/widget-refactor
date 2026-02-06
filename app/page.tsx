import { FloatingChatWidget } from "@/components/floating-chat-widget";

const CLIENT_ID =
  process.env.NEXT_PUBLIC_CLIENT_ID || "0b7e7dee87b1c3b98e72131173dfbbbf";
const PLAYER_TOKEN = process.env.NEXT_PUBLIC_PLAYER_TOKEN || null;

export default function Home() {
  return <FloatingChatWidget clientId={CLIENT_ID} playerToken={PLAYER_TOKEN} />;
}
