/**
 * EXPERIMENTO 1 — Patinhas atravessando as divisas das seções
 *
 * Em cada emenda entre duas seções existe uma trilha de pegadas que cruza a
 * página na diagonal. As pegadas NÃO se movem: elas são *carimbadas* uma a uma
 * conforme a divisa sobe pela tela, como se o animal estivesse deixando as
 * marcas naquele momento.
 *
 * - Scroll para baixo: a divisa sobe, o progresso cresce e as pegadas surgem
 *   em sequência, do início ao fim do trajeto.
 * - Scroll para cima: o progresso diminui e as pegadas somem na ordem inversa,
 *   como se o animal recuasse pelo mesmo caminho.
 * - O sentido do trajeto alterna a cada divisa (uma vez da direita para a
 *   esquerda, a seguinte da esquerda para a direita), o que dá a impressão de
 *   travessias diferentes ao longo da página.
 *
 * Decisões de performance:
 * - as pegadas são posicionadas UMA vez; durante o scroll só alternamos uma
 *   classe, então não há recálculo de layout por frame;
 * - trilhas fora da viewport são ignoradas no laço de scroll;
 * - a classe só é tocada quando a quantidade carimbada muda;
 * - `requestAnimationFrame` apenas quando há scroll pendente — em repouso o
 *   custo de CPU é zero;
 * - com `prefers-reduced-motion` ou em aparelhos de baixo desempenho, as
 *   pegadas aparecem ESTÁTICAS (todas carimbadas, sem transição) em vez de
 *   sumirem — ver `resolvePawMode`.
 */

import { prefersReducedMotion, isLowPowerDevice, onMediaChange } from './env.js';

/**
 * Lado do quadrado de cada pegada, em px.
 * É publicado no CSS como `--paw-size`, então este é o único lugar a mudar.
 */
export const PAW_SIZE = 34.5;
/** Quanto a trilha se afasta da divisa, para cima e para baixo. */
const SEAM_SPREAD = 74;
/**
 * Meia-altura da janela de recorte da trilha.
 * A trilha é uma caixa com `overflow: hidden` centrada na divisa: é ela que
 * impede as pegadas das pontas — que saem de propósito pelas laterais — de
 * gerarem rolagem horizontal e de alargarem a viewport de layout no celular.
 * Precisa acomodar SEAM_SPREAD + a pegada inteira + a variação aleatória.
 */
export const TRAIL_HALF = 130;
/** Afastamento lateral entre a pata esquerda e a direita. */
const PAW_STRIDE = 13;
/** Espaçamento alvo entre pegadas — define quantas cabem na largura. */
const STEP_SPACING = 132;
/** Limites de pegadas por trilha. */
const MIN_PAWS = 4;
const MAX_PAWS = 12;
/** Opacidade máxima — o efeito deve ser percebido, nunca disputar atenção. */
const MAX_OPACITY = 0.264;

/** Desenho da pegada (coxim central e quatro dedos), apontando "para cima". */
const PAW_SVG = `
<svg class="paw" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <ellipse cx="32" cy="42" rx="15" ry="13"/>
  <ellipse cx="14" cy="28" rx="7" ry="9" transform="rotate(-18 14 28)"/>
  <ellipse cx="26" cy="17" rx="6.5" ry="9" transform="rotate(-7 26 17)"/>
  <ellipse cx="40" cy="17" rx="6.5" ry="9" transform="rotate(7 40 17)"/>
  <ellipse cx="51" cy="28" rx="7" ry="9" transform="rotate(18 51 28)"/>
</svg>`;

/**
 * Calcula a posição e o giro de UMA pegada dentro de uma trilha.
 * Função pura — sem DOM — para manter a geometria do efeito testável.
 *
 * @param {object} params
 * @param {number} params.index      Índice da pegada (0 = primeira do trajeto).
 * @param {number} params.count      Total de pegadas na trilha.
 * @param {number} params.width      Largura disponível, em px.
 * @param {1|-1}  params.direction   1 = da direita para a esquerda; -1 = inverso.
 * @param {number} [params.seed]     Semente para variação determinística.
 * @returns {{x:number,y:number,rotation:number}} Coordenadas do canto superior
 *   esquerdo da pegada (já descontando metade do tamanho) e giro em graus.
 */
export function computeTrailPaw({ index, count, width, direction, seed = 0 }) {
  // Posição normalizada ao longo do trajeto (0 = início, 1 = fim).
  const t = count > 1 ? index / (count - 1) : 0.5;

  // O trajeto vai de borda a borda: as pegadas das pontas ficam pela metade,
  // recortadas pela janela da trilha, como se o animal entrasse e saísse da
  // página. Sem margem extra, nenhuma pegada é desperdiçada fora da tela.
  const xFrom = direction === 1 ? width : 0;
  const xTo = direction === 1 ? 0 : width;
  // Sempre atravessa a divisa: começa abaixo dela e termina acima.
  const yFrom = SEAM_SPREAD;
  const yTo = -SEAM_SPREAD;

  const x = xFrom + (xTo - xFrom) * t;
  const y = yFrom + (yTo - yFrom) * t;

  // Vetor unitário do trajeto, usado para o giro e para o passo lateral.
  const dx = xTo - xFrom;
  const dy = yTo - yFrom;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;

  // Pata esquerda e direita se alternam perpendicularmente ao trajeto.
  const side = index % 2 === 0 ? 1 : -1;
  const strideX = -uy * PAW_STRIDE * side;
  const strideY = ux * PAW_STRIDE * side;

  // Variação determinística: evita uma linha reta e artificial demais.
  const wobble = Math.sin((index + seed) * 2.399);

  // O desenho aponta para cima, por isso o +90° sobre o ângulo do trajeto.
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI + 90 + wobble * 8;

  return {
    x: x + strideX + wobble * 6 - PAW_SIZE / 2,
    y: y + strideY + wobble * 5 - PAW_SIZE / 2,
    rotation,
  };
}

/**
 * Converte a posição da divisa na tela em progresso de 0 a 1.
 * O carimbo começa quando a divisa entra pela base e termina um pouco acima
 * do meio da tela — assim a travessia se completa enquanto ainda está visível.
 *
 * @param {number} seamY           Distância da divisa ao topo da viewport.
 * @param {number} viewportHeight
 * @returns {number} progresso entre 0 e 1.
 */
export function seamProgress(seamY, viewportHeight) {
  const start = viewportHeight;
  const end = viewportHeight * 0.35;
  const p = (start - seamY) / (start - end);
  return Math.max(0, Math.min(1, p));
}

/**
 * Ajusta quantas pegadas de uma trilha estão carimbadas, tocando apenas nos
 * elementos que realmente mudaram de estado.
 *
 * Carimbar e descarimbar são simétricos: rolando para baixo as marcas surgem
 * na ordem do trajeto; rolando para cima elas somem na ordem inversa, como se
 * o animal recuasse pelo mesmo caminho.
 *
 * @param {{classList: {add: Function, remove: Function}}[]} paws
 * @param {number} anterior  Quantidade carimbada no estado atual.
 * @param {number} proxima   Quantidade desejada.
 * @returns {number} a nova quantidade carimbada (limitada ao tamanho da trilha).
 */
export function stampTrail(paws, anterior, proxima) {
  const alvo = Math.max(0, Math.min(paws.length, proxima));
  const atual = Math.max(0, Math.min(paws.length, anterior));

  if (alvo > atual) {
    for (let i = atual; i < alvo; i += 1) paws[i].classList.add('is-stamped');
  } else {
    for (let i = atual - 1; i >= alvo; i -= 1) paws[i].classList.remove('is-stamped');
  }
  return alvo;
}

/**
 * Decide como as patinhas devem se comportar neste navegador.
 *
 * - 'animated': carimbo progressivo acompanhando o scroll (padrão);
 * - 'static':   todas as pegadas já visíveis, sem transição e sem ouvir scroll.
 *
 * O modo estático substitui o antigo "desligar tudo". O pedido de acessibilidade
 * é não ter MOVIMENTO — a decoração em si não incomoda ninguém. Antes, com
 * "reduzir movimento" ativo (algo comum em Windows com efeitos visuais
 * desligados, em sessões de Área de Trabalho Remota ou em navegadores com
 * economia de energia), as patinhas simplesmente não apareciam.
 *
 * @returns {'animated'|'static'}
 */
export function resolvePawMode() {
  return prefersReducedMotion() || isLowPowerDevice() ? 'static' : 'animated';
}

export function initPaws() {
  const host = document.querySelector('[data-paw-seams]');
  if (!host) return;

  // Uma trilha para cada emenda: inserida no topo da seção seguinte, de modo
  // que metade das pegadas caia sobre a seção anterior e metade sobre a atual.
  // `children` + filtro em vez de `:scope > section`, por máxima compatibilidade.
  const sections = Array.from(host.children).filter((el) => el.tagName === 'SECTION');
  const targets = sections.slice(1);
  if (!targets.length) return;

  let mode = resolvePawMode();

  /** @type {{el:HTMLElement, section:HTMLElement, paws:HTMLElement[], stamped:number}[]} */
  let trails = [];
  let ticking = false;

  /** Cria (ou recria) as trilhas com a quantidade adequada à largura atual. */
  function build() {
    trails.forEach((trail) => trail.el.remove());

    const width = host.clientWidth;
    const count = Math.max(MIN_PAWS, Math.min(MAX_PAWS, Math.round(width / STEP_SPACING)));

    trails = targets.map((section, seamIndex) => {
      const el = document.createElement('div');
      el.className = 'paw-trail';
      el.setAttribute('aria-hidden', 'true');
      // Publica as medidas para o CSS: o JS é a única fonte da verdade.
      el.style.setProperty('--paw-size', `${PAW_SIZE}px`);
      el.style.setProperty('--paw-trail-half', `${TRAIL_HALF}px`);
      el.innerHTML = PAW_SVG.repeat(count);

      const paws = Array.from(el.querySelectorAll('.paw'));
      paws.forEach((paw, index) => {
        const { x, y, rotation } = computeTrailPaw({
          index,
          count,
          width,
          // O sentido alterna a cada divisa.
          direction: seamIndex % 2 === 0 ? 1 : -1,
          seed: seamIndex * 3,
        });
        paw.style.setProperty('--paw-x', `${x.toFixed(1)}px`);
        // `y` é medido a partir da divisa; a caixa da trilha começa
        // TRAIL_HALF acima dela, então deslocamos para o espaço da caixa.
        paw.style.setProperty('--paw-y', `${(y + TRAIL_HALF).toFixed(1)}px`);
        paw.style.setProperty('--paw-rot', `${rotation.toFixed(1)}deg`);
        // As primeiras marcas do trajeto ficam um pouco mais apagadas,
        // como pegadas que já começaram a secar.
        const fade = 0.72 + 0.28 * (index / Math.max(1, count - 1));
        paw.style.setProperty('--paw-opacity', (MAX_OPACITY * fade).toFixed(3));
      });

      section.insertBefore(el, section.firstChild);
      return { el, section, paws, stamped: 0 };
    });

    applyMode();
  }

  /** Aplica o modo atual a todas as trilhas. */
  function applyMode() {
    const estatico = mode === 'static';
    trails.forEach((trail) => {
      trail.el.classList.toggle('paw-trail--static', estatico);
      // No modo estático a trilha inteira fica carimbada de uma vez.
      if (estatico) trail.stamped = stampTrail(trail.paws, trail.stamped, trail.paws.length);
    });
    if (!estatico) update();
  }

  function update() {
    ticking = false;
    if (mode !== 'animated') return;
    const viewportHeight = window.innerHeight;

    for (const trail of trails) {
      const seamY = trail.section.getBoundingClientRect().top;

      // Ignora trilhas claramente fora da tela (nem começou, ou já passou).
      if (seamY > viewportHeight * 1.3 || seamY < -viewportHeight * 0.6) {
        // Garante o estado final correto ao pular trechos (âncoras, teclado).
        const alvo = seamY < 0 ? trail.paws.length : 0;
        if (trail.stamped !== alvo) trail.stamped = stampTrail(trail.paws, trail.stamped, alvo);
        continue;
      }

      const p = seamProgress(seamY, viewportHeight);
      const alvo = Math.round(p * trail.paws.length);
      // Só toca no DOM quando a quantidade carimbada realmente muda.
      if (alvo !== trail.stamped) trail.stamped = stampTrail(trail.paws, trail.stamped, alvo);
    }
  }

  function onScroll() {
    if (ticking || mode !== 'animated') return;
    ticking = true;
    // Sem rAF (ambientes muito restritos), atualiza direto — ainda barato,
    // pois só alterna classes.
    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(update);
    } else {
      update();
    }
  }

  let resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  }

  build();
  // Mesmo no modo estático o scroll é ouvido: se o usuário desligar
  // "reduzir movimento" durante a visita, a animação volta sem recarregar.
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });

  // Acompanha mudanças de preferência durante a visita, nos dois sentidos.
  onMediaChange('(prefers-reduced-motion: reduce)', () => {
    const novo = resolvePawMode();
    if (novo === mode) return;
    mode = novo;
    applyMode();
  });
}
