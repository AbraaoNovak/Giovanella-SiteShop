/**
 * FORMULÁRIO DE INTERESSE
 *
 * IMPORTANTE: este formulário NÃO envia e-mail e NÃO envia dados para nenhum
 * servidor. Ele existe apenas para montar uma mensagem bem estruturada e abrir
 * a conversa no WhatsApp. Nada é armazenado pelo site.
 *
 * Proteções implementadas (todas honestas para um front-end sem backend):
 * - validação e limites de tamanho por campo;
 * - sanitização do texto antes de montar a mensagem;
 * - honeypot para bots simples;
 * - trava contra múltiplos cliques + debounce de reenvio;
 * - estado de processamento visível e anunciado por leitores de tela.
 *
 * Não há (nem é possível ter) bloqueio por IP ou rate limiting real sem
 * backend — e por isso não afirmamos que exista.
 */

import { buildWhatsAppUrl, sanitizeMessage } from './whatsapp.js';
import { trackEvent } from './analytics.js';

/** Intervalo mínimo entre dois envios, em ms. */
const SUBMIT_COOLDOWN = 2500;

/** Regras de validação por campo. */
const RULES = {
  nome: {
    required: true,
    min: 2,
    max: 80,
    message: 'Informe seu nome (mínimo 2 caracteres).',
  },
  telefone: {
    required: true,
    max: 20,
    /** Aceita DDD + número, com ou sem máscara. */
    test: (value) => /^\d{10,13}$/.test(value.replace(/\D/g, '')),
    message: 'Informe um telefone válido com DDD. Ex.: (47) 99999-9999',
  },
  assunto: {
    required: true,
    message: 'Selecione o assunto de interesse.',
  },
  mensagem: {
    required: false,
    max: 600,
    message: 'A mensagem deve ter no máximo 600 caracteres.',
  },
};

/**
 * Valida um campo e atualiza sua mensagem de erro acessível.
 * @param {HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement} field
 * @returns {boolean}
 */
function validateField(field) {
  const rule = RULES[field.name];
  if (!rule) return true;

  const value = field.value.trim();
  const errorEl = document.getElementById(`${field.id}-error`);
  let error = '';

  if (rule.required && !value) {
    error = rule.message;
  } else if (value && rule.min && value.length < rule.min) {
    error = rule.message;
  } else if (value && rule.max && value.length > rule.max) {
    error = rule.message;
  } else if (value && rule.test && !rule.test(value)) {
    error = rule.message;
  }

  field.setAttribute('aria-invalid', error ? 'true' : 'false');
  if (errorEl) errorEl.textContent = error;
  return !error;
}

/**
 * Monta a mensagem final enviada ao WhatsApp.
 * @param {Record<string, string>} data
 * @returns {string}
 */
function buildMessage(data) {
  const lines = [
    `Olá! Meu nome é ${data.nome}.`,
    `Meu telefone é ${data.telefone}.`,
    `Tenho interesse em ${data.assunto}.`,
  ];
  if (data.mensagem) {
    lines.push('', 'Mensagem:', data.mensagem);
  }
  return sanitizeMessage(lines.join('\n'));
}

export function initContactForm() {
  const form = document.querySelector('[data-interest-form]');
  if (!form) return;

  const submitButton = form.querySelector('[data-form-submit]');
  const status = form.querySelector('[data-form-status]');
  const honeypot = form.querySelector('[data-honeypot]');
  const fields = Array.from(form.querySelectorAll('[name]')).filter((el) => RULES[el.name]);

  let lastSubmit = 0;
  let busy = false;

  // Contador de caracteres da mensagem.
  const messageField = form.querySelector('#form-mensagem');
  const counter = form.querySelector('[data-form-counter]');
  if (messageField && counter) {
    const updateCounter = () => {
      counter.textContent = `${messageField.value.length}/${RULES.mensagem.max}`;
    };
    messageField.addEventListener('input', updateCounter);
    updateCounter();
  }

  // Valida ao sair do campo; ao digitar, apenas limpa erros já corrigidos.
  fields.forEach((field) => {
    field.addEventListener('blur', () => validateField(field));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Honeypot preenchido = bot. Falha silenciosamente.
    if (honeypot && honeypot.value.trim() !== '') return;

    // Trava contra múltiplos cliques / reenvio em sequência.
    const now = Date.now();
    if (busy || now - lastSubmit < SUBMIT_COOLDOWN) return;

    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      if (status) status.textContent = 'Confira os campos destacados antes de continuar.';
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    const data = Object.fromEntries(fields.map((field) => [field.name, field.value.trim()]));

    busy = true;
    lastSubmit = now;
    if (submitButton) {
      submitButton.setAttribute('aria-disabled', 'true');
      submitButton.dataset.originalLabel = submitButton.textContent;
      submitButton.textContent = 'Abrindo o WhatsApp...';
    }
    if (status) status.textContent = 'Abrindo o WhatsApp com sua mensagem...';

    // A abertura precisa ocorrer no mesmo gesto do usuário para não ser
    // bloqueada pelo navegador.
    const url = buildWhatsAppUrl(buildMessage(data));
    window.open(url, '_blank', 'noopener,noreferrer');

    // Apenas o assunto (valor de uma lista fixa) vai para o analytics.
    // Nome, telefone e mensagem NUNCA são enviados.
    trackEvent('formulario_whatsapp', { label: data.assunto });

    window.setTimeout(() => {
      busy = false;
      if (submitButton) {
        submitButton.removeAttribute('aria-disabled');
        submitButton.textContent = submitButton.dataset.originalLabel || 'Continuar pelo WhatsApp';
      }
      if (status) {
        status.textContent =
          'Se a janela do WhatsApp não abrir, verifique o bloqueador de pop-ups do navegador.';
      }
    }, SUBMIT_COOLDOWN);
  });
}
