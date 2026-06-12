// Interaction tracking -> adobeDataLayer (created by the aem-martech plugin;
// absent when martech is skipped, e.g. tests and DA author tooling). This
// module is evaluated once per page lifetime (dynamic-import cache), so the
// top-level listeners can't double-bind.
const dataLayer = window.adobeDataLayer;
if (dataLayer) {
  document.addEventListener('click', (e) => {
    const cta = e.target.closest('a.button');
    if (!cta) return;
    dataLayer.push({
      event: 'cta-click',
      eventInfo: {
        label: (cta.title || cta.textContent).trim(),
        href: cta.href,
      },
    });
  });

  // 'toggle' doesn't bubble -> capture phase.
  document.addEventListener('toggle', (e) => {
    if (!e.target.matches?.('.accordion details') || !e.target.open) return;
    dataLayer.push({
      event: 'accordion-open',
      eventInfo: {
        label: e.target.querySelector('summary')?.textContent.trim(),
      },
    });
  }, true);
}
