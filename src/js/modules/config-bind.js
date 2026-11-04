/**
 * Sincroniza o HTML com a configuração central.
 *
 * O HTML já contém os valores corretos escritos por extenso (importante para
 * SEO e para o site funcionar sem JavaScript). Este módulo apenas garante que,
 * ao alterar `site.config.js`, todo o site acompanhe — sem precisar caçar
 * ocorrências espalhadas pelo markup.
 *
 * Uso no HTML:  <span data-config="contact.phoneDisplay">(47) 99608-6955</span>
 */

import { SITE } from '../config/site.config.js';

/**
 * Resolve um caminho com pontos dentro do objeto de configuração.
 * @param {string} path
 * @returns {unknown}
 */
function resolve(path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), SITE);
}

export function initConfigBindings(root = document) {
  root.querySelectorAll('[data-config]').forEach((el) => {
    const value = resolve(el.getAttribute('data-config'));
    // `textContent` (nunca innerHTML) — a configuração é tratada como texto.
    if (typeof value === 'string' && value && el.textContent.trim() !== value) {
      el.textContent = value;
    }
  });
}
