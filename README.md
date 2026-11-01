# Bill Manager

Photograph a paper receipt, and the app reads the store, date, total and every item, with English names for Spanish receipts. You check the result, save it, and browse your purchases day by day.

Status: Milestone 1 prototype (scan → review → save → list by date). See `docs/plan.md`.

## Try it on your phone

You need a computer with [Node.js 22+](https://nodejs.org) and your phone on the **same Wi-Fi network**.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure the server. Get an API key at https://console.anthropic.com, then:
   ```bash
   cp apps/server/.env.example apps/server/.env
   ```
   Open `apps/server/.env` and set `ANTHROPIC_API_KEY` and `APP_TOKEN` (any long random text).
3. Start the server and leave it running:
   ```bash
   npm run server
   ```
4. Find your computer's Wi-Fi IP address (macOS: System Settings → Wi-Fi → Details; Windows: `ipconfig`). Then:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env.local
   ```
   Set `EXPO_PUBLIC_API_URL=http://<your-ip>:8787` and `EXPO_PUBLIC_APP_TOKEN` to the same value as `APP_TOKEN`.
5. In a second terminal:
   ```bash
   npm run mobile
   ```
6. Install **Expo Go** from the App Store or Google Play. Scan the QR code shown in the terminal: on iPhone, with the Camera app; on Android, from inside Expo Go.

No API key yet? Start the server with `EXTRACTOR=mock npm run server`. Every scan then returns a sample Mercadona receipt, so you can try the screens for free.

## Privacy
Receipts and photos are stored only on your phone. When you tap **Read receipt**, the photo goes to your own server and on to Anthropic's API to be read. The server keeps nothing.

## Development
See `CLAUDE.md` for commands and conventions.
