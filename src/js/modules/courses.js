/**
 * CURSOS — expandir / recolher a lista completa
 *
 * A seção mostra os cursos em destaque e mantém os demais recolhidos atrás de
 * um botão "Ver mais cursos".
 *
 * Progressive enhancement: os cards extras estão SEMPRE no HTML (o buscador
 * indexa todos os nomes de curso) e, sem JavaScript, aparecem normalmente —
 * quem não tem JS simplesmente vê a lista inteira. Quando há JavaScript, a
 * classe `.js` no <html> (aplicada por um script inline no <head>, antes da
 * primeira pintura) faz o CSS recolher os extras sem qualquer piscada.
 *
 * Acessibilidade:
 * - o botão usa `aria-expanded` e `aria-controls`;
 * - recolher com o foco dentro da área fechada devolveria o foco ao <body>,
 *   então ele é trazido de volta ao botão;
 * - ao recolher, a seção é reposicionada para o usuário não "cair" no meio da
 *   página — respeitando `prefers-reduced-motion`.
 */

import { trackEvent } from './analytics.js';
import { prefersReducedMotion } from './env.js';

export function initCourses() {
  const toggle = document.querySelector('[data-courses-toggle]');
  const extra = document.querySelector('[data-courses-extra]');
  if (!toggle || !extra) return;

  const label = toggle.querySelector('[data-courses-toggle-label]');
  const section = toggle.closest('section');

  // Os textos são derivados da quantidade real de cards: se o cliente
  // acrescentar ou remover cursos no HTML, o rótulo continua correto.
  const totalCursos = section ? section.querySelectorAll('.course-card').length : 0;
  const textoFechado = totalCursos
    ? `Ver todos os ${totalCursos} cursos`
    : 'Ver mais cursos';
  const textoAberto = 'Ver menos cursos';

  /** Estado inicial: recolhido (o CSS já garante isso antes da pintura). */
  let aberto = false;
  if (label) label.textContent = textoFechado;

  function expandir() {
    aberto = true;
    extra.classList.add('is-expanded');
    toggle.setAttribute('aria-expanded', 'true');
    if (label) label.textContent = textoAberto;
    trackEvent('cursos_ver_mais', { label: 'expandir' });
  }

  function recolher() {
    aberto = false;

    // Se o foco está em um card que vai sumir, ele precisa voltar para o botão
    // — caso contrário o navegador o joga no <body> e a navegação por teclado
    // recomeça do topo da página.
    const focoDentro = extra.contains(document.activeElement);

    extra.classList.remove('is-expanded');
    toggle.setAttribute('aria-expanded', 'false');
    if (label) label.textContent = textoFechado;

    if (focoDentro) toggle.focus({ preventScroll: true });

    // Recolher encurta a página bruscamente; trazer a seção de volta ao campo
    // de visão evita a sensação de "salto".
    if (section && section.getBoundingClientRect().top < 0) {
      section.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      });
    }

    trackEvent('cursos_ver_mais', { label: 'recolher' });
  }

  toggle.addEventListener('click', () => (aberto ? recolher() : expandir()));
}
