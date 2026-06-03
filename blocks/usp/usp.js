export default function decorate(block) {
  const cells = [...block.children].map((row) => row.firstElementChild).filter(Boolean);
  const media = document.createElement('div');
  media.className = 'usp-media';
  const content = document.createElement('div');
  content.className = 'usp-content';

  cells.forEach((cell) => {
    const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
    const directPicture = [...cell.children].some((c) => c.tagName === 'PICTURE');
    const links = cell.querySelectorAll('a');
    const isCta = links.length === 1
      && !cell.querySelector('picture')
      && cell.textContent.trim() === links[0].textContent.trim();

    if (heading) {
      cell.classList.add('usp-heading');
      content.append(cell);
    } else if (isCta) {
      cell.classList.add('usp-cta');
      links[0].classList.add('button', 'secondary');
      content.append(cell);
    } else if (directPicture) {
      media.append(cell);
    } else {
      cell.classList.add('usp-item');
      // pull the icon out of the title paragraph so the item can lay out as
      // an icon column next to a text column (title + body)
      const icon = cell.querySelector('p:first-child picture');
      if (icon) {
        const iconWrap = document.createElement('div');
        iconWrap.className = 'usp-icon';
        iconWrap.append(icon);
        cell.prepend(iconWrap);
      }
      content.append(cell);
    }
  });

  block.textContent = '';
  if (media.children.length) block.append(media);
  block.append(content);
}
