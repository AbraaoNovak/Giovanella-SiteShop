/**
 * Detecção de ambiente e capacidade do dispositivo.
 * Centraliza as decisões de "ligar ou não" efeitos visuais e isola as
 * diferenças entre navegadores num único lugar.
 */

/** @returns {boolean} true se o usuário pediu menos movimento. */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Observa mudanças em uma media query de forma compatível com todos os
 * navegadores suportados.
 *
 * `MediaQueryList.addEventListener` só existe a partir do Safari 14; antes
 * disso a API era `addListener`. Chamar o método inexistente LANÇA um erro —
 * que, sem esta proteção, interromperia a inicialização do módulo inteiro.
 *
 * @param {string} query
 * @param {(event: MediaQueryListEvent) => void} callback
 * @returns {() => void} função que remove o listener.
 */
export function onMediaChange(query, callback) {
  const mql = window.matchMedia(query);

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', callback);
    return () => mql.removeEventListener('change', callback);
  }

  mql.addListener(callback);
  return () => mql.removeListener(callback);
}

/**
 * Heurística de desempenho — CONSERVADORA de propósito.
 *
 * Só aponta aparelhos realmente limitados. Uma versão anterior usava
 * "4 núcleos ou 4 GB", o que pegava notebooks comuns e celulares
 * intermediários (e o iOS pode reportar poucos núcleos por privacidade),
 * desligando efeitos em máquinas perfeitamente capazes.
 *
 * Observação: `deviceMemory` e `connection` não existem no Firefox nem no
 * Safari; nesses navegadores os testes correspondentes são simplesmente
 * ignorados.
 *
 * @returns {boolean}
 */
export function isLowPowerDevice() {
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  const connection = navigator.connection;

  if (typeof memory === 'number' && memory <= 2) return true;
  if (typeof cores === 'number' && cores <= 2) return true;
  // O usuário ativou "economia de dados" no navegador ou no sistema.
  if (connection && connection.saveData) return true;
  if (connection && connection.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) {
    return true;
  }

  return false;
}
