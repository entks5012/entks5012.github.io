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

/* ==========================================================================
   GA4 Event Tracking: 구간 도달(section_view) 및 CTA 클릭(cta_click)
   ========================================================================== */
function initGA4Tracking() {
  if (window.__GA4_TRACKING_INITIALIZED__) return;
  window.__GA4_TRACKING_INITIALIZED__ = true;

  function sendGAEvent(eventName, params) {
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', eventName, params);
      } catch (err) {
        console.warn('GA4 event sending failed:', err);
      }
    }
  }

  /* ------------------------------------------------------------------------
     1. 구간 도달 (section_view)
     - 관찰 대상:
       #hero-title → 'hero'
       #pain-title → 'detail' (디테일 구간 진입 대표 제목)
       #offer-title → 'cta' (최하단 제안 섹션 대표 제목)
     ------------------------------------------------------------------------ */
  const sectionConfigs = [
    { selector: '#hero-title', name: 'hero' },
    { selector: '#pain-title', name: 'detail' },
    { selector: '#offer-title', name: 'cta' }
  ];

  const sentSections = new Set();
  const elementSectionMap = new Map();
  const trackedElements = [];

  function getHeaderOffset() {
    const header = document.querySelector('header, .site-header');
    if (!header) return 0;
    const style = window.getComputedStyle(header);
    if (style.position === 'fixed' || style.position === 'sticky') {
      return Math.ceil(header.getBoundingClientRect().height) || 0;
    }
    return 0;
  }

  let observer = null;

  function triggerSectionView(name, element) {
    if (sentSections.has(name)) return;
    if (document.visibilityState !== 'visible') return;

    sentSections.add(name);
    if (observer && element) {
      observer.unobserve(element);
    }

    sendGAEvent('section_view', {
      section_name: name
    });
  }

  function checkCurrentlyVisibleSections() {
    if (document.visibilityState !== 'visible') return;
    const headerOffset = getHeaderOffset();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

    trackedElements.forEach(({ element, name }) => {
      if (!element || sentSections.has(name)) return;
      const rect = element.getBoundingClientRect();
      const elHeight = rect.height;
      const elWidth = rect.width;
      if (elHeight === 0 || elWidth === 0) return;

      const visibleTop = Math.max(rect.top, headerOffset);
      const visibleBottom = Math.min(rect.bottom, viewportHeight);
      const visibleLeft = Math.max(rect.left, 0);
      const visibleRight = Math.min(rect.right, viewportWidth);

      if (visibleTop < visibleBottom && visibleLeft < visibleRight) {
        const visibleArea = (visibleBottom - visibleTop) * (visibleRight - visibleLeft);
        const totalArea = elHeight * elWidth;
        if (visibleArea / totalArea >= 0.5) {
          triggerSectionView(name, element);
        }
      }
    });
  }

  const headerOffset = getHeaderOffset();
  const rootMargin = headerOffset > 0 ? `-${headerOffset}px 0px 0px 0px` : '0px 0px 0px 0px';

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const sectionName = elementSectionMap.get(entry.target);
          if (sectionName) {
            triggerSectionView(sectionName, entry.target);
          }
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: rootMargin
    });

    sectionConfigs.forEach(({ selector, name }) => {
      const el = document.querySelector(selector);
      if (el) {
        elementSectionMap.set(el, name);
        trackedElements.push({ element: el, name: name });
        observer.observe(el);
      }
    });
  }

  // 다른 탭에서 복귀 시 현재 뷰포트에 보이는 제목 즉시 점검
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkCurrentlyVisibleSections();
    }
  });

  // 최초 로드 시점 화면에 이미 보이는 제목 점검
  if (document.visibilityState === 'visible') {
    checkCurrentlyVisibleSections();
  }

  /* ------------------------------------------------------------------------
     2. CTA 클릭 (cta_click)
     - 대상:
       #cta-hero 또는 [data-cta-location="hero"] → 'hero'
       #cta-final 또는 [data-cta-location="final"] → 'final'
     ------------------------------------------------------------------------ */
  const ctaConfigs = [
    { selector: '#cta-hero, [data-cta-location="hero"]', location: 'hero' },
    { selector: '#cta-final, [data-cta-location="final"]', location: 'final' }
  ];

  const boundCtaElements = new Set();

  ctaConfigs.forEach(({ selector, location }) => {
    document.querySelectorAll(selector).forEach((button) => {
      if (boundCtaElements.has(button)) return;
      boundCtaElements.add(button);

      // 일반 클릭 및 키보드 Enter 활성화 시 1회 발화
      button.addEventListener('click', () => {
        sendGAEvent('cta_click', {
          button_location: location
        });
      });
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGA4Tracking);
} else {
  initGA4Tracking();
}
