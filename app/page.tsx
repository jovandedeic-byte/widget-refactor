import { FloatingChatWidget } from "@/components/floating-chat-widget"

export default function Home() {
  return (
    <main className="min-h-screen bg-muted/30">
      {/* Demo page content */}
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Welcome to Our Site
        </h1>
        <p className="text-muted-foreground mb-4">
          This is a demo page to showcase the floating chat widget. Click the
          chat button in the bottom-right corner to start a conversation.
        </p>
        <p className="text-muted-foreground">
          The chat widget supports a pre-chat form to collect user information,
          real-time messaging with auto-scroll, and smooth open/close animations.
        </p>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </main>
  )
}
