'use strict';
// No affiliate links, analytics, network requests or persistent storage.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-status]').forEach((button) => {
  button.addEventListener('click', () => {
    const status = document.getElementById(button.dataset.status);
    status.textContent = '아직 준비 중입니다.';
  });
});

document.querySelectorAll('.faq-toggle').forEach((button) => {
  button.addEventListener('click', () => {
    const answer = document.getElementById(button.getAttribute('aria-controls'));
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!expanded));
    answer.hidden = expanded;
    button.querySelector('span').textContent = expanded ? '+' : '−';
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const destination = document.getElementById(link.getAttribute('href').slice(1));
    if (!destination) return;
    event.preventDefault();
    const focusTarget = destination.querySelector('h1, h2') || destination;
    if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
    destination.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    // file:// previews may restrict History API. Native fragment navigation is the fallback.
    try { window.history.pushState(null, '', link.getAttribute('href')); }
    catch { window.location.hash = destination.id; }
  });
});

function showImagePlaceholder(img) {
  if (img.dataset.failed) return;
  img.dataset.failed = 'true';
  const placeholder = document.createElement('div');
  placeholder.className = 'image-placeholder';
  placeholder.textContent = '이미지 준비 중';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute('aria-label', `이미지 준비 중: ${img.alt}`);
  const width = Number(img.getAttribute('width'));
  const height = Number(img.getAttribute('height'));
  if (width && height) placeholder.style.aspectRatio = `${width} / ${height}`;
  img.hidden = true;
  img.insertAdjacentElement('afterend', placeholder);
  img.closest('figure')?.classList.add('image-failed');
}
document.querySelectorAll('img').forEach((img) => {
  img.addEventListener('error', () => showImagePlaceholder(img));
  if (img.complete && img.naturalWidth === 0) showImagePlaceholder(img);
});
