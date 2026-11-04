/**
 * Header fixo, adaptativo e com destaque da seção ativa.
 *
 * Três comportamentos:
 * 1. `is-scrolled` — a partir de um pequeno deslocamento, o header ganha fundo
 *    translúcido com blur.
 * 2. `is-on-dark`  — quando a seção sob o header é escura, o header inverte
 *    cores para manter contraste (logo, links e hamburger).
 * 3. `aria-current` — o link do menu correspondente à seção visível é marcado.
 *
 * Tudo é calculado dentro de um único `requestAnimationFrame` por evento de
 * scroll, para não disparar layout thrashing.
 */

const SCROLLED_OFFSET = 24;

export function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;

  /** Seções que declaram explicitamente o tema do fundo. */
  const themedSections = Array.from(document.querySelectorAll('[data-header-theme]'));
  const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  let ticking = false;

  function update() {
    ticking = false;

    const scrollY = window.scrollY;
    header.classList.toggle('is-scrolled', scrollY > SCROLLED_OFFSET);

    // --- Tema do header conforme a seção sob ele ---
    // Usamos a linha logo abaixo do header como ponto de amostragem.
    const probeY = header.offsetHeight * 0.6;
    const onDark = themedSections.some((section) => {
      const rect = section.getBoundingClientRect();
      return (
        rect.top <= probeY &&
        rect.bottom > probeY &&
        section.getAttribute('data-header-theme') === 'dark'
      );
    });
    header.classList.toggle('is-on-dark', onDark);

    // --- Seção ativa no menu ---
    // A seção "ativa" é a última cujo topo já passou pela linha de amostragem.
    let activeId = '';
    const activationLine = header.offsetHeight + 8;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= activationLine) {
        activeId = section.id;
      }
    }
    // No fim da página, marca sempre a última seção do menu.
    if (window.innerHeight + scrollY >= document.body.scrollHeight - 2 && sections.length) {
      activeId = sections[sections.length - 1].id;
    }

    navLinks.forEach((link) => {
      const isActive = Boolean(activeId) && link.getAttribute('href') === `#${activeId}`;
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
}
