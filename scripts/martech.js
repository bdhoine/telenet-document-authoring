import { getMetadata, loadScript } from './aem.js';

// Glue module for the vendored adobe-rnd/aem-martech plugin (plugins/martech):
// AEP WebSDK (alloy) + Adobe Client Data Layer, analytics page views routed
// through an AEP datastream, optional eager Target personalization, and the
// legacy Launch property (OneTrust / ContentSquare) loaded in the DELAYED
// phase via launchUrls. The plugin is imported dynamically so it stays out of
// the module graph entirely for tests and DA author tooling.

const ORG_ID = '1EF86DCB632345E10A495F9E@AdobeOrg';
// Single datastream for all environments.
const DATASTREAM_ID = 'fe4e11e8-1d0f-4bfb-ab76-662fed0bf226';

// Launch publishes one embed code per environment (Development / Staging /
// Production), each with its own build hash. Pick the right one by host:
// localhost / local.telenet.be -> Development, *.aem.page (preview) -> Staging,
// *.aem.live + the production domain(s) -> Production.
// (local.telenet.be is a hosts-file alias for the dev server, used so OneTrust's
// telenet.be consent cookie can be stored locally; it must NOT count as prod.)
const LAUNCH_SCRIPTS = {
  dev: 'https://assets.adobedtm.com/3ce8236b487d/021eb86023cc/launch-fff658d55df3-development.min.js',
  staging: 'https://assets.adobedtm.com/3ce8236b487d/021eb86023cc/launch-99f45f5b13e6-staging.min.js',
  prod: 'https://assets.adobedtm.com/3ce8236b487d/021eb86023cc/launch-7874002b4d71.min.js',
};

// Local dev hosts (incl. the local.telenet.be hosts-file alias) -> Development.
const DEV_HOSTS = ['localhost', '127.0.0.1', 'local.telenet.be'];
// Production custom domains that should load the Production Launch embed.
const PROD_DOMAINS = ['www2.telenet.be', 'www.telenet.be', 'telenet.be'];

function getLaunchScript() {
  const { hostname } = window.location;
  // Dev check first: local.telenet.be ends with telenet.be but is a dev alias.
  if (DEV_HOSTS.includes(hostname)) return LAUNCH_SCRIPTS.dev;
  if (hostname.endsWith('.aem.live') || hostname.endsWith('.hlx.live')
    || PROD_DOMAINS.includes(hostname)) return LAUNCH_SCRIPTS.prod;
  // *.aem.page (preview) + any other host -> Staging.
  return LAUNCH_SCRIPTS.staging;
}

// OneTrust consent groups -> WebSDK consent purposes. Telenet's OneTrust uses
// short-format group ids (C002, not the OneTrust-default C0002).
const OT_GROUP_MAP = {
  collect: 'C002', // Performance (analytics)
  personalize: 'C003', // Functional (Target)
  marketing: 'C004', // Marketing
  share: 'C008', // Targeted Advertising
};

function consentFromGroups(groups) {
  return Object.fromEntries(
    Object.entries(OT_GROUP_MAP).map(([purpose, group]) => [purpose, groups.includes(group)]),
  );
}

// Read a prior consent decision from the OptanonConsent cookie (set by
// OneTrust on telenet.be domains, incl. local.telenet.be). OneTrust itself
// only loads with the Launch embed in the delayed phase (~3s after LCP), far
// past the plugin's 1s personalization timeout, so returning visitors' consent
// must be derived eagerly from the cookie. First visit: no cookie -> consent
// stays 'pending' and the WebSDK queues events until the banner is answered.
function getConsentFromCookie() {
  const raw = document.cookie.split('; ').find((c) => c.startsWith('OptanonConsent='));
  if (!raw) return null;
  const groups = new URLSearchParams(decodeURIComponent(raw.slice(raw.indexOf('=') + 1))).get('groups');
  if (!groups) return null;
  // groups looks like "C001:1,C002:0,..." -> keep only the active ids.
  const active = groups.split(',').filter((g) => g.endsWith(':1')).map((g) => g.split(':')[0]);
  return consentFromGroups(active);
}

// Tests and DA author tooling must not fire analytics or load the WebSDK.
function shouldSkipMartech() {
  // eslint-disable-next-line no-underscore-dangle
  if (window.__WTR_CONFIG__) return true; // @web/test-runner
  const params = new URLSearchParams(window.location.search);
  return params.has('quick-edit') || params.has('dapreview') || params.has('daexperiment');
}

// Open the OneTrust preference-center modal (loaded via Launch).
function openCookiePreferences() {
  const ot = window.OneTrust || window.Optanon;
  if (ot && typeof ot.ToggleInfoDisplay === 'function') ot.ToggleInfoDisplay();
}

// Wire any "cookie preferences" link/button to open the OneTrust modal. Uses
// event delegation so it works whenever the footer (lazy) and OneTrust (loaded
// via Launch) initialise. Authors add a normal link in DA with the label
// "Cookievoorkeuren aanpassen" or an href of #cookievoorkeuren / #ot-settings.
const COOKIE_PREFS_TEXT = 'cookievoorkeuren aanpassen';
const COOKIE_PREFS_HREFS = ['#cookievoorkeuren', '#ot-settings'];
function initCookiePreferences() {
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('a, button');
    if (!trigger) return;
    const byText = (trigger.textContent || '').trim().toLowerCase() === COOKIE_PREFS_TEXT;
    const byHref = COOKIE_PREFS_HREFS.includes(trigger.getAttribute('href'));
    if (!byText && !byHref) return;
    e.preventDefault();
    openCookiePreferences();
  });
}

// loadPage() re-runs under DA Quick Edit / dapreview: memoize init and fire
// the eager page-view only once per page lifetime.
let initPromise = null;
let eagerDone = false;

/**
 * Kicks off the martech stack (call at the top of loadEager). Resolves to the
 * plugin module, or null when martech is skipped (tests / author tooling).
 */
export function loadMartech() {
  if (initPromise) return initPromise;
  initCookiePreferences();
  if (shouldSkipMartech()) {
    initPromise = Promise.resolve(null);
    return initPromise;
  }
  initPromise = (async () => {
    // eslint-disable-next-line import/no-relative-packages
    const martech = await import('../plugins/martech/src/index.js');
    const consent = getConsentFromCookie();
    const ready = martech.initMartech(
      {
        datastreamId: DATASTREAM_ID,
        orgId: ORG_ID,
      },
      {
        // NOTE: the Launch embed is NOT passed via launchUrls — the plugin
        // loads those with a dynamic import(), a CORS module request that
        // assets.adobedtm.com rejects on ported origins (breaks `aem up`
        // local dev). runMartechDelayed() loads it as a classic script tag.
        // Personalization is opt-in per page (a `Target` metadata key in DA)
        // and needs a prior consent decision: a first-time visitor can't
        // answer the (delayed) banner within the 1s personalization timeout.
        personalization: !!getMetadata('target') && !!consent?.personalize,
      },
    );
    // Returning visitors: apply the cookie-derived decision right away so the
    // 'pending' event queue flushes without waiting for the delayed banner.
    if (consent) martech.updateUserConsent(consent);
    // Live banner changes: an OptanonWrapper rule in the Launch property
    // dispatches `consent.onetrust` with the active group ids.
    window.addEventListener('consent.onetrust', (e) => {
      martech.updateUserConsent(consentFromGroups(e.detail || []));
    });
    await ready;
    return martech;
  })();
  return initPromise;
}

export async function runMartechEager() {
  if (eagerDone) return;
  eagerDone = true;
  const martech = await initPromise;
  if (martech) await martech.martechEager();
}

export async function runMartechLazy() {
  const martech = await initPromise;
  if (martech) await martech.martechLazy();
}

export async function runMartechDelayed() {
  const martech = await initPromise;
  if (!martech) return;
  martech.martechDelayed();
  // Legacy Launch property (OneTrust / ContentSquare). Loaded as a classic
  // script tag instead of the plugin's launchUrls (see note in loadMartech).
  loadScript(getLaunchScript(), { async: '' });
}
