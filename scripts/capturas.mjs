/**
 * CAPTURAS DE TELA PARA REVISÃO VISUAL
 *
 * Abre o build (dist/) num navegador Chromium instalado, em várias larguras,
 * e salva uma imagem de cada seção pedida em capturas/ (ignorada pelo git).
 * Também mede problemas de layout que o olho pode deixar passar.
 *
 * Uso:
 *   npm run capturas
 *   npm run capturas -- 375,768,1440 inicio,cursos     (larguras e seções)
 *   COM_MOVIMENTO=1 npm run capturas                    (mantém animações)
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preview } from 'vite';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, 'capturas');
const LARGURAS = (process.argv[2] || '375,768,1440').split(',').map(Number);
const SECOES = (process.argv[3] || 'inicio,sobre,cursos,galeria,contato,depoimentos,patriocinio').split(',');
const PORTA_SITE = 4321;
const PORTA_CDP = 9640;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const NAVEGADOR = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find(existsSync);
if (!NAVEGADOR) {
  console.log('Nenhum Chrome ou Edge encontrado.');
  process.exit(1);
}

mkdirSync(SAIDA, { recursive: true });
const servidor = await preview({
  root: RAIZ,
  preview: { port: PORTA_SITE, strictPort: true, host: '127.0.0.1', open: false },
  logLevel: 'silent',
});
const perfil = mkdtempSync(join(tmpdir(), 'giovanella-capturas-'));
const proc = spawn(NAVEGADOR, ['--headless=new', `--remote-debugging-port=${PORTA_CDP}`, `--user-data-dir=${perfil}`,
  '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

try {
  for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`); break; } catch { await dormir(250); } }
  const alvo = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let seq = 0;
  const pendentes = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pendentes.has(m.id)) { pendentes.get(m.id)(m); pendentes.delete(m.id); }
  });
  const cdp = (method, params = {}) =>
    new Promise((r) => { const id = ++seq; pendentes.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const avaliar = async (expr) =>
    (await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;

  await cdp('Page.enable');
  // Sem animações de entrada, para tudo aparecer na captura.
  if (!process.env.COM_MOVIMENTO) {
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  }

  for (const largura of LARGURAS) {
    const mobile = largura < 768;
    await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: 900, deviceScaleFactor: 1, mobile });
    await cdp('Page.navigate', { url: `http://127.0.0.1:${PORTA_SITE}/` });
    await dormir(2500);
    // Janela do tamanho da página inteira: carrega todas as imagens "lazy".
    const altura = await avaliar('document.documentElement.scrollHeight');
    await cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile });
    await dormir(2500);

    const medidas = await avaliar(`(async () => {
      const d = document.documentElement;
      const imgs = [...document.images].filter((i) => i.offsetParent !== null);
      await Promise.race([
        Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; })))),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
      return {
        rolagemHorizontal: d.scrollWidth > d.clientWidth,
        imagensQuebradas: imgs.filter((i) => i.naturalWidth === 0).length,
        imagensBorradas: imgs.filter((i) => i.naturalWidth && i.getBoundingClientRect().width > i.naturalWidth * 1.5).length,
      };
    })()`);
    console.log(`${String(largura).padStart(5)} px  ${JSON.stringify(medidas)}`);

    for (const id of SECOES) {
      const r = await avaliar(`(() => { const e = document.getElementById('${id}'); if (!e) return null;
        const b = e.getBoundingClientRect(); return { y: b.top + scrollY, h: Math.min(b.height, 2400) }; })()`);
      if (!r) continue;
      const shot = await cdp('Page.captureScreenshot', {
        format: 'jpeg', quality: 70, clip: { x: 0, y: r.y, width: largura, height: r.h, scale: 1 },
      });
      writeFileSync(join(SAIDA, `${largura}-${id}.jpg`), Buffer.from(shot.result.data, 'base64'));
    }
  }
  ws.close();
  console.log(`\nCapturas em: ${SAIDA}`);
} finally {
  proc.kill();
  await servidor.close();
  await dormir(500);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* o navegador pode ainda segurar arquivos */ }
}
process.exit(0);
