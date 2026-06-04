# CLAUDE.md

Guidance for Claude Code (and other AI agents) when working in this repository.

## Project overview

An **AEM Edge Delivery Services (EDS)** site, authored with **Document Authoring (DA, da.live)**, that recreates the look & feel of the Telenet residential homepage (`www2.telenet.be/residential/nl`).

- Runtime stack is the **standard `aem-boilerplate`** (`scripts/aem.js` + `scripts/scripts.js` + `scripts/delayed.js`, `styles/styles.css`).
- The repo was migrated away from a legacy custom "author-kit" runtime (`scripts/ak.js`, `scripts/lazy.js`, `deps/`); those files are gone. If you see references to them (e.g. in `404.html`), they are stale.
- Content (nav, fragments, pages) lives in DA, not in this repo. The repo holds code: blocks, scripts, styles, and an edge worker.

## Architecture

- **`scripts/aem.js`** — vendored EDS core library (RUM, `loadCSS`, `decorateSections`, `decorateBlocks`, `loadBlock`, `decorateButtons`, section-metadata handling, etc.). Treat as a framework file; avoid editing unless necessary.
- **`scripts/scripts.js`** — project entry (loaded from `head.html`). Eager/lazy/delayed phases; auto-blocks `/fragments/*` links; `decorateMain`; resolves `{{key}}` placeholder tokens via `fetchPlaceholders` + `replacePlaceholders` (both defined here, **not** in `aem.js` — upstream boilerplate/author-kit ship no placeholder helper) in `main` (eager) and the header/footer (lazy). `fetchPlaceholders` reads the runtime sheet at site-root `/placeholders.json` (distinct from the DA author-palette sheet at `/docs/library/placeholders.json`). New placeholders must be **previewed/published** in DA before the site serves them.
- **`scripts/delayed.js`** — deferred work (currently empty).
- **`blocks/<name>/<name>.{js,css}`** — one folder per block. `<name>.js` default-exports `decorate(block)`; `aem.js` loads a block (JS + CSS) by its first class name when the block appears in content. Current blocks: `header` (renders `/fragments/nav/header`), `footer` (renders `/fragments/nav/footer`), `banner`, `card` (variants: list / accent / media / wide), `columns`, `fragment`, `usp`, `promo` (themes: dark / accent), `device`, `links`, `accordion` (collapsible label/body rows via native `<details>`/`<summary>`; first `<p>` per row is the label, rest is the body). `header`/`footer` are loaded in the lazy phase (`loadHeader`/`loadFooter`) into the page's `<header>`/`<footer>`.
- **`styles/`** — `styles.css` (design tokens `--tn-*`, base typography, shared chevron `.button`, section-metadata styles), `fonts.css` (lazy `@font-face`), `fonts/` (self-hosted Telenet brand fonts: Telenet Albra, PP Right Telenet), `lazy-styles.css`, `error.css`.
- **`icons/`** — EDS content icons. A `:name:` token authored in DA becomes `<span class="icon icon-name">`, which `decorateIcons` (`aem.js`) renders as `<img src="/icons/name.svg">`. To recolor (e.g. white social icons on the dark footer), CSS masks the span with the same SVG and tints it via `currentcolor` (see `blocks/footer/footer.css`). Authors browse/insert icons via a DA `icons` library sheet (`/docs/library/icons`) registered in the DA config. (Not to be confused with `img/icons/`, which holds unrelated tooling assets.)
- **`tools/`** — author-facing tooling (`da`, `quick-edit`, `sidekick`). `tools/quick-edit/quick-edit.js` is wired to the sidekick via `scripts/sidekick.js` (it imports `loadPage` from `scripts/scripts.js`, which is exported for this). `tools/sidekick/sidekick.js` is leftover author-kit wiring and is **not** loaded by the runtime.
- **`plugins/experimentation/`** — `adobe/aem-experimentation` **v2**, vendored via `git subtree` (prefix `plugins/experimentation`, branch `v2`; update with `git subtree pull`). Treat as vendored; it's excluded from our ESLint (`plugins/**` in `eslint.config.js`). `scripts/experiment-loader.js` gates and lazy-imports its `loadEager`; `scripts/scripts.js` calls `runExperimentation(doc, experimentationConfig)` early in `loadEager` (no-op unless a page has experiment/campaign/audience metadata). `experimentationConfig.prodHost` is the aem.live host (overlay hidden there, shown on localhost/aem.page).
- **DA sidekick plugins** — `scripts/sidekick.js` (loaded by `scripts.js` once `aem-sidekick` is ready) wires two custom sidekick plugins: `custom:experimentation` toggles the da.live `exp.js` rail, and `custom:quick-edit` launches `tools/quick-edit`. The bottom of `scripts.js` also loads `exp.js` on `?daexperiment` (and DA preview on `?dapreview`), and `tools/quick-edit` on `?quick-edit`. Quick Edit ([DA early-access](https://docs.da.live/about/early-access/quick-edit)) also requires the repo to be listed under the `quick-edit` key in the DA org config sheet (`da.live/config#/{org}/`), and `loadEager` skips the `waitForFirstImage` LCP wait when `?quick-edit` is present (otherwise the in-iframe re-render stays blank). `tools/quick-edit/quick-edit.js` `init()` falls back to a URL-derived `{detail:{config,location}}` payload when the sidekick event doesn't supply one. The matching `experimentation` and `quick-edit` plugin entries live in the **Config Service** sidekick config at `/config/{org}/sites/{site}/sidekick.json` (managed via the admin API at `admin.hlx.page`, **not** in the repo; environments scoped to `preview`/`dev`). Authors define experiments in a page's **Metadata** block (`Experiment`, `Instant Experiment` for instant experiments — read via `getMetadata('instant-experiment')`; optionally `Audience`/`Campaign`).
- **`workers/website/`** — Cloudflare Worker reference implementation (AEM proxy + handlers); configured via `wrangler.toml`.

### Section Metadata styles (authored in DA, applied by `aem.js`)
A "Section Metadata" block's `Style` values become section classes (other keys become `data-*`). Styles handled in `styles.css`: `highlight`, `centered`, `accent` (shaded grey full-width band, `--tn-shaded`), `dark` (charcoal full-width band with light text, `--tn-dark`), `full-width`, `angles` (curved top/bottom via SVG mask), and `2/3/4 columns` (matched with `[class~="N-columns"]` since they start with a digit).

A **`library-metadata`** block (used in `/docs/library/blocks/*` to describe a block for the DA library) is **not** stripped by the pipeline (unlike `metadata`/`section-metadata`), so `styles.css` hides `.library-metadata`/`.library-metadata-wrapper` to keep it from rendering on pages and in the da.live preview.

## Commands

- **Install**: `npm i`
- **Local dev**: `aem up` (AEM CLI, serves on `:3000`, proxying DA content). Install CLI with `npm i -g @adobe/aem-cli` if missing.
- **Lint (run before committing)**: `npm run lint` — `lint:js` (ESLint, `@adobe/eslint-config-helix`) + `lint:css` (Stylelint, `stylelint-config-standard`). Keep both clean.
- **Test**: `npm test` (`@web/test-runner`, specs in `test/`).

## Conventions

- Keep block CSS scoped to the block's class; share cross-block primitives via the `--tn-*` tokens and `.button` / `.tn-chevron` in `styles.css`.
- **DA Quick Edit rendering (`?quick-edit`)** — Quick Edit makes block prose editable by wrapping every paragraph in `<div class="prosemirror-editor"><div class="ProseMirror">…</div></div>` and **stripping JS-added classes from prose nodes** (`<p>`/`<a>`/`<strong>` — `.button`, `.promo-cta`, `.tn-chevron`, `.card-figure`, `.promo-tag`, `.device-name`, …). Classes on **`<div>` wrappers survive** (block/section classes, `.banner-media`, `.usp-icon`, …). It also **reverts DOM nodes that `decorate()` moved into prose** (they reappear → duplicates) and can **rewrite media URLs to broken paths**. Rules so block CSS/JS survives the editor (verify every block both with and without `?quick-edit`):
  - Never rely on a class added to a `<p>`/`<a>`/`<strong>`; key styling off the **authored structure** (`:has()`, tag selectors) or a surviving `<div>`. Keep a structural fallback next to each JS class — e.g. `.card p:has(> a:only-child) > a` next to `.button`; bottom-align uses `:is(.button-wrapper, p:has(> a:only-child:not(li a)))`; `.usp-cta a`, `.links > div > div p`, `.device p:has(br)`, `.card.wide p:has(> picture)` mirror their stripped classes.
  - Use **descendant** combinators (not `>`) to reach prose nodes — the wrapper sits between the cell and the `<p>`. `styles.css` sets `.prosemirror-editor, .prosemirror-editor > .ProseMirror { display: contents }` so prose nodes still act as flex/grid children (CTA `margin-top:auto`, the wide-card/grid layouts). Container selectors keyed on the cell (`.block > div > div`) still match — the wrappers are inside the cell.
  - Hide editor-only duplicates from moved nodes via the wrapper, e.g. `.usp-item .prosemirror-editor picture { display: none }`. ProseMirror also wraps each list item's text in a `<p>`, so zero injected margins, e.g. `.card-list li p { margin: 0 }`.
  - When styling needs a **JS classification that CSS can't express** (e.g. promo eyebrow = a fully-bold paragraph vs. title = a partially-bold one), `decorate()` runs *before* the editor wraps the prose, so classing the `<p>` (stripped) or the not-yet-existent wrapper both fail. Add a `MutationObserver` that re-runs the classifier and puts the class on the **surviving `.prosemirror-editor` wrapper** (see `blocks/promo/promo.js`). Font props inherit through the wrapper's `display: contents`; for a painted box (the tag pill) override it with higher specificity, e.g. `.promo .promo-tag { display: inline-block }`.
  - **Known Quick-Edit-only limitation** (render fine on the live site): the banner hero image 404s because it lives in the page's own `.index/` media folder, which the editor rewrites to a page-relative URL that doesn't resolve on localhost (images in shared folders keep their absolute `content.da.live` URL and load fine). Promo square-photo **background** images fall back to inline in the editor (the intrinsic-ratio classification can't be done in CSS), and the device **struck "old price"** loses its wrapping `<span>` (reverted by the editor).
- New block = `blocks/<name>/<name>.js` (`export default function decorate(block)`) + `<name>.css`; no registration needed (loaded by class name).
- Match surrounding code style; ESLint + Stylelint must pass. Verify visual changes in the browser before committing.

## Push Preferences

- Push directly to `main` with `git push origin main` (no PR workflow for this repo). The `origin` remote uses SSH (`git@github.com:bdhoine/telenet-document-authoring.git`).
- Still confirm before each push.

## Adobe skills for EDS / DA development

Adobe maintains skills for AI coding agents at **https://github.com/adobe/skills** (under `plugins/aem/edge-delivery-services/skills/`). Prefer these when doing EDS/DA work:

- **`content-driven-development`** — orchestrates the end-to-end workflow for any code change; the usual entry point.
- **`analyze-and-plan`** — requirements & acceptance criteria before building.
- **`building-blocks`** — implement new/modified blocks and core functionality.
- **`content-modeling`** — design author-friendly block content structures.
- **`block-inventory`** — survey available blocks before modeling content.
- **`testing-blocks`** — browser testing of blocks.
- **`code-review`** — self-review / PR assessment of EDS code.
- **`page-import`** — import an existing webpage into canonical EDS markup.
- **`da-content`** — DA + EDS content/formatting rules.
- **`docs-search`** — search the aem.live documentation.
- **`create-site`** — bootstrap a new EDS site from boilerplate + DA.
- **`aem-cli`** — install/configure/troubleshoot the AEM CLI and local dev server.

## Reference implementation

Use **`aemsites/author-kit`** (https://github.com/aemsites/author-kit) as a reference implementation for EDS + DA patterns (this project originated from it). The official EDS boilerplate is `adobe/aem-boilerplate`.
