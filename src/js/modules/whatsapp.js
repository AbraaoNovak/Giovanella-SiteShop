/**
 * WhatsApp — construção de links e ligação dos CTAs.
 *
 * Todo link de WhatsApp do site passa por aqui, garantindo que:
 * - o número venha sempre da configuração central;
 * - a mensagem seja sempre codificada com encodeURIComponent;
 * - o texto seja sanitizado antes de entrar na URL.
 */

import { SITE } from '../config/site.config.js';

/** Limite defensivo para o tamanho da mensagem enviada na URL. */
const MAX_MESSAGE_LENGTH = 1200;

/**
 * Normaliza um texto livre antes de colocá-lo na URL.
 * Remove caracteres de controle e comprime espaços — o `encodeURIComponent`
 * cuida do escape; isto evita apenas conteúdo malformado ou gigante.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeMessage(text) {
  return String(text ?? '')
    // Remove caracteres de controle, preservando quebras de linha.
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Monta a URL do WhatsApp.
 * `wa.me` funciona em desktop, tablet e mobile (redireciona para app ou web).
 * @param {string} [message]
 * @returns {string}
 */
export function buildWhatsAppUrl(message = SITE.messages.default) {
  const text = sanitizeMessage(message);
  return `https://wa.me/${SITE.contact.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Preenche o href de todos os elementos marcados com `data-wa`.
 *
 * - `data-wa="default"`         → mensagem padrão
 * - `data-wa="course"` +
 *   `data-course="Nome"`        → mensagem de interesse no curso
 * - `data-wa` com texto livre    → usa o próprio conteúdo do atributo
 *
 * Fazer isso em JS mantém o número em um único lugar e evita HTML duplicado.
 */
export function initWhatsAppLinks(root = document) {
  root.querySelectorAll('[data-wa]').forEach((el) => {
    const mode = el.getAttribute('data-wa');
    let message;

    if (mode === 'course') {
      const courseName = el.getAttribute('data-course') || '';
      message = SITE.messages.course(courseName);
    } else if (mode && mode !== 'default') {
      message = mode;
    } else {
      message = SITE.messages.default;
    }

    el.setAttribute('href', buildWhatsAppUrl(message));
    el.setAttribute('target', '_blank');
    // noopener/noreferrer: obrigatório em links que abrem nova aba.
    el.setAttribute('rel', 'noopener noreferrer');
  });
}

/** Aplica `tel:` em todos os elementos marcados com `data-tel`. */
export function initPhoneLinks(root = document) {
  root.querySelectorAll('[data-tel]').forEach((el) => {
    el.setAttribute('href', `tel:${SITE.contact.phoneE164}`);
  });
}
