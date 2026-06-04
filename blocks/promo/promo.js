function classify(block) {
  const cell = block.querySelector(':scope > div > div');
  if (!cell) return;

  // Each logical paragraph is a direct <p> in the live render, but DA Quick Edit
  // wraps it in <div class="prosemirror-editor">. Resolve each to the element that
  // survives the editor (the wrapper in Quick Edit, the <p> otherwise) plus the
  // inner <p> used for classification.
  const units = [...cell.children]
    .map((child) => {
      const p = child.tagName === 'P' ? child : child.querySelector(':scope p');
      return p ? { el: child, p } : null;
    })
    .filter(Boolean);

  const hasPicture = (u) => !!u.p.querySelector('picture');
  const hasLink = (u) => !!u.p.querySelector('a');
  const isFullyBold = (u) => {
    const s = u.p.querySelector('strong');
    return s && u.p.textContent.trim() === s.textContent.trim();
  };

  // media: square-ish photos act as a full-card background (telenet.be); wide
  // graphics render inline at the bottom. Only classify in the live render (el is
  // the <p>); in Quick Edit the prose wrapper handles it via the structural
  // fallback in promo.css (positioning a stripped class on the inner <p> would not
  // work since the wrapper, not the <p>, is the flex child).
  const mediaUnit = units.find(hasPicture);
  if (mediaUnit && mediaUnit.el === mediaUnit.p) {
    mediaUnit.p.classList.add('promo-media');
    const img = mediaUnit.p.querySelector('img');
    const w = Number(img?.getAttribute('width'));
    const h = Number(img?.getAttribute('height'));
    const isBackground = w && h && h / w > 0.6;
    mediaUnit.p.classList.add(isBackground ? 'promo-media-bg' : 'promo-media-inline');
  }

  // Eyebrow/tag = a fully-bold paragraph; title = the first partially-bold one.
  // Classed on the surviving wrapper so the styling holds in Quick Edit (the
  // fully-bold-vs-partial-bold classification can't be expressed in CSS alone).
  const textUnits = units.filter((u) => !hasPicture(u) && !hasLink(u));
  const tagUnit = textUnits.find(isFullyBold);
  if (tagUnit) tagUnit.el.classList.add('promo-tag');
  const titleUnit = textUnits.find((u) => u !== tagUnit && u.p.querySelector('strong'));
  if (titleUnit) titleUnit.el.classList.add('promo-title');

  // CTA = a link that is the sole content of its paragraph -> underlined link
  const ctaUnit = units.find((u) => {
    const a = u.p.querySelector('a');
    return a && u.p.textContent.trim() === a.textContent.trim();
  });
  if (ctaUnit) ctaUnit.el.classList.add('promo-cta');
}

export default function decorate(block) {
  classify(block);

  // DA Quick Edit wraps each paragraph in .prosemirror-editor *after* decorate runs
  // (stripping the classes off the prose nodes), so re-classify the surviving
  // wrappers whenever the editor rebuilds the prose. classify() only adds classes
  // (no childList changes), so observing childList does not retrigger itself; in the
  // live render the prose never changes after decoration, so this stays idle.
  if (!block.dataset.promoObserved) {
    block.dataset.promoObserved = 'true';
    new MutationObserver(() => classify(block)).observe(block, { childList: true, subtree: true });
  }
}
