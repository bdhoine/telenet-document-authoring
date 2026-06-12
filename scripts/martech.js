import { loadScript } from './aem.js';

// Adobe Experience Platform Launch (tags). Loaded in the LAZY phase (right after
// the eager LCP content), not the delayed phase, so the consent banner / tags
// surface promptly instead of ~3s late. Still off the critical render path.
//
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

export default function loadLaunch() {
  initCookiePreferences();
  return loadScript(getLaunchScript(), { async: '' });
}
