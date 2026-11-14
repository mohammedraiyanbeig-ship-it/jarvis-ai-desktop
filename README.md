# Jarvis AI Desktop

A cross-platform desktop assistant starter built with Tauri 2, React, and TypeScript. The chat backend uses Google's official `@google/genai` JavaScript SDK.

## Included

- Dark desktop chat workspace with local conversation persistence
- Gemini-powered text chat through a small local API server
- Quick-start prompts and keyboard send (`Enter`, with `Shift+Enter` for a newline)
- Voice input when supported by the system webview (speech is transcribed into the composer)
- Placeholder Reminders, Notes, and Settings sections

## Configure Gemini

1. Create a Gemini API key in Google AI Studio.
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` there. Keep the key out of source control; it stays on the API server and is not sent to the frontend.
3. Install dependencies and run both processes in separate terminals:

   ```bash
   npm install
   npm run api
   ```

   ```bash
   npm run tauri:dev
   ```

The API listens on loopback (`127.0.0.1:8787`) for local development. Set `GEMINI_MODEL` in `.env` to a model enabled for your account; the default is `gemini-2.5-flash`. For a distributed app, deploy the API behind authentication and rate limits rather than embedding a shared Gemini API key in the desktop binary. Configure `VITE_JARVIS_API_URL` at build time to point the desktop client to that secured API.

## Build

Run `npm run build` to build the frontend. To create desktop installers, enable Tauri bundling and configure app icons for the target platforms, then run `npm run tauri:build`.

## Security notes

The included local API is a development starter, not a production service: it binds to loopback and has no user authentication or usage quotas. Do not expose it to a network or deploy it publicly without adding authentication, rate limiting, and operational controls. Gemini requests are subject to Google's API terms and account limits.
