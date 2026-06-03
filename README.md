# Telenet — Document Authoring

An [AEM Edge Delivery Services](https://www.aem.live/) (EDS) site, authored with
[Document Authoring](https://da.live) (DA), that recreates the look & feel of the
Telenet residential homepage. Built on the standard
[`adobe/aem-boilerplate`](https://github.com/adobe/aem-boilerplate); originally
derived from [`aemsites/author-kit`](https://github.com/aemsites/author-kit).

## Getting started

```sh
# 1. Clone
git clone git@github.com:bdhoine/telenet-document-authoring.git
cd telenet-document-authoring

# 2. Install dependencies (linting, tests)
npm i

# 3. Install the AEM CLI (once, globally)
npm i -g @adobe/aem-cli

# 4. Start the local dev server (proxies DA content) on http://localhost:3000
aem up
```

Page content (navigation, fragments, pages) lives in **DA**, not in this repo —
this repo holds the code (blocks, scripts, styles) and an edge worker.

## Project structure

```
blocks/<name>/<name>.{js,css}   Blocks: banner, card, columns, fragment,
                                 usp, promo, device, links
scripts/aem.js                  EDS core library (vendored)
scripts/scripts.js              Project entry: decorateMain, eager/lazy/delayed
scripts/delayed.js              Deferred work
styles/styles.css               Design tokens (--tn-*), base type, .button, sections
styles/fonts.css + fonts/       Self-hosted Telenet brand fonts (lazy @font-face)
tools/                          Author tooling (da, quick-edit, sidekick)
workers/website/                Cloudflare Worker (AEM proxy) + wrangler.toml
head.html                       Per-page <head> (preloads, styles, scripts)
```

### Blocks

Each block is a folder with a `<name>.js` (default-exports `decorate(block)`) and
a `<name>.css`. `aem.js` loads a block by its first class name when it appears in
authored content — no registration needed. Several blocks have variants:

- **card** — link-list, accent (yellow), media (leading image), and `wide`
- **promo** — `dark` and `accent` themes
- **columns**, **banner**, **usp**, **device**, **links**, **fragment**

### Section styles (Section Metadata)

A "Section Metadata" block's `Style` values become CSS classes on the section
(other keys become `data-*`). Supported in `styles.css`:
`highlight`, `centered`, `dark` (shaded full-width band), `full-width`,
`angles` (curved top/bottom edges), and `2 columns` / `3 columns` / `4 columns`
grids.

## Scripts

| Command | Description |
|---|---|
| `aem up` | Local dev server (`:3000`) |
| `npm run lint` | ESLint (`@adobe/eslint-config-helix`) + Stylelint (`stylelint-config-standard`) |
| `npm test` | Block/script tests via `@web/test-runner` |

Run `npm run lint` before committing; keep both linters clean.

## Contributing

- New block → add `blocks/<name>/<name>.{js,css}`; keep CSS scoped to the block.
- Reuse the shared design tokens (`--tn-*`) and `.button` / `.tn-chevron` utilities.
- Verify visual changes in the browser, then commit.
- See [`CLAUDE.md`](./CLAUDE.md) for agent/dev guidance and links to the relevant
  [Adobe skills](https://github.com/adobe/skills) for EDS/DA development.

## References

- [AEM Edge Delivery Services docs](https://www.aem.live/docs/)
- [Document Authoring (da.live)](https://da.live)
- [`adobe/aem-boilerplate`](https://github.com/adobe/aem-boilerplate) — official boilerplate
- [`aemsites/author-kit`](https://github.com/aemsites/author-kit) — reference implementation
- [`adobe/skills`](https://github.com/adobe/skills) — Adobe skills for AI coding agents
```
