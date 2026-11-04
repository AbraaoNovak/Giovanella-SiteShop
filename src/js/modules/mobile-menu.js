/**
 * Menu mobile (hamburger).
 *
 * Requisitos atendidos:
 * - abre e fecha com transição suave;
 * - fecha ao clicar em um link, ao clicar fora e com a tecla ESC;
 * - `aria-expanded` / `aria-controls` corretos;
 * - bloqueia o scroll do fundo enquanto aberto (sem "pulo" de layout);
 * - foco preso dentro do painel e devolvido ao botão ao fechar.
 */

import { trackEvent } from './analytics.js';
import { onMediaChange } from './env.js';

/** Seletor dos elementos focáveis usados no focus trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  if (!toggle || !menu) return;

  const panel = menu.querySelector('[data-menu-panel]');
  const backdrop = menu.querySelector('[data-menu-backdrop]');
  let isOpen = false;

  function open() {
    if (isOpen) return;
    isOpen = true;

    // Compensa a barra de rolagem que some ao travar o body,
    // evitando deslocamento horizontal do conteúdo.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    document.body.classList.add('is-locked');
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');

    // Foco no primeiro item para quem navega por teclado.
    panel?.querySelector(FOCUSABLE)?.focus({ preventScroll: true });
    trackEvent('menu_mobile_abrir');
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;

    document.body.classList.remove('is-locked');
    document.body.style.paddingRight = '';
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');

    if (restoreFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => (isOpen ? close() : open()));

  // Clique fora (no backdrop) fecha.
  backdrop?.addEventListener('click', () => close());

  // Clique em qualquer link do painel fecha — sem devolver o foco ao botão,
  // pois o usuário está navegando para o conteúdo.
  panel?.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) {
      close({ restoreFocus: false });
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    // Focus trap: mantém a navegação por Tab dentro do painel aberto.
    if (event.key === 'Tab' && panel) {
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Ao voltar para o layout desktop, o menu mobile não deve continuar aberto.
  // `onMediaChange` cobre navegadores sem MediaQueryList.addEventListener.
  onMediaChange('(min-width: 1024px)', (event) => {
    if (event.matches) close({ restoreFocus: false });
  });
}
