# CMDS Share user guide
Publish a note as a readable web page, then manage it according to the capabilities of the host you chose.

## Status and prerequisites
This guide covers **2.1.1**, verified against local source and public release metadata on **2026-09-14**. Release 2.1.1 has `main.js`, `manifest.json`, and `styles.css`; CMDS Share is in the Community Plugins registry. The registry explicitly says it has not been manually reviewed by Obsidian staff.
- Obsidian **1.7.2+**. The manifest allows desktop and mobile; this documentation pass did not run a mobile acceptance test.
- Internet access and an account/token for your selected host. The default is **GitHub Pages**, not the managed CMDSPACE server.
- Permission to publish the note, its original Markdown, images, metadata, and theme assets. Prepare a separate non-sensitive example first.
- The plugin is MIT-licensed. Hosting plans, quotas, storage and traffic costs are separate and may change.

## Install
Use **Settings → Community plugins → Browse → CMDS Share → Install → Enable**. Review Obsidian's community-plugin notice first.
Alternatively, download the three files from [release 2.1.1](https://github.com/johnfkoo951/cmds-share/releases/tag/2.1.1), place them in `<vault>/.obsidian/plugins/cmds-share/`, reload Obsidian, and enable the plugin. Keep an existing `data.json` private and intact.

## Choose the host before sharing
A backend is the service that receives and serves your published note. Selecting a backend does not create an account or guarantee its optional capabilities.

| Provider | What you supply | Registry / view counts / revoke | Server-enforced expiry | Web dashboard |
|---|---|---|---|---|
| GitHub Pages (default) | Your GitHub token and repository | No | No | No |
| CMDSPACE | Invite token for the managed instance, or your own compatible server | Yes | Yes | Yes |
| Synology NAS | WebDAV credentials and a public serving URL | No | No | No |
| Supabase | Your project URL, anon key and public bucket/policies | No | No | No |
| Convex | Your deployed compatible backend and URLs | No governance registry | Yes, in compatible backend | No governance dashboard |

Static-host delete/upload operations are not the same as governance-server revoke/restore. A countdown badge or expiry metadata on a static page is **not access enforcement**. Choose a governance server if you require that behavior; do not promise expiration on GitHub Pages.

## First success: a public GitHub Pages example
**This workflow creates or uses a public repository and publishes content. Do not use a private note as the test.** A public repository can expose files through GitHub even before its Pages site is ready.
1. Create a GitHub personal access token using GitHub's settings. The plugin's simple setup flow documents a classic token with `repo` scope, which is broad: understand its permissions, keep it private, and revoke it if exposed. Fine-grained tokens require the correct repository/Pages permissions and are not a universal drop-in for auto-creation.
2. Open **Settings → CMDS Share**. Confirm **Active provider → GitHub Pages**.
3. Paste the token under **Personal access token** and confirm the **Repository** name (default `obsidian-shared-notes`).
4. Click **Set up repository**. The implementation can create a public repository, add `.nojekyll`, enable Pages, and record the URL. Review the selected owner/repository before doing this.
5. Run **Test connection**. Keep advanced branch/path/domain settings unchanged for the first test.
6. Open a note containing only a sample heading, paragraph, and an image you may publish. Run **Share current note to web**.
7. Review the encryption/expiry options, publish, and open the copied URL. New Pages content waits for GitHub's build; availability is not instant or guaranteed in 30 seconds.
8. Inspect the page's rendered content and **copy/download Markdown** controls in a signed-out browser. Original Markdown is part of the share, not merely an internal editing source.
9. Edit the example, re-share it, and verify the same link now shows the update after the host finishes processing.
A successful upload followed by a temporarily missing Pages page is not automatically a failed upload. Check the repository's Pages deployment before repeatedly publishing.

## Managed or self-hosted governance
The CMDSPACE option points by default to `https://share.cmdspace.work`. It is an **invite-only personal/team instance**, not an open self-service hosting promise. It needs a token and carries no uptime/SLA guarantee. Requests can be made through the [issue tracker](https://github.com/johnfkoo951/cmds-share/issues), without posting a token or private content.
An instance token can list and manage all shares on that instance. Treat it as a team-wide management credential, not an isolated per-note password. Use one instance for one person or a mutually trusting team.
For your own instance, follow [cmds-share-server](https://github.com/johnfkoo951/cmds-share-server), configure the server separately, and enter your **Server URL** and **API token**. The plugin cannot turn a plain bucket into a governance server by changing its URL.
The governance CMS reconciles local records with server registry state, including approximate views, revoked items, and orphaned records. Known preview bots are filtered, but view counts are not an exact count of people.

## Command reference
Open Ctrl/Cmd+P and search by CMDS Share. Some actions appear only when a relevant active/shared note exists.

| Exact command | Result |
|---|---|
| Share current note to web | Render and publish/update the active note; copy its URL |
| Copy share link of current note | Copy the known existing share URL without republishing |
| Delete shared note from server | Delete a shared note through the selected provider; an external write, not a local undo |
| Open CMS dashboard | Open the in-vault management view, not a promise of server features on every host |
| Browse all shared notes | Browse shares known to the plugin |

Use the CMS to inspect, re-share, or delete entries. Governance-host revocation keeps the stored file but serves a tombstone (HTTP 410), whereas deletion removes the registry entry and stored note. Restore is governance-specific. Neither revocation nor deletion can retrieve copies already downloaded by recipients or purge every cache/history.

## Settings reference

| Section | Actual controls and meaning |
|---|---|
| Vault Identity | Vault display name and Vault ID identify the publishing vault; do not casually change identity to bypass a conflict |
| Server Provider | Active provider chooses the destination for later operations |
| Sharing | Share title source; Share page theme; Footer link and label; Encryption mode; Default expiration |
| Rendering | Include theme CSS; Remove backlinks; Remove frontmatter; Note width |
| Frontmatter Fields | Share field, Link field, Encrypted field, Expires field control names used in your notes |
| CMS Dashboard | Enable CMS dashboard; Auto refresh |
| Advanced | Debug mode; keep diagnostics free of secrets before sending them |
| CMDSPACE | Enabled, API token, Server URL |
| Synology NAS | Enabled, NAS URL, Username, Password, Shared folder, Public URL |
| GitHub Pages | Personal access token, Repository, setup action; advanced Enabled/Branch/Path/Custom domain |
| Supabase | Enabled, Project URL, Anon key, Bucket, Table name |
| Convex | Enabled, Deployment URL, Public URL |

Remove frontmatter also strips leading YAML from the downloadable Markdown. It does not scrub arbitrary sensitive prose, comments or other original source content; backlink display controls are not a complete source sanitizer. Publish a clean source note and inspect the downloadable Markdown. Switching providers does not migrate every old share or revoke the old host's URLs.

## Images, links, and page features
The publisher uses Obsidian rendering and theme CSS to approximate the note's reading view. Pages offer a table of contents, heading links, code copying, light/dark mode, and graph/TOC display controls. Complex plugins, scripts, local-file references, and every custom theme are not guaranteed to work in a standalone browser.
Before sharing Eagle material, prefer a readable cloud URL or a supported image that Share can upload. `file://` is machine-local and `eagle://` navigates into a desktop app; neither is a public image host. Test from a device without your local library.
The page also carries Markdown copy/download tools. A graph may reveal link/tag names; encrypted shares omit that graph metadata. Always review source and rendered output, not just the visible first screen.

## Encryption and privacy
Encryption is optional **AES-256-GCM** of the note payload before upload. The decryption key travels after `#` in the share URL; ordinary browser requests do not send that fragment to the server. Anyone who receives the **full URL** receives the key. This is link-based access, not named-user authentication, DRM, or a guarantee against forwarding.
**Embedded images are uploaded unencrypted**, including for encrypted notes. Their content-addressed/unlisted URLs are not access controls. Do not rely on note encryption to protect confidential screenshots, faces, diagrams, or scanned documents. The Markdown source is inside the encrypted payload, but image bytes are not.
Other boundaries:
- Plain HTML/source published to a public repository or host is public; an obscure short ID is not secrecy.
- Host operators process network requests. GitHub/Supabase/NAS/Convex and governance hosting have their own logging, retention, policies, and costs.
- API tokens, passwords, encryption keys, share records and settings need careful local backup. Do not upload `data.json` to an issue or public repo.
- Git history, caches and recipients' saved copies may retain earlier public content. Enabling encryption later does not erase an earlier plaintext publication.
- A service token with management access is not the decryption key, and the URL key is not a server-management credential.

## Troubleshooting

| Symptom | Safe next check |
|---|---|
| GitHub token rejected | Token expiry, repo/Pages permissions, intended account and repository; never paste the token into a support issue |
| Repo exists but Pages setup fails | Public repository status, enabled Pages and branch/path permissions; inspect GitHub's error before retrying |
| New link is 404 | Pages deployment/build completion, correct base URL and custom domain |
| Image missing | External readability, local file references, provider image URL, and browser network errors |
| Expiry/revoke/views unavailable | Check the host capability table; a static host cannot enforce governance features |
| HTTP 410 | Share may be expired or revoked on the governance server; use the instance's management controls |
| HTTP 409 across vaults | Resolve the vault-identity/ownership conflict; do not overwrite another vault's share |
| Encrypted page will not open | Use the complete URL including `#` fragment; missing key cannot be recovered merely from server ciphertext |
| CMS shows unexpected old entries | Check the selected provider and originating vault; provider switching is not migration |

## Update, support, and credits
Back up your plugin settings and important original notes before updating. Use community updates or one release's complete three-file set. Verify a non-sensitive publish/update/delete cycle on the same host before returning to regular work.
[Web manual](https://apps.cmdspace.work/plugins/cmds-share/) | [Releases](https://github.com/johnfkoo951/cmds-share/releases) | [Issues](https://github.com/johnfkoo951/cmds-share/issues).
Provide plugin/Obsidian version, OS, provider, sanitized error and minimal sample Markdown. Do not attach full encrypted URLs, tokens, private notes, or a settings file.
MIT © **Yohan Koo (CMDSPACE)**, https://cmdspace.work. [LICENSE](https://github.com/johnfkoo951/cmds-share/blob/main/LICENSE).

## Verification scope
Compared `manifest.json`, `src/main.ts`, `src/settings.ts`, `src/types.ts`, `src/providers.ts`, and `src/crypto.ts` with the existing documentation and public release/registry records. No actual publishing, repository creation, token issuance, deletion, or mobile test was performed for this manual. No current UI screenshot is claimed or fabricated.
