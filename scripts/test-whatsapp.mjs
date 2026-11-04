/**
 * Teste da montagem de links de WhatsApp (sem DOM).
 * Executar com: node scripts/test-whatsapp.mjs
 */
import { buildWhatsAppUrl, sanitizeMessage } from '../src/js/modules/whatsapp.js';
import { SITE } from '../src/js/config/site.config.js';

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

const url = buildWhatsAppUrl(SITE.messages.default);
check('usa o numero configurado', url.startsWith('https://wa.me/5547996086955?text='));
check(
  'mensagem chega intacta apos decodificar',
  decodeURIComponent(url.split('text=')[1]) === SITE.messages.default
);

// Caracteres especiais precisam ser escapados, e nao interpretados como URL.
const comEspeciais = buildWhatsAppUrl('Curso "A&B" 100% <novo> ?x=1#y');
check('escapa &, ?, # e demais caracteres reservados', !/[&?#<>"]/.test(comEspeciais.split('text=')[1]));
check(
  'texto especial volta identico',
  decodeURIComponent(comEspeciais.split('text=')[1]) === 'Curso "A&B" 100% <novo> ?x=1#y'
);

// Sanitizacao.
check('remove caracteres de controle', sanitizeMessage('a\u0000b\u0007c') === 'abc');
check('preserva quebras de linha', sanitizeMessage('linha 1\nlinha 2') === 'linha 1\nlinha 2');
check('comprime espacos repetidos', sanitizeMessage('a     b') === 'a b');
check('limita o tamanho da mensagem', sanitizeMessage('x'.repeat(5000)).length === 1200);

// Mensagem de curso.
const curso = SITE.messages.course('Banho e Tosa');
check('mensagem de curso cita o curso e a escola', curso.includes('Banho e Tosa') && curso.includes(SITE.businessName));

// Endereco completo usado no Maps.
check(
  'endereco completo montado corretamente',
  SITE.address.full === 'Rua Elly Soares, 511, Bairro Floresta, Joinville - SC, Brasil',
  SITE.address.full
);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
