[![English](https://img.shields.io/badge/English-README-134538)](README.md) [![한국어](https://img.shields.io/badge/한국어-README-E985A2)](README.ko.md)

# CMDS Share
Publish an Obsidian note as a web page, with hosting and privacy choices you can explain before sharing.

**Version 2.1.1 | Available in Community Plugins.**

Obsidian 1.7.2+ | Desktop and mobile.

## What it does
- Publish/update a note and copy its link from the command palette.
- Use GitHub Pages by default or choose a compatible managed/self-hosted backend.
- Offer readers a table of contents, theme switching and Markdown copy/download.
- Use optional note encryption; governance-server features depend on the selected host.

## Install and first use
**Community:** Settings → Community plugins → Browse → **CMDS Share** → Install → Enable.

**Manual:** Download `main.js`, `manifest.json`, and `styles.css` from [release 2.1.1](https://github.com/johnfkoo951/cmds-share/releases/tag/2.1.1), place them in `<vault>/.obsidian/plugins/cmds-share/`, reload Obsidian, and enable. Back up existing settings; do not copy another user’s `data.json`.

Create a harmless sample note. Configure GitHub Pages and review the **public repository** setup, test the connection, then run **Share current note to web**. Wait for the Pages build and check the page/source in a signed-out browser.

## Read the manual
- [English user guide](docs/guide.md)
- [한국어 사용설명서](docs/guide.ko.md)
- [Web manual](https://apps.cmdspace.work/plugins/cmds-share/)
- [Product family](https://apps.cmdspace.work/plugins/)
- [Issues and support](https://github.com/johnfkoo951/cmds-share/issues)

## Privacy and limits
GitHub Pages publishes to a public repository. Encrypted notes still upload images **unencrypted**. Server-enforced expiry, view counts and revoke/restore are not universal hosting features. The CMDSPACE managed instance is invite-only.

## Development
```sh
npm install
npm run build
```
Build the plugin assets for local development.

## Credits and license
**Yohan Koo (CMDSPACE)**, https://cmdspace.work. **MIT**, [LICENSE](LICENSE).
