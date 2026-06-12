// add delayed functionality here
import { loadScript } from './aem.js';

// Adobe Experience Platform Launch (tags) — loaded in the delayed phase so the
// third-party MarTech script doesn't impact LCP / Core Web Vitals.
// See https://www.aem.live/developer/keeping-it-100
//
// Launch publishes one embed code per environment (Development / Staging /
// Production), each with its own build hash. Pick the right one based on the
// EDS host: localhost / local.telenet.be -> Development, *.aem.page (preview)
// -> Staging, *.aem.live + the production domain(s) -> Production.
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

loadScript(getLaunchScript(), { async: '' });
