# Jarvis AI Desktop

A cross-platform desktop assistant starter built with Tauri 2, React, and TypeScript. The chat backend uses Google's official `@google/genai` JavaScript SDK.

## Included

- Gemini-powered assistant chat through a local API server
- Local chat history, notes, reminders, and editable assistant memory
- Reminder creation, completion, and deletion
- Note creation and deletion
- Quick-start prompts and keyboard send (`Enter`, with `Shift+Enter` for a newline)
- Voice input when supported by the system webview

## Local data and privacy

Chat history, notes, reminders, and the optional memory text are saved in the webview's local storage on this device. The memory text is sent to the configured Jarvis API with chat requests to personalize Gemini responses. Do not store sensitive information there. These features do not sync across devices and reminders do not yet trigger operating-system notifications.

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
