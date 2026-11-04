/**
 * Banner de consentimento (LGPD).
 *
 * Só aparece quando existe algo que realmente exige consentimento — hoje,
 * apenas o Google Analytics. Sem GA configurado, o site não usa cookies de
 * terceiros e o banner não é exibido (transparência real, não "teatro").
 */

import { SITE, CONSENT_STORAGE_KEY } from '../config/site.config.js';
import { loadAnalytics } from './analytics.js';

/**
 * Lê a decisão salva.
 * @returns {'granted'|'denied'|null}
 */
function readConsent() {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    // localStorage pode estar bloqueado (modo privado / cookies desativados).
    return null;
  }
}

/** @param {'granted'|'denied'} value */
function saveConsent(value) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, value);
  } catch {
    /* Persistência é opcional: sem ela o banner reaparece na próxima visita. */
  }
}

export function initConsent() {
  const banner = document.querySelector('[data-consent]');
  if (!banner) return;

  const needsConsent = Boolean(SITE.integrations.gaMeasurementId);
  const decision = readConsent();

  // Sem analytics configurado: nada a consentir.
  if (!needsConsent) {
    banner.remove();
    return;
  }

  if (decision === 'granted') {
    loadAnalytics();
    banner.remove();
    return;
  }

  if (decision === 'denied') {
    banner.remove();
    return;
  }

  banner.hidden = false;
  // Um frame de atraso garante que a transição de entrada seja percebida.
  requestAnimationFrame(() => banner.classList.add('is-visible'));

  /** @param {'granted'|'denied'} value */
  const decide = (value) => {
    saveConsent(value);
    if (value === 'granted') loadAnalytics();
    banner.classList.remove('is-visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  };

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => decide('granted'));
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => decide('denied'));
}
