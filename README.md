# Gamblio Chat Widget

A live chat widget built with Next.js for embedding on third-party sites. Supports **iframe + postMessage** integration and an optional **loader script** for secure handling of `clientId` and `playerToken`—credentials are never exposed in the URL.

## Overview

The chat widget provides:

- **Embed widget** – Full-page chat UI for iframe embedding
- **Floating widget** – Chat button with popup (used on the main demo page)
- **Secure config** – Sensitive credentials (`clientId`, `playerToken`) are passed via `postMessage`, never exposed in the URL

## Integration Methods

The embed page receives config via the `postMessage` API only—never via URL query params. This keeps `clientId` and `playerToken` out of the iframe `src`, browser history, referrers, and server logs.

### 1. Iframe + postMessage (manual)

Embed the iframe with **no credentials in the URL** and add a small script on the parent page to pass config via `postMessage`. Credentials stay in your page’s JavaScript context and never appear in the iframe `src`, history, or referrers.

#### How it works

1. The parent page creates an iframe pointing to `/embed` (no query params).
2. The iframe loads and posts `gamblio-chat-ready` to the parent.
3. The parent script receives that message and sends `gamblio-chat-init` with `clientId` and optional `playerToken`.
4. The chat initializes inside the iframe.

#### Example

```html
<!-- Create the iframe (no credentials in src) -->
<iframe
  id="gamblio-chat-iframe"
  src="https://your-widget-domain.com/embed"
  width="400"
  height="600"
  frameborder="0"
></iframe>

<script>
  const iframe = document.getElementById("gamblio-chat-iframe");

  window.addEventListener("message", function (event) {
    // Verify event.origin in production!
    if (event.data?.type === "gamblio-chat-ready") {
      // Send config securely via postMessage
      iframe.contentWindow.postMessage(
        {
          type: "gamblio-chat-init",
          clientId: "YOUR_CLIENT_ID",
          playerToken: "optional-player-token",
        },
        "https://your-widget-domain.com"
      );
    }
  });
</script>
```

---

### 2. Iframe + Loader Script

For a simpler integration, use a loader script that creates the iframe and handles the postMessage handshake. The host page only calls `GamblioChat.init()`—credentials are passed to the script at runtime and never appear in the DOM or URL.

```html
<!-- Load the chat script -->
<script src="https://your-widget-domain.com/chat-loader.js"></script>

<!-- Initialize with your credentials (fetch playerToken from your backend if needed) -->
<script>
  GamblioChat.init({
    clientId: "YOUR_CLIENT_ID",
    playerToken: "optional-player-token-for-authenticated-users",
    container: "#chat-container",
    width: "400px",
    height: "600px",
  });
</script>

<div id="chat-container"></div>
```

**Secure token handling:** Load `playerToken` from your backend (e.g. via an authenticated API) and pass it directly to `GamblioChat.init()`. The token stays in memory and is only sent to the iframe via `postMessage`—never in the URL or static HTML.

---

### Message protocol

| Direction       | Message                                                 | Description                                                            |
| --------------- | ------------------------------------------------------- | ---------------------------------------------------------------------- |
| Iframe → Parent | `{ type: "gamblio-chat-ready" }`                        | Sent when iframe is ready to receive config                            |
| Parent → Iframe | `{ type: "gamblio-chat-init", clientId, playerToken? }` | Initializes chat with `clientId` (required) and optional `playerToken` |

Additional embed channels:

- Recommendation uses `gamblio-recommendation-ready`, `gamblio-recommendation-init`, and `gamblio-recommendation-resize`.
- Hot/cold uses `gamblio-hotcold-ready`, `gamblio-hotcold-init`, and `gamblio-hotcold-resize`.
- Resize payload format for both is `{ type, width: "100%", height, minWidth, minHeight }`.

#### Security checklist for production

- Always validate `event.origin` in your `message` listener.
- Always use `targetOrigin` (the second argument) in `postMessage` instead of `"*"`.
- Store `playerToken` only in memory or secure backend; never hardcode it in static HTML.

## Configuration

| Prop / Config | Type   | Required | Description                                                                 |
| ------------- | ------ | -------- | --------------------------------------------------------------------------- |
| `clientId`    | string | Yes      | Your client/tenant identifier                                               |
| `playerToken` | string | No       | For authenticated players; enables auto-start and resumes existing sessions |

When `playerToken` is provided, the widget skips the pre-chat form and auto-starts the chat for that player.

## Environment Variables

| Variable                                | Description                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLIENT_ID`                 | Default `clientId` for demo page                                                           |
| `NEXT_PUBLIC_PLAYER_TOKEN`              | Default `playerToken` for demo page                                                        |
| `NEXT_PUBLIC_CHAT_WS_URL`               | WebSocket URL for the chat backend                                                         |
| `NEXT_PUBLIC_THEME`                     | `"dark"` or `"light"` for floating widget                                                  |
| `NEXT_PUBLIC_API_URL`                   | Base API URL (e.g. `https://core.gamblio.ai/api/`) for recommendation and hot/cold widgets |
| `NEXT_PUBLIC_USE_DUMMY_RECOMMENDATIONS` | Set to `true` to use dummy recommendation data when API is unavailable                     |
| `NEXT_PUBLIC_USE_DUMMY_HOT_COLD`        | Set to `true` to use dummy hot/cold games when get-vendors API is unavailable              |

### Hot/Cold widget

- **Pass settings from parent**: Send `gamblio-hotcold-init` with `hotColdSettings`. The embed page merges defaults with your payload, e.g. `{ backgroundType: "vortex", ...data.hotColdSettings }`, so you can override `backgroundType`, `gameUrl`, etc.
- **Real API and original images**: Set `NEXT_PUBLIC_USE_DUMMY_HOT_COLD=false` in `.env` so the widget calls the get-vendors API. If you still see old data, clear localStorage for keys starting with `gamblio-hotcold-`. Add the host that serves your game images (e.g. your API CDN) to `next.config.ts` → `images.remotePatterns` so Next.js can load them.

## Development

```bash
npm install
npm run dev
```

- Main demo: [http://localhost:3000](http://localhost:3000)
- Embed page: [http://localhost:3000/embed](http://localhost:3000/embed)

## Deployment

Deploy to Vercel or any Node.js host. Ensure CORS and frame embedding are configured for your widget domain if embedding on third-party sites.
