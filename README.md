# Chat Central

Unified desktop chat client (Electron + TypeScript + React), Beeper-style. Targets Windows.

## Run
```
npm install
npm start      # build + launch
npm test
npm run dist   # Windows installer (NSIS)
```

## Architecture
- `src/core` – normalized model, `Provider` interface, `Hub` (unifies accounts/chats/contacts), JSON store, encrypted secrets (Electron safeStorage / DPAPI).
- `src/providers` – one file per network. Implemented: **Matrix** (access token), **Telegram** (Bot API token), **Discord** (bot token). Bots only see chats/servers they were added to or messaged in. WhatsApp has only a Business Cloud API; Google Messages has no official API.
- `src/main` – Electron main + preload (whitelisted IPC). `src/renderer` – React UI (chats, contacts, accounts).

Contacts are stored locally and written through to a provider when it declares `contactsWrite`.
