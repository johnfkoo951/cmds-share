# CMDS Share

> 🇬🇧 English · [🇰🇷 한국어](README.ko.md)

Share Obsidian notes to the web with one command — and stay in control after you hit share.

Unlike simple publish plugins, CMDS Share is **governance-first**: shared notes carry server-side view counts, expiry, and one-click revocation, and a web dashboard shows everything you have published. Notes are rendered through Obsidian's own pipeline, so tables, callouts, embedded images, and your theme look exactly like they do in your vault.

Part of the [CMDSPACE](https://cmdspace.work) ecosystem.

## Features

- **One-command publishing** — `Share current note to web` copies a public URL to your clipboard
- **Faithful rendering** — Obsidian's real renderer (tables, callouts, code, Korean/CJK) + your theme CSS
- **Share page extras** — table of contents sidebar with scrollspy, an interactive local graph (force-directed, zoom/pan/hover-highlight), code-block copy buttons, heading deep links, dark/light mode. TOC and graph can float as popups or dock as a persistent sidebar
- **Governance** — server-side registry, view counts (link-preview bots filtered), expiry with a tombstone page, revoke/restore without deleting, cross-vault ID protection
- **End-to-end encryption (optional)** — AES-256-GCM in the plugin; the key travels only in the URL fragment and never reaches the server
- **CMS view in Obsidian** — browse all shares, live view counts reconciled from the server, re-share, revoke, delete
- **Web dashboard** — manage your shares from any browser
- **Five backends** — pick the hosting model that fits you (see below)

## Hosting options

**Which server does my note go to?** Whatever provider is active in Settings → CMDS Share. They differ in who operates the server and which governance features work:

| Provider | Who runs the server | Setup | View counts / expiry / revoke | Dashboard |
|---|---|---|---|---|
| **CMDSPACE** (default) | CMDSPACE (managed) *or* your own instance | API token | ✅ all | ✅ |
| Synology NAS | You (WebDAV) | NAS credentials | ❌ (plain file hosting) | ❌ |
| GitHub Pages | GitHub (your repo) | Personal access token | ❌ | ❌ |
| Supabase | You (your project) | Project URL + anon key, public bucket | ❌ | ❌ |
| Convex | You (your deployment) | Deploy the Convex backend from [cmds-share-server](https://github.com/johnfkoo951/cmds-share-server/tree/main/convex-backend) | expiry only | ❌ |

### The CMDSPACE provider — read this before enabling

The plugin ships pointed at **`share.cmdspace.work`**, which is a **private, invite-only instance operated by CMDSPACE for its own members**. It is *not* an open public service:

- **You cannot use it without a token.** Uploads are authenticated; there is no sign-up.
- **Want a token?** Open a [GitHub issue](https://github.com/johnfkoo951/cmds-share/issues) with the title `Token request`. Invitations are granted case-by-case, best-effort, with no SLA or uptime guarantee — this is a personal instance, not a commercial service.
- **Tokens are instance-wide.** A token can list and manage every share on that instance, so one instance is meant for one person or one trusting team. Do not share your token.

### Self-hosting your own governance server (recommended for everyone else)

The server is open source: **[cmds-share-server](https://github.com/johnfkoo951/cmds-share-server)** — a small Next.js app on Vercel + Supabase (free tiers are enough). Deploy it, set your own `CMDS_API_TOKENS`, then in the plugin change **Server URL** to your domain. You get the full governance feature set (view counts, expiry, revocation, dashboard) with your data entirely under your control.

If you don't want to run a server at all, use the Synology / GitHub Pages / Supabase / Convex providers — they are fully self-service but skip the governance features.

## Installation

### From Obsidian Community Plugins (once approved)

Settings → Community plugins → search **CMDS Share** → Install & enable.

### Manual install

1. Download `main.js`, `manifest.json`, `styles.css` from the latest [release](https://github.com/johnfkoo951/cmds-share/releases)
2. Put them in `<vault>/.obsidian/plugins/cmds-share/`
3. Reload Obsidian and enable the plugin

## Quick start

1. **Settings → CMDS Share** → pick a provider and fill in its credentials (for CMDSPACE/self-hosted: Server URL + API token) → **Test connection**
2. Open a note → command palette → **Share current note to web**
3. Choose encryption/expiry in the dialog → the public URL is copied to your clipboard
4. Re-sharing the same note updates the page and **keeps the same link**

## Commands

- `Share current note to web` — publish or update the active note
- `Copy share link of current note`
- `Delete shared note from server`
- `Open CMS dashboard` — in-vault management view
- `Browse all shared notes`

## Privacy & security notes

- **Plain shares** are public web pages: anyone with the link (or who guesses the 8-char ID) can read them.
- **Encrypted shares**: content is encrypted in the plugin before upload; the key lives only after `#` in the URL, which browsers do not send to servers. The server stores ciphertext it cannot read. Embedded **images are uploaded unencrypted** (content-addressed, unlisted) — avoid encryption for notes whose images are themselves sensitive. Link/tag metadata for the graph is omitted from encrypted shares.
- **View counts** are approximate: known bot/link-preview user agents are excluded, and counting requires the governance server.
- Deleting a share removes both the registry row and the stored file; revoking keeps the file but serves HTTP 410.

## Development

```bash
npm install
npm run dev     # watch mode
npm run build   # type-check + production bundle
```

Related repository: [cmds-share-server](https://github.com/johnfkoo951/cmds-share-server) (governance backend).

## License

MIT © [Yohan Koo (CMDSPACE)](https://cmdspace.work)
