/**
 * GOOGLE MAPS — implementação leve, sem API Key e sem custo.
 *
 * Usamos o embed público do Google Maps buscando pelo ENDEREÇO (não por
 * coordenadas inventadas). O iframe só é carregado quando o usuário clica:
 * isso evita ~500 KB de requisições de terceiros no carregamento inicial e
 * mantém o LCP baixo — além de não plantar cookies antes de uma ação
 * consciente do visitante.
 *
 * O botão "Como chegar" abre a rota diretamente no Google Maps.
 */

import { SITE } from '../config/site.config.js';
import { trackEvent } from './analytics.js';

/** URL do mapa incorporado (busca por endereço). */
function embedUrl() {
  return `https://www.google.com/maps?q=${encodeURIComponent(SITE.address.full)}&z=16&output=embed`;
}

/** URL de rota até o endereço, aberta no app ou site do Google Maps. */
export function directionsUrl() {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    SITE.address.full
  )}`;
}

export function initMap() {
  // Botões "Como chegar" — o href é montado a partir da configuração central.
  document.querySelectorAll('[data-directions]').forEach((el) => {
    el.setAttribute('href', directionsUrl());
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
  });

  const container = document.querySelector('[data-map]');
  if (!container) return;

  const facade = container.querySelector('[data-map-facade]');
  if (!facade) return;

  facade.addEventListener(
    'click',
    () => {
      const iframe = document.createElement('iframe');
      iframe.src = embedUrl();
      iframe.title = `Mapa com a localização da ${SITE.businessName}`;
      iframe.loading = 'lazy';
      // Restringe o que o conteúdo de terceiros pode fazer.
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.allow = 'fullscreen';

      container.appendChild(iframe);
      facade.remove();
      trackEvent('mapa_carregar');
    },
    { once: true }
  );
}
