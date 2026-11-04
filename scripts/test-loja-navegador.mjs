/**
 * TESTES DA LOJA EM NAVEGADORES REAIS
 *
 * Gera um build SEPARADO (.teste-loja/) com o catálogo falso de
 * scripts/fixtures/produtos-exemplo.js e o abre em Edge/Chrome/Brave, com os
 * MESMOS cabeçalhos de produção (CSP incluída). Verifica filtros, links de
 * afiliado, produtos sem link, tentativa de XSS, menu no celular, modo sem
 * JavaScript, página de produto, destaques na home e sitemap.
 *
 * Ao terminar, refaz o build normal: dist/ e loja/ voltam ao catálogo real.
 *
 * Uso:   npm run test:loja
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, preview } from 'vite';

const RAIZ = new URL('..', import.meta.url);
const SAIDA = '.teste-loja';
const PORTA_SITE = 4321;
const SITE = `http://127.0.0.1:${PORTA_SITE}`;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NAVEGADORES = [
  ['Edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
  ['Chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'],
  ['Brave', 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'],
  ['Chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  ['Chrome', '/usr/bin/google-chrome'],
].filter(([, exe]) => existsSync(exe));

if (!NAVEGADORES.length) {
  console.log('Nenhum navegador Chromium encontrado (Edge, Chrome ou Brave). Nada a testar.');
  process.exit(0);
}

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`  ${ok ? 'PASS ' : 'FALHA'}  ${nome}${detalhe && !ok ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

/* ---------------------------------------------------------------------------
   Build de teste com o catálogo falso
   --------------------------------------------------------------------------- */
process.env.LOJA_PRODUTOS = 'scripts/fixtures/produtos-exemplo.js';
process.env.LOJA_HOJE = '2026-11-04';
await build({ logLevel: 'error', build: { outDir: SAIDA, emptyOutDir: true } });

const vercel = JSON.parse(readFileSync(new URL('vercel.json', RAIZ), 'utf8'));
const cabecalhos = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)' && !h.has).headers.map((h) => [h.key, h.value])
);
cabecalhos['Content-Security-Policy'] = cabecalhos['Content-Security-Policy'].replace(/;\s*upgrade-insecure-requests/, '');
delete cabecalhos['Strict-Transport-Security'];
const servidor = await preview({
  logLevel: 'silent',
  build: { outDir: SAIDA },
  preview: { port: PORTA_SITE, strictPort: true, host: '127.0.0.1', open: false, headers: cabecalhos },
});

/* ---------------------------------------------------------------------------
   CDP mínimo (mesmo modelo de test-navegadores.mjs)
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
    const avaliar = async (expr) => (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
    ws.addEventListener('open', () => resolve({ ws, cdp, avaliar, erros }), { once: true });
  });
}

async function abrir(porta, caminho, preparar = async () => {}) {
  const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })).json();
  const conexao = await conectar(alvo.webSocketDebuggerUrl);
  const { cdp } = conexao;
  await cdp('Runtime.enable');
  await cdp('Page.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', {
    source: "window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' -> ' + (e.blockedURI || 'inline')));",
  });
  await preparar(cdp);
  const ir = async (c) => { await cdp('Page.navigate', { url: `${SITE}${c}` }); await dormir(1800); };
  await ir(caminho);
  const fechar = async () => {
    conexao.ws.close();
    await fetch(`http://127.0.0.1:${porta}/json/close/${alvo.id}`).catch(() => {});
  };
  return { ...conexao, ir, fechar };
}

/** Problemas gerais que nenhuma página pode ter. */
async function saude(pagina, nome) {
  const r = await pagina.avaliar(`({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    quebradas: [...document.images].filter((i) => i.offsetParent !== null && i.complete && i.naturalWidth === 0).length,
    csp: window.__csp || [],
  })`);
  check(`${nome}: sem rolagem horizontal`, !r.overflow);
  check(`${nome}: sem imagens quebradas`, r.quebradas === 0, `${r.quebradas}`);
  check(`${nome}: CSP sem bloqueios`, r.csp.length === 0, r.csp.join(' | '));
  check(`${nome}: console sem erros`, pagina.erros.filter(Boolean).length === 0, pagina.erros.join(' | '));
}

const VISIVEIS = `[...document.querySelectorAll('[data-loja-produto]')].filter((c) => c.offsetParent !== null).length`;

/* ---------------------------------------------------------------------------
   Execução
   --------------------------------------------------------------------------- */
let porta = 9540;
try {
  // Sitemap do build de teste: só páginas com oferta real.
  const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
  console.log('\nSitemap');
  check('sitemap inclui /loja/ e os produtos compráveis',
    sitemap.includes('/loja/</loc>') && sitemap.includes('/loja/teste-maquina-de-tosa/') && sitemap.includes('/loja/teste-tesoura/'));
  check('sitemap exclui produtos sem oferta', !sitemap.includes('teste-escova') && !sitemap.includes('teste-shampoo') && !sitemap.includes('teste-esgotado'));

  for (const [nome, exe] of NAVEGADORES) {
    const perfil = mkdtempSync(join(tmpdir(), 'giovanella-loja-'));
    const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`,
      '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
    let versao = '?';
    for (let i = 0; i < 60; i++) {
      try { versao = (await (await fetch(`http://127.0.0.1:${porta}/json/version`)).json()).Browser; break; }
      catch { await dormir(250); }
    }
    console.log(`\n${nome} (${versao})`);

    try {
      /* ----- /loja/ no desktop ----- */
      let p = await abrir(porta, '/loja/');
      const loja = await p.avaliar(`(() => {
        const ofertas = [...document.querySelectorAll('a.produto-oferta')];
        return {
          js: document.documentElement.classList.contains('js-ready'),
          cards: document.querySelectorAll('[data-loja-produto]').length,
          ofertas: ofertas.map((a) => ({ host: new URL(a.href).hostname, rel: a.rel, alvo: a.target })),
          emBreve: [...document.querySelectorAll('.produto-indisponivel')].map((e) => e.textContent.trim()),
          xss: window.__xss !== undefined || !!document.querySelector('[data-xss]'),
          textoXss: [...document.querySelectorAll('.produto-card__titulo')].some((h) => h.textContent.includes('<img src=x')),
          robots: document.querySelector('meta[name=robots]').content,
          lojaAtiva: document.querySelector('.nav a[href="/loja/"]')?.getAttribute('aria-current'),
          filtrosVisiveis: getComputedStyle(document.querySelector('[data-loja-filtros]')).display !== 'none',
          ld: [...document.querySelectorAll('script[type="application/ld+json"]')].every((s) => { try { JSON.parse(s.textContent); return true; } catch { return false; } }),
        };
      })()`);
      check('/loja/: JavaScript inicializou', loja.js);
      check('/loja/: 5 produtos listados', loja.cards === 5, `${loja.cards}`);
      check('/loja/: 2 botões de oferta (só os compráveis)', loja.ofertas.length === 2, JSON.stringify(loja.ofertas));
      const permitidos = /(^|\.)(mercadolivre\.com|mercadolivre\.com\.br|shopee\.com\.br|shope\.ee)$/;
      check('/loja/: ofertas só para domínios permitidos', loja.ofertas.every((o) => permitidos.test(o.host)));
      check('/loja/: ofertas com rel completo e nova aba',
        loja.ofertas.every((o) => o.rel === 'sponsored nofollow noopener noreferrer' && o.alvo === '_blank'));
      check('/loja/: "Oferta em breve" x2 e "Indisponível" x1 (sem link)',
        loja.emBreve.filter((t) => t === 'Oferta em breve').length === 2 && loja.emBreve.includes('Indisponível no momento'));
      check('/loja/: HTML do catálogo não é executado (XSS)', !loja.xss && loja.textoXss);
      check('/loja/: indexável (há oferta real)', loja.robots.startsWith('index'));
      check('/loja/: item "Loja" do menu marcado como página atual', loja.lojaAtiva === 'page');
      check('/loja/: filtros visíveis com JavaScript', loja.filtrosVisiveis);
      check('/loja/: JSON-LD válido', loja.ld);

      // Filtros
      await p.avaliar(`document.querySelector('[data-filtro="categoria"][data-valor="maquinas"]').click()`);
      await dormir(150);
      const f1 = await p.avaliar(`({ n: ${VISIVEIS}, txt: document.querySelector('[data-loja-contagem]').textContent, url: location.search,
        pressionado: document.querySelector('[data-valor="maquinas"]').getAttribute('aria-pressed') })`);
      check('filtro categoria: 2 máquinas', f1.n === 2 && f1.txt === '2 produtos', JSON.stringify(f1));
      check('filtro categoria: aria-pressed e ?categoria= na URL', f1.pressionado === 'true' && f1.url === '?categoria=maquinas');
      await p.avaliar(`document.querySelector('[data-filtro="marketplace"][data-valor="shopee"]').click()`);
      await dormir(150);
      const f2 = await p.avaliar(`({ n: ${VISIVEIS}, vazio: !document.querySelector('[data-loja-vazio]').hidden })`);
      check('filtros combinados sem resultado: mensagem de vazio', f2.n === 0 && f2.vazio);
      await p.avaliar(`document.querySelector('[data-loja-limpar]').click()`);
      await dormir(150);
      check('"Mostrar todos" volta aos 5', (await p.avaliar(VISIVEIS)) === 5);

      await p.ir('/loja/?categoria=tesouras');
      check('link com ?categoria=tesouras abre filtrado', (await p.avaliar(VISIVEIS)) === 1);
      await p.ir('/loja/?categoria=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      check('categoria inválida na URL é ignorada', (await p.avaliar(VISIVEIS)) === 5);
      await saude(p, '/loja/');

      /* ----- Página de produto ----- */
      await p.ir('/loja/teste-maquina-de-tosa/');
      const prod = await p.avaliar(`({
        h1: document.querySelector('h1')?.textContent.trim(),
        oferta: document.querySelector('a.produto-oferta')?.href,
        migalhas: document.querySelectorAll('.breadcrumb li').length,
        robots: document.querySelector('meta[name=robots]').content,
        canonical: document.querySelector('link[rel=canonical]').href,
        preco: document.querySelector('.produto-preco__valor')?.textContent || '',
        semFoto: !!document.querySelector('.produto-foto--vazia'),
      })`);
      check('produto: título, oferta e breadcrumb', prod.h1 === 'TESTE — Máquina de tosa' && prod.oferta === 'https://mercadolivre.com/sec/TESTE001' && prod.migalhas === 3);
      check('produto: indexável com canonical do domínio final', prod.robots.startsWith('index') && prod.canonical.endsWith('/loja/teste-maquina-de-tosa/'));
      check('produto: preço com data e marcador de foto', prod.preco.includes('R$') && prod.semFoto);
      await saude(p, 'produto');

      await p.ir('/loja/teste-escova/');
      const pend = await p.avaliar(`({ robots: document.querySelector('meta[name=robots]').content, oferta: !!document.querySelector('a.produto-oferta') })`);
      check('produto sem link: noindex e sem botão de oferta', pend.robots.startsWith('noindex') && !pend.oferta);

      /* ----- Home: menu e destaques ----- */
      await p.ir('/');
      const home = await p.avaliar(`({
        destaques: document.querySelectorAll('#loja [data-loja-produto]').length,
        linkLoja: !!document.querySelector('.nav a[href="/loja/"]'),
        navCabe: (() => { const n = document.querySelector('.header__inner'); return n.scrollWidth <= n.clientWidth; })(),
      })`);
      check('home: 2 destaques (só compráveis marcados)', home.destaques === 2, `${home.destaques}`);
      check('home: "Loja" no menu sem estourar o cabeçalho (1280px)', home.linkLoja && home.navCabe);
      await saude(p, 'home');
      await p.fechar();

      /* ----- Cabeçalho na menor largura de desktop (1024px) ----- */
      p = await abrir(porta, '/', (cdp) => cdp('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false }));
      const estreito = await p.avaliar(`(() => {
        const n = document.querySelector('.header__inner');
        const links = [...document.querySelectorAll('.nav__link')].map((a) => a.getBoundingClientRect());
        return { cabe: n.scrollWidth <= n.clientWidth, umaLinha: new Set(links.map((r) => Math.round(r.top))).size === 1 };
      })()`);
      check('1024px: menu com "Loja" cabe em uma linha', estreito.cabe && estreito.umaLinha, JSON.stringify(estreito));
      await p.fechar();

      /* ----- Celular ----- */
      p = await abrir(porta, '/loja/', async (cdp) => {
        await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 2, mobile: true });
        await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      });
      const cel = await p.avaliar(`(() => {
        const t = document.querySelector('[data-menu-toggle]'); t.click();
        const abriu = t.getAttribute('aria-expanded') === 'true';
        const loja = document.querySelector('.mobile-menu a[href="/loja/"]');
        return { abriu, loja: !!loja && loja.getAttribute('aria-current') === 'page' && loja.offsetParent !== null };
      })()`);
      check('celular 360px: menu abre e mostra "Loja" como página atual', cel.abriu && cel.loja);
      await p.avaliar(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
      await saude(p, 'celular /loja/');
      await p.ir('/loja/teste-maquina-de-tosa/');
      await saude(p, 'celular produto');
      await p.fechar();

      /* ----- Sem JavaScript ----- */
      p = await abrir(porta, '/loja/', (cdp) => cdp('Emulation.setScriptExecutionDisabled', { value: true }));
      const semJs = await p.avaliar(`({
        visiveis: ${VISIVEIS},
        filtrosOcultos: getComputedStyle(document.querySelector('[data-loja-filtros]')).display === 'none',
        ofertas: document.querySelectorAll('a.produto-oferta').length,
      })`);
      check('sem JS: todos os produtos visíveis, filtros ocultos, ofertas funcionando',
        semJs.visiveis === 5 && semJs.filtrosOcultos && semJs.ofertas === 2, JSON.stringify(semJs));
      await p.fechar();
    } catch (erro) {
      check('o teste rodou até o fim', false, erro.stack);
    }

    proc.kill();
    await dormir(800);
    try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o navegador pode ainda segurar arquivos */ }
    porta += 1;
  }
} finally {
  await servidor.close();
  // Volta ao catálogo REAL: dist/ e loja/ não podem ficar com dados de teste.
  delete process.env.LOJA_PRODUTOS;
  delete process.env.LOJA_HOJE;
  await build({ logLevel: 'error' });
  rmSync(new URL(SAIDA + '/', RAIZ), { recursive: true, force: true });
}

console.log(falhas === 0 ? '\nTodos os testes da loja em navegador passaram.' : `\n${falhas} verificação(ões) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
