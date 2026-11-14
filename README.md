# Jarvis AI Desktop

A cross-platform desktop assistant starter built with Tauri 2, React, and TypeScript.

## Included

- Dark desktop chat workspace with responsive layout
- Local conversation persistence in browser storage
- Quick-start prompts and keyboard send (`Enter`, with `Shift+Enter` for a newline)
- Voice input when supported by the system webview
- Placeholder Reminders, Notes, and Settings sections

> This starter does not yet connect to an AI provider. The assistant response is a placeholder; no API key or backend is included.

## Run locally

Prerequisites: Node.js, Rust, and the platform-specific Tauri prerequisites (WebView2 on Windows; WebKitGTK development packages on Linux; Xcode command-line tools on macOS).

```bash
npm install
npm run tauri:dev
```

Build the frontend with `npm run build`. To create desktop installers, enable Tauri bundling and configure app icons for your target platforms, then run `npm run tauri:build`.
