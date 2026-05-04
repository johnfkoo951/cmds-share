# CMDS Share

Share Obsidian notes to the web instantly. Pick a backend, hit a command, get a public link.

> Part of the [CMDSPACE](https://cmdspace.io) ecosystem.

## Features

- One-command publishing of the active note to a public URL
- Five backend providers — pick what fits your stack:
  - **Cloud** — managed CMDSPACE backend
  - **Synology NAS** — self-hosted on your own NAS
  - **GitHub Pages** — push to a static site repo
  - **Supabase** — your own Supabase Storage bucket
  - **Convex** — your own Convex deployment
- Optional end-to-end encryption for shared notes
- Built-in CMS view to browse and revoke previously shared notes
- Custom slugs, expiry, and password protection (provider-dependent)

## Installation

### From Obsidian Community Plugins (once published)

1. Open **Settings → Community plugins**
2. Search for **CMDS Share**
3. Install and enable

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [Release](../../releases)
2. Drop them into `<your-vault>/.obsidian/plugins/cmds-share/`
3. Reload Obsidian and enable the plugin

## Quick start

1. Open **Settings → CMDS Share** and pick a provider
2. Fill in the provider config (endpoint, token, bucket, etc.)
3. Open any note, run **`Share current note to web`** from the command palette
4. The public URL is copied to your clipboard

## Commands

- `Share current note to web` — publish the active note
- `Open shared notes CMS` — browse, edit, or revoke shared notes
- `Copy share URL for current note` — re-copy the link if it's already shared
- `Unshare current note` — revoke the public link

## Development

```bash
# Install deps
npm install

# Dev build (watch mode)
npm run dev

# Production build
npm run build
```

The plugin is built with [esbuild](https://esbuild.github.io/) and TypeScript. The Convex backend lives under `convex/` and is deployed separately with the [Convex CLI](https://docs.convex.dev/cli).

## Project layout

```
src/
├── main.ts          # Plugin entry, commands, lifecycle
├── api.ts           # Provider-agnostic share API
├── providers.ts     # Cloud / Synology / GitHub / Supabase / Convex adapters
├── cms.ts           # Sidebar CMS view for shared notes
├── modals.ts        # Share / confirm-delete / list modals
├── settings.ts      # Settings tab
├── crypto.ts        # ID generation + optional E2E encryption
├── template.ts      # Public page HTML template
└── types.ts         # Shared types and defaults

convex/
├── schema.ts        # Notes table schema
├── notes.ts         # Mutations / queries
├── http.ts          # Public HTTP endpoints
└── crons.ts         # Scheduled cleanup
```

## License

[MIT](./LICENSE) © Yohan Koo
