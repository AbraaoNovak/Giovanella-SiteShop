/**
 * Scroll reveal — revela elementos `[data-reveal]` ao entrarem na viewport.
 *
 * Usa IntersectionObserver (assíncrono, sem custo de scroll) e desconecta
 * cada elemento após a primeira revelação.
 */

import { prefersReducedMotion } from './env.js';

export function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  // Sem movimento ou sem suporte: tudo já visível.
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    },
    // Revela um pouco antes de entrar totalmente na tela.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );

  items.forEach((el, index) => {
    // Escalonamento leve entre irmãos, limitado para não atrasar a leitura.
    const declared = el.getAttribute('data-reveal-delay');
    const delay = declared ?? String(Math.min(index % 4, 3) * 70);
    el.style.setProperty('--reveal-delay', `${delay}ms`);
    observer.observe(el);
  });
}
