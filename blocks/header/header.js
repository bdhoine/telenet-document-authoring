import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const NAV_PATH = '/fragments/nav/header';

/**
 * Loads and decorates the header from a nav fragment.
 * Fragment sections: 0 = top-left utility, 1 & 2 = top-right utility,
 * 3 = main nav (logo + links). A search box is added statically.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navPath = getMetadata('header') || NAV_PATH;
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  const sections = [...fragment.children];
  const listOf = (section) => section && section.querySelector('ul');

  const nav = document.createElement('nav');
  nav.id = 'nav';

  // ---- top utility bar ----
  const utility = document.createElement('div');
  utility.className = 'nav-utility';
  const utilLeft = document.createElement('div');
  utilLeft.className = 'nav-utility-left';
  const utilRight = document.createElement('div');
  utilRight.className = 'nav-utility-right';
  if (listOf(sections[0])) utilLeft.append(listOf(sections[0]));
  if (listOf(sections[1])) utilRight.append(listOf(sections[1]));
  if (listOf(sections[2])) utilRight.append(listOf(sections[2]));
  utility.append(utilLeft, utilRight);

  // dropdown entries are list items that contain a nested list
  utility.querySelectorAll('li:has(> ul)').forEach((li) => li.classList.add('has-dropdown'));

  // a bold item inside a dropdown (e.g. "Aanmelden") renders as a button
  utility.querySelectorAll('.has-dropdown strong').forEach((strong) => {
    const target = strong.querySelector('a') || strong;
    target.classList.add('button');
    target.closest('li')?.classList.add('nav-dropdown-cta');
  });

  // ---- main bar: brand + nav links + search ----
  const main = document.createElement('div');
  main.className = 'nav-main';

  const brand = document.createElement('a');
  brand.className = 'nav-brand';
  brand.href = '/';
  brand.setAttribute('aria-label', 'Home');
  const logo = sections[3] && sections[3].querySelector('picture');
  if (logo) brand.append(logo);

  const links = document.createElement('div');
  links.className = 'nav-links';
  if (listOf(sections[3])) links.append(listOf(sections[3]));

  const search = document.createElement('div');
  search.className = 'nav-search';
  search.innerHTML = `
    <svg class="nav-search-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <input type="search" placeholder="Zoek" aria-label="Zoek" />`;

  // links + search share a drawer; on desktop the drawer is `display: contents`
  // so they lay out inline, on mobile it becomes the collapsible menu panel
  const drawer = document.createElement('div');
  drawer.className = 'nav-drawer';
  drawer.append(links, search);

  // hamburger toggles the drawer on mobile (hidden on desktop via CSS)
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-label', 'Menu');
  hamburger.setAttribute('aria-controls', 'nav');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span></span><span></span><span></span>';
  hamburger.addEventListener('click', () => {
    const open = nav.classList.toggle('nav-open');
    hamburger.setAttribute('aria-expanded', String(open));
  });
  // close the menu after following a link
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('nav-open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });

  main.append(brand, drawer, hamburger);

  nav.append(utility, main);
  block.textContent = '';
  block.append(nav);
}
