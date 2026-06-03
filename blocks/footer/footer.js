import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav/footer';

/**
 * Loads and decorates the footer from a nav fragment.
 * Fragment sections (in order): 0 = link columns, 1 = social label,
 * 2 = legal links, 3 = copyright. Social icons are not in the content.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerPath = getMetadata('footer') || FOOTER_PATH;
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  const sections = [...fragment.children];
  const contentOf = (section) => section && section.querySelector(':scope > div');

  const inner = document.createElement('div');
  inner.className = 'footer-inner';

  // ---- link columns ----
  const columnsUl = contentOf(sections[0])?.querySelector(':scope > ul');
  if (columnsUl) {
    const columns = document.createElement('div');
    columns.className = 'footer-columns';
    columnsUl.querySelectorAll(':scope > li').forEach((li) => {
      li.classList.add('footer-column');
      li.querySelector(':scope > p')?.classList.add('footer-title');
    });
    columns.append(columnsUl);
    inner.append(columns);
  }

  // ---- "Vind ons ook op" label (social icons are not authored) ----
  const socialWrap = contentOf(sections[1]);
  if (socialWrap) {
    const social = document.createElement('div');
    social.className = 'footer-social';
    social.append(...socialWrap.childNodes);
    inner.append(social);
  }

  // ---- legal links row ----
  const legalWrap = contentOf(sections[2]);
  if (legalWrap) {
    const legal = document.createElement('div');
    legal.className = 'footer-legal';
    legal.append(...legalWrap.childNodes);
    inner.append(legal);
  }

  // ---- copyright ----
  const copyWrap = contentOf(sections[3]);
  if (copyWrap) {
    const copyright = document.createElement('div');
    copyright.className = 'footer-copyright';
    copyright.append(...copyWrap.childNodes);
    inner.append(copyright);
  }

  block.textContent = '';
  block.append(inner);
}
