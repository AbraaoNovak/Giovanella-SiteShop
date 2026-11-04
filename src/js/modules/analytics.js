/**
 * Google Analytics 4 — carregamento condicional e rastreamento de eventos.
 *
 * Regras adotadas:
 * - O GA só é carregado se houver um Measurement ID configurado E consentimento.
 * - Sem configuração, `trackEvent` vira um no-op: o site funciona normalmente.
 * - NUNCA são enviados dados pessoais (nome, telefone, mensagem) ao analytics.
 */

import { SITE } from '../config/site.config.js';

let loaded = false;

/**
 * Injeta o gtag.js. Chamado apenas após consentimento explícito.
 * @returns {void}
 */
export function loadAnalytics() {
  const id = SITE.integrations.gaMeasurementId;
  if (loaded || !id) return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // A assinatura do gtag exige `arguments`, por isso não é arrow function.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', id, {
    // Reduz a granularidade do IP e evita sinais de anúncios (LGPD).
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

/**
 * Registra um evento no GA4, se disponível.
 * @param {string} name  Nome do evento (snake_case).
 * @param {Record<string, string|number>} [params]  Apenas dados não pessoais.
 */
export function trackEvent(name, params = {}) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}

/**
 * Liga o rastreamento declarativo: qualquer elemento com `data-track="evento"`
 * dispara `trackEvent` ao ser clicado. Parâmetros extras vêm de
 * `data-track-label` — que deve conter apenas rótulos genéricos, nunca PII.
 */
export function initAnalyticsTracking() {
  document.addEventListener(
    'click',
    (event) => {
      const el = event.target instanceof Element ? event.target.closest('[data-track]') : null;
      if (!el) return;
      const label = el.getAttribute('data-track-label');
      trackEvent(el.getAttribute('data-track'), label ? { label } : {});
    },
    { passive: true }
  );
}
