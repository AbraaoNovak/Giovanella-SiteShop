/**
 * TESTES EM NAVEGADORES REAIS
 *
 * Abre o build de produção (dist/) em cada navegador baseado em Chromium
 * instalado na máquina (Edge, Chrome, Brave) e verifica o comportamento em
 * cenários difíceis: menos movimento, aparelho fraco, alto contraste,
 * JavaScript bloqueado/desativado e celular.
 *
 * Uso:   npm run test:navegadores     (já roda o build antes)
 *
 * Os navegadores rodam em modo headless e com perfil temporário: nenhuma
 * janela abre e o perfil do usuário não é tocado. Firefox e Safari não falam
 * este protocolo (CDP) e não são cobertos aqui.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview } from 'vite';

const PORTA_SITE = 4319;
const SITE = `http://127.0.0.1:${PORTA_SITE}/`;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NAVEGADORES = [
  ['Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
  ['Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'],
  ['Brave', 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'],
  ['Chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['Chrome', '/usr/bin/google-chrome'],
].filter(([, exe]) => existsSync(exe));

/* ---------------------------------------------------------------------------
   Cenários: cada um prepara o navegador ANTES de a página carregar e declara
   o que se espera dela.
   --------------------------------------------------------------------------- */
const CELULAR = { width: 390, height: 844, deviceScaleFactor: 2, mobile: true };
const CENARIOS = {
  normal: {
    preparar: async () => {},
    carregarMapa: true,
    espera: { js: true, patinhas: 'animadas', cursosExpandem: true, menu: true, whatsapp: true },
  },
  reduzirMovimento: {
    preparar: (cdp) => cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }),
    espera: { js: true, patinhas: 'estaticas', cursosExpandem: true, menu: true, whatsapp: true, carrosselParado: true },
  },
  aparelhoFraco: {
    preparar: (cdp) => cdp('Emulation.setHardwareConcurrencyOverride', { hardwareConcurrency: 2 }),
    espera: { js: true, patinhas: 'estaticas', cursosExpandem: true, menu: true, whatsapp: true },
  },
  altoContraste: {
    preparar: (cdp) => cdp('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] }),
    espera: { js: true, patinhas: 'ocultas', cursosExpandem: true, menu: true, whatsapp: true },
  },
  scriptBloqueado: {
    preparar: async (cdp) => { await cdp('Network.enable'); return cdp('Network.setBlockedURLs', { urls: ['*/assets/*.js'] }); },
    espera: { js: false, patinhas: 'nenhuma', todosCursosVisiveis: true },
  },
  semJavaScript: {
    preparar: (cdp) => cdp('Emulation.setScriptExecutionDisabled', { value: true }),
    espera: { js: false, patinhas: 'nenhuma', todosCursosVisiveis: true },
  },
  celular: {
    preparar: async (cdp) => {
      await cdp('Emulation.setDeviceMetricsOverride', CELULAR);
      // Toque real (touchstart/touchend), não clique de mouse.
      return cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    },
    toque: true,
    espera: { js: true, patinhas: 'animadas', cursosExpandem: true, menu: true, whatsapp: true, hamburger: true },
  },
  celularSemJs: {
    preparar: async (cdp) => {
      await cdp('Emulation.setDeviceMetricsOverride', CELULAR);
      return cdp('Emulation.setScriptExecutionDisabled', { value: true });
    },
    espera: { js: false, patinhas: 'nenhuma', todosCursosVisiveis: true, hamburger: false },
  },
};

/* ---------------------------------------------------------------------------
   Protocolo CDP mínimo
   --------------------------------------------------------------------------- */
function conectar(wsUrl) {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let seq = 0;
    const pendentes = new Map();
    const erros = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
      if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0]);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
        erros.push(m.params.args.map((a) => a.value ?? a.description).join(' ').split('\n')[0]);
    });
    const cdp = (method, params = {}) =>
      new Promise((r) => { const id = ++seq; pendentes.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    const avaliar = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;
    ws.addEventListener('open', () => resolve({ ws, cdp, avaliar, erros }), { once: true });
  });
}

/** Leitura síncrona do estado da página (funciona mesmo sem JS da página). */
const ESTADO = `(() => {
  const root = document.documentElement;
  const visivel = (el) => !!el && el.offsetParent !== null;
  const trilhas = [...document.querySelectorAll('.paw-trail')];
  const botao = document.querySelector('[data-courses-toggle]');
  return {
    js: root.classList.contains('js'),
    jsReady: root.classList.contains('js-ready'),
    trilhas: trilhas.length,
    trilhasVisiveis: trilhas.filter((t) => getComputedStyle(t).display !== 'none').length,
    trilhasEstaticas: document.querySelectorAll('.paw-trail--static').length,
    totalCursos: document.querySelectorAll('.course-card').length,
    cursosVisiveis: [...document.querySelectorAll('.course-card')].filter(visivel).length,
    botaoCursos: visivel(botao),
    conteudoOculto: [...document.querySelectorAll('[data-reveal]')]
      .filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0; })
      .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.5).length,
    overflow: root.scrollWidth > root.clientWidth,
    hamburger: visivel(document.querySelector('.hamburger')),
    imagensQuebradas: [...document.images].filter((i) => visivel(i) && i.complete && i.naturalWidth === 0).length,
  };
})()`;

async function rodarCenario(porta, { preparar, toque = false, carregarMapa = false }) {
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })).json();
  const { ws, cdp, avaliar, erros } = await conectar(alvo.webSocketDebuggerUrl);
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  // Registra bloqueios da CSP antes de qualquer script da página rodar.
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: "window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' -> ' + (e.blockedURI || 'inline')));",
  });
  await preparar(cdp);
  await cdp('Page.navigate', { url: SITE });
  await dormir(3500); // inicialização + requestIdleCallback das patinhas

  const r = await avaliar(ESTADO);

  // Rola até a primeira divisa entre seções: as patinhas devem ser carimbadas.
  await avaliar(`(() => { const s = document.querySelector('#sobre'); if (s) scrollTo(0, s.offsetTop - innerHeight * 0.4); })()`);
  await dormir(1500);
  r.carimbo = await avaliar(`(() => { const t = document.querySelector('.paw-trail'); return t ? [t.querySelectorAll('.is-stamped').length, t.querySelectorAll('.paw').length] : null; })()`);

  if (r.botaoCursos) {
    await avaliar(`document.querySelector('[data-courses-toggle]').click()`);
    await dormir(300);
    r.cursosAposVerMais = await avaliar(`[...document.querySelectorAll('.course-card')].filter((c) => c.offsetParent !== null).length`);
  }

  r.menu = await avaliar(`(() => {
    const t = document.querySelector('[data-menu-toggle]'); if (!t) return false;
    t.click(); const abriu = t.getAttribute('aria-expanded') === 'true';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return abriu && t.getAttribute('aria-expanded') === 'false';
  })()`);

  r.whatsapp = await avaliar(`(() => { const a = document.querySelector('[data-wa="course"]'); return !!a && a.href.includes('text='); })()`);

  // Carrossel de depoimentos: rola até ele (fora da tela ele pausa de
  // propósito) e mede se o trilho se desloca, antes e depois de pausar.
  const posicao = `(() => { const t = document.querySelector('[data-marquee-track]'); return t ? new DOMMatrix(getComputedStyle(t).transform).m41 : null; })()`;
  await avaliar(`document.querySelector('[data-marquee]')?.scrollIntoView({ block: 'center' })`);
  await dormir(600);
  r.carrossel = await avaliar(`(() => {
    const m = document.querySelector('[data-marquee]');
    return {
      rodando: !!m && m.classList.contains('is-running'),
      originais: m ? m.querySelectorAll('.testimonial:not([aria-hidden])').length : 0,
      copias: m ? m.querySelectorAll('.testimonial[aria-hidden="true"]').length : 0,
    };
  })()`);
  const x1 = await avaliar(posicao);
  await dormir(1200);
  const x2 = await avaliar(posicao);
  r.carrossel.moveu = x1 !== null && x2 !== null && Math.abs(x2 - x1) > 5;

  // Pausa SEM botão (decisão do cliente): no celular, um toque real na tela;
  // no desktop, o foco que o teclado (Tab) daria ao carrossel.
  if (r.carrossel.rodando) {
    if (toque) {
      const centro = await avaliar(`(() => { const b = document.querySelector('[data-marquee]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
      await cdp('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [centro] });
      await cdp('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
      await avaliar(`document.querySelector('[data-marquee]').focus()`);
    }
    await dormir(300);
    r.carrossel.focado = await avaliar(`document.activeElement === document.querySelector('[data-marquee]')`);
    const p1 = await avaliar(posicao);
    await dormir(1000);
    const p2 = await avaliar(posicao);
    r.carrossel.pausou = Math.abs(p2 - p1) < 1;
  }
  // Mapa do Google: o recurso externo mais sensível à CSP (frame-src).
  if (carregarMapa) {
    await avaliar("document.querySelector('[data-map-facade]')?.click()");
    await dormir(2500);
    r.mapa = await avaliar("!!document.querySelector('[data-map] iframe')");
  }

  r.bloqueiosCsp = (await avaliar('window.__csp')) || [];
  r.erros = erros.filter(Boolean);

  ws.close();
  await fetch(`http://127.0.0.1:${porta}/json/close/${alvo.id}`).catch(() => {});
  return r;
}

/** Compara o resultado com o esperado; devolve a lista de falhas. */
function verificar(r, e) {
  const f = [];
  const exigir = (cond, msg) => { if (!cond) f.push(msg); };

  exigir(r.js === e.js, `classe .js deveria estar ${e.js ? 'ativa' : 'ausente'}`);
  if (e.js) exigir(r.jsReady, 'inicialização não terminou (.js-ready ausente)');
  exigir(!r.overflow, 'rolagem horizontal');
  exigir(r.imagensQuebradas === 0, `${r.imagensQuebradas} imagem(ns) quebrada(s)`);
  exigir(r.conteudoOculto === 0, `${r.conteudoOculto} bloco(s) de conteúdo invisível(is) na tela`);
  exigir(r.erros.length === 0, `erros no console: ${r.erros.join(' | ')}`);
  exigir(r.bloqueiosCsp.length === 0, `a CSP bloqueou: ${r.bloqueiosCsp.join(' | ')}`);
  if ('mapa' in r) exigir(r.mapa, 'o mapa do Google não carregou');

  if (e.patinhas === 'animadas') {
    exigir(r.trilhasVisiveis > 0 && r.trilhasEstaticas === 0, 'patinhas deveriam estar animadas');
    exigir(r.carimbo && r.carimbo[0] > 0, 'nenhuma pegada carimbada ao rolar');
  }
  if (e.patinhas === 'estaticas') {
    exigir(r.trilhas > 0 && r.trilhasEstaticas === r.trilhas, 'patinhas deveriam estar estáticas (e visíveis)');
    exigir(r.carimbo && r.carimbo[0] === r.carimbo[1], 'no modo estático todas as pegadas ficam visíveis');
  }
  if (e.patinhas === 'ocultas') exigir(r.trilhasVisiveis === 0, 'patinhas deveriam ficar ocultas em alto contraste');
  if (e.patinhas === 'nenhuma') exigir(r.trilhas === 0, 'sem JS não deveria haver trilhas');

  if (e.cursosExpandem) {
    exigir(r.botaoCursos, 'botão "Ver mais cursos" ausente');
    exigir(r.cursosVisiveis === 4, `deveriam aparecer 4 cursos, apareceram ${r.cursosVisiveis}`);
    exigir(r.cursosAposVerMais === r.totalCursos, `"Ver mais" deveria mostrar ${r.totalCursos}, mostrou ${r.cursosAposVerMais}`);
  }
  if (e.todosCursosVisiveis) {
    exigir(r.cursosVisiveis === r.totalCursos, `sem JS, todos os ${r.totalCursos} cursos devem aparecer (apareceram ${r.cursosVisiveis})`);
    exigir(!r.botaoCursos, 'sem JS, o botão "Ver mais" não deve aparecer');
  }
  // Carrossel: em movimento sempre que há JS e não há pedido de menos movimento.
  const c = r.carrossel || {};
  exigir(c.originais === 5, `carrossel deveria ter 5 depoimentos originais, tem ${c.originais}`);
  if (e.js && !e.carrosselParado) {
    exigir(c.rodando && c.moveu, 'carrossel de depoimentos não está se movendo');
    exigir(c.copias === 5, `loop sem emenda precisa de 5 cópias, há ${c.copias}`);
    exigir(c.focado, 'o carrossel não recebeu foco (toque/teclado) — sem isso não há como pausar');
    exigir(c.pausou, 'o carrossel não pausou com toque/foco');
  } else {
    exigir(!c.rodando && !c.moveu, 'carrossel deveria estar parado');
    exigir(c.copias === 0, 'carrossel parado não deveria ter cópias');
  }

  if (e.menu) exigir(r.menu, 'menu mobile não abre/fecha com ESC');
  if (e.whatsapp) exigir(r.whatsapp, 'link de WhatsApp sem mensagem pré-preenchida');
  if ('hamburger' in e) exigir(r.hamburger === e.hamburger, `hamburger deveria estar ${e.hamburger ? 'visível' : 'oculto'}`);
  return f;
}

/* ---------------------------------------------------------------------------
   Execução
   --------------------------------------------------------------------------- */
if (!NAVEGADORES.length) {
  console.log('Nenhum navegador Chromium encontrado (Edge, Chrome ou Brave). Nada a testar.');
  process.exit(0);
}

// Serve o build com os MESMOS cabeçalhos da produção (vercel.json), incluindo
// a CSP: um bloqueio indevido quebraria o site em silêncio.
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const cabecalhos = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)' && !h.has).headers.map((h) => [h.key, h.value])
);
// Sem HTTPS no teste local, upgrade-insecure-requests e HSTS não se aplicam.
cabecalhos['Content-Security-Policy'] = cabecalhos['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
delete cabecalhos['Strict-Transport-Security'];
const servidor = await preview({
  preview: { port: PORTA_SITE, strictPort: true, host: '127.0.0.1', open: false, headers: cabecalhos },
  logLevel: 'silent',
});
let totalFalhas = 0;
let porta = 9520;

try {
  for (const [nome, exe] of NAVEGADORES) {
    const perfil = mkdtempSync(join(tmpdir(), 'giovanella-teste-'));
    const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`,
      '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });

    let versao = '?';
    for (let i = 0; i < 60; i++) {
      try { versao = (await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json()).Browser; break; }
      catch { await dormir(250); }
    }
    console.log(`\n${nome} (${versao})`);

    for (const [cenario, def] of Object.entries(CENARIOS)) {
      let falhas;
      try {
        falhas = verificar(await rodarCenario(porta, def), def.espera);
      } catch (erro) {
        falhas = [`o teste não rodou: ${erro.message}`];
      }
      totalFalhas += falhas.length;
      console.log(`  ${falhas.length ? 'FALHA' : 'PASS '}  ${cenario}${falhas.length ? '\n         - ' + falhas.join('\n         - ') : ''}`);
    }

    proc.kill();
    await dormir(800);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o navegador pode ainda segurar arquivos */ }
    porta += 1;
  }
} finally {
  await servidor.close();
}

console.log(totalFalhas === 0 ? '\nTodos os cenários passaram.' : `\n${totalFalhas} verificação(ões) falharam.`);
process.exit(totalFalhas === 0 ? 0 : 1);
