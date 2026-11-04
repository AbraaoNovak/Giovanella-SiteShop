/**
 * Ponto de entrada do site.
 *
 * O bundle é pequeno e carregado com `type="module"` (defer implícito), então
 * não bloqueia a renderização. Cada módulo é independente e sai silenciosamente
 * caso o elemento correspondente não exista na página — o mesmo bundle serve
 * tanto a home quanto a página de privacidade.
 */

import '../css/main.css';

import { initConfigBindings } from './modules/config-bind.js';
import { initWhatsAppLinks, initPhoneLinks } from './modules/whatsapp.js';
import { initHeader } from './modules/header.js';
import { initMobileMenu } from './modules/mobile-menu.js';
import { initReveal } from './modules/reveal.js';
import { initPaws } from './modules/paws.js';
import { initCourses } from './modules/courses.js';
import { initMarquee } from './modules/marquee.js';
import { initContactForm } from './modules/form.js';
import { initMap } from './modules/map.js';
import { initConsent } from './modules/consent.js';
import { initAnalyticsTracking } from './modules/analytics.js';

const root = document.documentElement;

/**
 * Classe `.js`: os estados iniciais (cursos recolhidos, animações de entrada)
 * dependem dela. O HTML já a aplica num script inline no `<head>`, antes da
 * primeira pintura; esta linha é só a rede de segurança se aquele script for
 * removido.
 *
 * Exceção: se o temporizador do `<head>` já desistiu (`data-js-timeout`), a
 * página voltou ao modo "sem JS", com todo o conteúdo visível. Reaplicar a
 * classe agora esconderia de novo o que o usuário já está lendo.
 */
if (!root.hasAttribute('data-js-timeout')) {
  root.classList.add('js');
}

/**
 * Executa a inicialização de um módulo isoladamente.
 *
 * Um erro em um módulo (API ausente num navegador antigo, extensão que altera
 * o DOM, etc.) NÃO pode derrubar os demais: o menu, os links de WhatsApp e o
 * formulário precisam continuar funcionando mesmo se o mapa ou as patinhas
 * falharem. O erro vai para o console para facilitar o diagnóstico.
 *
 * @param {string} nome
 * @param {() => void} init
 */
function safely(nome, init) {
  try {
    init();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Giovanella] Falha ao inicializar "${nome}":`, error);
  }
}

function boot() {
  // --- Conteúdo e links (críticos, sempre primeiro) ---
  safely('ano do rodapé', () => {
    // Evita que o copyright envelheça sozinho.
    const year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = year;
    });
  });

  safely('configuração', initConfigBindings);
  safely('links de WhatsApp', initWhatsAppLinks);
  safely('links de telefone', initPhoneLinks);

  // --- Navegação ---
  safely('header', initHeader);
  safely('menu mobile', initMobileMenu);

  // --- Interações de conteúdo ---
  safely('cursos', initCourses);
  safely('depoimentos', initMarquee);
  safely('formulário', initContactForm);
  safely('mapa', initMap);

  // --- Privacidade e medição ---
  safely('consentimento', initConsent);
  safely('analytics', initAnalyticsTracking);

  // --- Efeitos visuais (não essenciais) ---
  safely('scroll reveal', initReveal);

  // As patinhas são puramente decorativas: entram por último, quando o
  // navegador estiver ocioso, para não competir com o LCP.
  // `requestIdleCallback` não existe no Safari — daí o fallback.
  const startPaws = () => safely('patinhas', initPaws);
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(startPaws, { timeout: 2000 });
  } else {
    window.setTimeout(startPaws, 700);
  }

  // Sinaliza ao temporizador do <head> que a inicialização terminou.
  root.classList.add('js-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
