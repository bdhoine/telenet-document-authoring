/*
 * Accordion Block
 * Renders question/answer rows as a collapsible accordion.
 * Each row is a single cell: the first paragraph is the label (question),
 * the remaining content is the body (answer).
 */

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const cell = row.children[0];
    if (!cell) return;

    const label = cell.querySelector(':scope > p');
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    if (label) {
      summary.append(...label.childNodes);
      label.remove();
    }

    const body = document.createElement('div');
    body.className = 'accordion-item-body';
    body.append(...cell.childNodes);

    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary, body);

    row.replaceWith(details);
  });
}
