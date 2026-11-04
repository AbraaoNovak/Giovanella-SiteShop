/**
 * CARROSSEL CONTÍNUO DE DEPOIMENTOS ("marquee")
 *
 * Os cards deslizam lentamente da direita para a esquerda, em loop, dentro
 * da largura do conteúdo. As bordas são esmaecidas no CSS: um depoimento vai
 * sumindo à esquerda enquanto o próximo surge à direita.
 *
 * Como o loop fica sem emenda: os cards são duplicados uma vez e o trilho
 * anda exatamente metade da própria largura; quando a cópia chega onde o
 * original começou, a animação recomeça — o salto é invisível.
 *
 * Como pausar (conteúdo em movimento precisa poder ser parado — WCAG 2.2.2).
 * Não há botão, por decisão do cliente; a pausa vem do CSS (:hover e
 * :focus-within), cobrindo os três tipos de uso:
 * - mouse:   passar o ponteiro sobre o carrossel;
 * - toque:   tocar no carrossel — ele recebe o foco (tabindex="0") e pausa;
 *            tocar fora devolve o movimento;
 * - teclado: chegar ao carrossel com Tab.
 *
 * Outros cuidados:
 * - as cópias ficam ocultas de leitores de tela e fora da ordem de foco;
 * - com "reduzir movimento", não há animação: os cards ficam parados numa
 *   faixa rolável (e a preferência é obedecida mesmo se mudar durante a visita);
 * - fora da tela a animação pausa, para não gastar bateria à toa.
 *
 * Sem JavaScript, o CSS já exibe a faixa rolável com os cards originais.
 */

import { prefersReducedMotion, onMediaChange } from './env.js';

/** Velocidade do deslize, em pixels por segundo ("lentamente"). */
const VELOCIDADE = 32;
/** Duração mínima de uma volta, para telas estreitas. */
const DURACAO_MINIMA = 25;

export function initMarquee() {
  const root = document.querySelector('[data-marquee]');
  const track = root && root.querySelector('[data-marquee-track]');
  if (!root || !track) return;

  const originais = Array.from(track.children);
  let clones = [];
  let rodando = false;

  /** Duplica os cards uma vez, para o loop sem emenda. */
  function criarClones() {
    if (clones.length) return;
    clones = originais.map((card) => {
      const copia = card.cloneNode(true);
      // A cópia é só visual: invisível para leitores de tela e fora do foco.
      copia.setAttribute('aria-hidden', 'true');
      copia.setAttribute('inert', '');
      track.appendChild(copia);
      return copia;
    });
  }

  function removerClones() {
    clones.forEach((copia) => copia.remove());
    clones = [];
  }

  /** Ajusta a duração para manter a mesma velocidade em qualquer largura. */
  function medir() {
    if (!rodando) return;
    const metade = track.scrollWidth / 2;
    const segundos = Math.max(DURACAO_MINIMA, metade / VELOCIDADE);
    root.style.setProperty('--marquee-duration', `${segundos.toFixed(1)}s`);
  }

  function ligar() {
    criarClones();
    rodando = true;
    root.classList.add('is-running');
    medir();
  }

  function desligar() {
    rodando = false;
    root.classList.remove('is-running');
    removerClones();
  }

  // Fora da tela, pausa (economia de CPU e bateria).
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entradas) => {
      entradas.forEach((e) => root.classList.toggle('is-offscreen', !e.isIntersecting));
    }).observe(root);
  }

  let espera;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(espera);
      espera = setTimeout(medir, 200);
    },
    { passive: true }
  );

  if (prefersReducedMotion()) desligar();
  else ligar();

  // Obedece se o usuário mudar a preferência de movimento durante a visita.
  onMediaChange('(prefers-reduced-motion: reduce)', (evento) => {
    if (evento.matches) desligar();
    else ligar();
  });
}
