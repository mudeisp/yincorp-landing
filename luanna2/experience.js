const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const title = document.querySelector('h1');
if (!reducedMotion.matches) {
  const animatedTitle = document.createElement('span');
  const phrases = ['Luanna, dois endereços.', 'Duas formas de viver São Paulo.'];
  const letters = phrases.join('\n');
  title.setAttribute('aria-label', phrases.join(' '));
  animatedTitle.setAttribute('aria-hidden', 'true');
  animatedTitle.style.whiteSpace = 'pre-line';
  title.replaceChildren(animatedTitle);
  let start;
  function reveal(now) {
    start ??= now;
    const count = Math.min(letters.length, Math.floor((now - start) / 16) + 1);
    animatedTitle.textContent = letters.slice(0, count);
    if (count < letters.length) requestAnimationFrame(reveal);
  }
  requestAnimationFrame(reveal);
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-reveal');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('main section:not(.hero)').forEach((section) => observer.observe(section));
  }
}

const gallery = document.querySelector('#light');
gallery.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    gallery.querySelector(event.key === 'ArrowLeft' ? '#prev' : '#next').click();
  }
});

document.querySelector('[data-contact]').addEventListener('click', () => {
  window.gtag?.('event', 'whatsapp_click', { location: 'luanna2' });
  window.fbq?.('trackCustom', 'WhatsAppClick', { location: 'luanna2' });
});
