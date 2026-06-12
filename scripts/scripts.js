import {
  buildBlock,
  decorateBlock,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  loadHeader,
  loadFooter,
  toCamelCase,
} from './aem.js';
import { runExperimentation } from './experiment-loader.js';
import loadLaunch from './martech.js';

const experimentationConfig = {
  prodHost: 'main--telenet-document-authoring--bdhoine.aem.live',
  audiences: {
    mobile: () => window.innerWidth < 600,
    desktop: () => window.innerWidth >= 600,
  },
  decorationFunction: (el) => {
    buildBlock(el);
    decorateBlock(el);
  },
};

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Fetches the site's placeholders sheet and returns a key/value map, cached
 * per prefix on `window.placeholders`. Each key is exposed verbatim (so
 * `{{key}}` tokens match literally) and as camelCase (for programmatic use).
 * The boilerplate/author-kit ship no placeholder helper, so this lives here
 * rather than in the vendored `aem.js`.
 * @param {string} [prefix] location of the placeholders sheet (default: site root)
 * @returns {Promise<Object>} map of placeholder keys to values
 */
async function fetchPlaceholders(prefix = 'default') {
  window.placeholders = window.placeholders || {};
  if (!window.placeholders[prefix]) {
    window.placeholders[prefix] = fetch(`${prefix === 'default' ? '' : prefix}/placeholders.json`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (json.data || []).reduce((map, row) => {
        const key = row.key ?? row.Key;
        const value = row.value ?? row.Value ?? '';
        if (key) {
          map[key] = value;
          map[toCamelCase(key)] = value;
        }
        return map;
      }, {}))
      .catch(() => ({}));
  }
  return window.placeholders[prefix];
}

/**
 * Replaces `{{key}}` tokens in an element's text with their placeholder values.
 * @param {Element} element The container element
 */
async function replacePlaceholders(element) {
  if (!element) return;
  const placeholders = await fetchPlaceholders();
  if (!Object.keys(placeholders).length) return;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes('{{')) nodes.push(walker.currentNode);
  }
  nodes.forEach((node) => {
    node.nodeValue = node.nodeValue.replace(/\{\{([^}]+)\}\}/g, (token, key) => {
      const value = placeholders[key.trim()];
      return value === undefined ? token : value;
    });
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  await runExperimentation(doc, experimentationConfig);
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    await replacePlaceholders(main);
    document.body.classList.add('appear');
    // Quick Edit re-runs loadPage inside its iframe; the waitForFirstImage
    // optimization never resolves there and leaves the page blank, so skip it.
    const inQuickEdit = new URLSearchParams(window.location.search).has('quick-edit');
    await loadSection(main.querySelector('.section'), inQuickEdit ? undefined : waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  const header = doc.querySelector('header');
  const footer = doc.querySelector('footer');
  // loadHeader/loadFooter append a block, so clear any prior content first:
  // DA Quick Edit / the da.live canvas re-run loadPage on an already-decorated
  // body, which would otherwise stack a second header/footer.
  header?.replaceChildren();
  footer?.replaceChildren();
  await Promise.all([loadHeader(header), loadFooter(footer)]);
  await Promise.all([replacePlaceholders(header), replacePlaceholders(footer)]);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();

  // Adobe Launch (tags) — lazy phase so the consent banner / tags surface
  // promptly while staying off the critical render path.
  loadLaunch();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

export async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

/**
 * Loads the DA sidekick plugin module (for the experimentation rail) once the
 * sidekick is ready.
 */
async function loadSidekick() {
  if (document.querySelector('aem-sidekick')) {
    import('./sidekick.js');
    return;
  }

  document.addEventListener('sidekick-ready', () => {
    import('./sidekick.js');
  });
}
loadSidekick();

(async function loadDa() {
  const { searchParams } = new URL(window.location.href);

  /* eslint-disable import/no-unresolved */
  if (searchParams.get('dapreview')) {
    import('https://da.live/scripts/dapreview.js')
      .then(({ default: daPreview }) => daPreview(loadPage));
  }
  if (searchParams.get('daexperiment')) {
    import('https://da.live/nx/public/plugins/exp/exp.js');
  }
  if (searchParams.has('quick-edit')) {
    import('../tools/quick-edit/quick-edit.js').then(({ default: initQuickEdit }) => initQuickEdit());
  }
}());
