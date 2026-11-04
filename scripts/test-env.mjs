/**
 * Testes da detecção de ambiente e do modo das patinhas (sem DOM).
 * Simula diferentes navegadores trocando `window` e `navigator` globais.
 * Executar com: node scripts/test-env.mjs
 */
import { isLowPowerDevice, onMediaChange, prefersReducedMotion } from '../src/js/modules/env.js';
import { resolvePawMode } from '../src/js/modules/paws.js';

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

/**
 * Monta um "navegador" falso.
 * @param {object} opts
 * @param {boolean} [opts.reduzirMovimento]
 * @param {object}  [opts.nav]         Propriedades de `navigator`.
 * @param {boolean} [opts.apiAntiga]   Simula Safari < 14 (só addListener).
 */
function simular({ reduzirMovimento = false, nav = {}, apiAntiga = false } = {}) {
  const registrados = { novo: 0, antigo: 0 };
  const mql = {
    matches: reduzirMovimento,
    addListener: () => { registrados.antigo += 1; },
    removeListener: () => { registrados.antigo -= 1; },
  };
  if (!apiAntiga) {
    mql.addEventListener = () => { registrados.novo += 1; };
    mql.removeEventListener = () => { registrados.novo -= 1; };
  }
  Object.defineProperty(globalThis, 'window', {
    value: { matchMedia: () => mql },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'navigator', {
    value: { hardwareConcurrency: 8, deviceMemory: 8, ...nav },
    configurable: true,
    writable: true,
  });
  return registrados;
}

// ---------------------------------------------------------------------------
// 1. Heurística de aparelho fraco — conservadora
// ---------------------------------------------------------------------------
simular({ nav: { hardwareConcurrency: 4, deviceMemory: 4 } });
check(
  'notebook comum (4 nucleos / 4 GB) NAO e considerado fraco',
  isLowPowerDevice() === false,
  'a versao antiga desligava o efeito aqui'
);

simular({ nav: { hardwareConcurrency: 2 } });
check('2 nucleos e considerado fraco', isLowPowerDevice() === true);

simular({ nav: { deviceMemory: 2 } });
check('2 GB de memoria e considerado fraco', isLowPowerDevice() === true);

simular({ nav: { connection: { saveData: true } } });
check('economia de dados ativada e respeitada', isLowPowerDevice() === true);

simular({ nav: { connection: { effectiveType: 'slow-2g' } } });
check('conexao 2G e respeitada', isLowPowerDevice() === true);

simular({ nav: { connection: { effectiveType: '4g' } } });
check('conexao 4G nao dispara modo fraco', isLowPowerDevice() === false);

// Firefox e Safari não expõem deviceMemory nem connection.
simular({ nav: { hardwareConcurrency: 8, deviceMemory: undefined, connection: undefined } });
check('Firefox/Safari (sem deviceMemory e connection) funcionam', isLowPowerDevice() === false);

// ---------------------------------------------------------------------------
// 2. Modo das patinhas — nunca "sumir", apenas parar de se mover
// ---------------------------------------------------------------------------
simular();
check('navegador comum: patinhas animadas', resolvePawMode() === 'animated');

simular({ reduzirMovimento: true });
check(
  'reduzir movimento: patinhas ESTATICAS (visiveis)',
  resolvePawMode() === 'static' && prefersReducedMotion() === true,
  'antes elas desapareciam — causa provavel do problema no Edge'
);

simular({ nav: { hardwareConcurrency: 2 } });
check('aparelho fraco: patinhas estaticas (visiveis)', resolvePawMode() === 'static');

// ---------------------------------------------------------------------------
// 3. Listener de media query compatível com navegadores antigos
// ---------------------------------------------------------------------------
let reg = simular();
let remover = onMediaChange('(min-width: 1024px)', () => {});
check('API moderna usa addEventListener', reg.novo === 1 && reg.antigo === 0);
remover();
check('remocao na API moderna', reg.novo === 0);

reg = simular({ apiAntiga: true });
let lancou = false;
try {
  remover = onMediaChange('(min-width: 1024px)', () => {});
} catch {
  lancou = true;
}
check(
  'Safari < 14 (so addListener) NAO lanca erro',
  !lancou && reg.antigo === 1,
  'chamar addEventListener direto quebraria a inicializacao'
);
remover();
check('remocao na API antiga', reg.antigo === 0);

console.log(falhas === 0 ? '\nTodos os testes passaram.' : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
