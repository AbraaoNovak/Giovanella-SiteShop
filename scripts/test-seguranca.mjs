/**
 * AUDITORIA DE SEGURANÇA AUTOMATIZADA
 *
 * Verifica o build de produção (dist/) e a configuração da Vercel contra os
 * problemas que este projeto já teve ou que uma edição descuidada traria de
 * volta. Falha (código 1) se algo regredir.
 *
 * Uso:   npm run test:seguranca      (já roda o build antes)
 *
 * Complementos manuais, fora do escopo deste script:
 *   - npm audit                       (vulnerabilidades em dependências)
 *   - https://securityheaders.com     (cabeçalhos no domínio publicado)
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

/* ---------------------------------------------------------------------------
   Cabeçalhos da Vercel
   --------------------------------------------------------------------------- */
const vercel = JSON.parse(readFileSync(join(RAIZ, 'vercel.json'), 'utf8'));
const globais = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)' && !h.has).headers.map((h) => [h.key.toLowerCase(), h.value])
);
const csp = globais['content-security-policy'] || '';
const diretivas = Object.fromEntries(
  csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [nome, ...valores] = d.split(/\s+/);
    return [nome, valores];
  })
);

for (const cab of ['content-security-policy', 'strict-transport-security', 'x-content-type-options',
  'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy']) {
  check(`cabeçalho ${cab}`, Boolean(globais[cab]));
}

const exigirDiretiva = (nome, esperado) =>
  check(`CSP ${nome} ${esperado}`, (diretivas[nome] || []).includes(esperado), (diretivas[nome] || []).join(' '));
exigirDiretiva('default-src', "'self'");
exigirDiretiva('object-src', "'none'");
exigirDiretiva('base-uri', "'self'");
exigirDiretiva('frame-ancestors', "'none'");
exigirDiretiva('form-action', "'none'");
check("CSP sem 'unsafe-inline' nem 'unsafe-eval'", !/unsafe-(inline|eval)/.test(csp));

/* ---------------------------------------------------------------------------
   HTML publicado
   --------------------------------------------------------------------------- */
const paginas = readdirSync(DIST).filter((f) => f.endsWith('.html'));
check('build encontrado', paginas.length > 0, paginas.join(', '));

const hashesUsados = new Set();
for (const pagina of paginas) {
  // Comentários fora: o navegador não executa nada neles, e um comentário pode
  // citar "<script ...>" como texto (o que já enganou uma versão anterior).
  const html = readFileSync(join(DIST, pagina), 'utf8').replace(/<!--[\s\S]*?-->/g, '');

  // 1. Todo script inline executável precisa estar autorizado por hash.
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\ssrc=/.test(attrs) || /application\/ld\+json/.test(attrs)) continue;
    const hash = `'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`;
    hashesUsados.add(hash);
    check(`${pagina}: script inline autorizado na CSP`, (diretivas['script-src'] || []).includes(hash),
      `${hash} — atualize vercel.json se o script mudou`);
  }

  // 2. Nada de estilo ou evento inline (seriam bloqueados pela CSP estrita).
  check(`${pagina}: sem atributos style=""`, !/\sstyle="/.test(html));
  check(`${pagina}: sem eventos inline (onclick= etc.)`, !/\son[a-z]+="/i.test(html));

  // 3. Recursos carregados ao abrir a página: só do próprio site.
  const externos = [
    ...html.matchAll(/<script[^>]+src="(https?:[^"]+)"/g),
    ...html.matchAll(/<link[^>]+rel="(?:stylesheet|preload|modulepreload)"[^>]+href="(https?:[^"]+)"/g),
    ...html.matchAll(/<img[^>]+src="(https?:[^"]+)"/g),
  ].map((x) => x[1]);
  check(`${pagina}: nenhum recurso de terceiros ao carregar`, externos.length === 0, externos.join(', '));

  // 4. Links que abrem nova aba: com noopener (evita "reverse tabnabbing").
  const novaAba = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
  const semNoopener = novaAba.filter((t) => !/rel="[^"]*noopener/.test(t));
  check(`${pagina}: links target=_blank com noopener`, semNoopener.length === 0, `${novaAba.length} links`);

  // 5. Formulários nunca por GET (dados pessoais iriam para a URL).
  const forms = html.match(/<form\b[^>]*>/g) || [];
  for (const f of forms) check(`${pagina}: formulário com method="post"`, /method="post"/i.test(f));
}

const sobrando = (diretivas['script-src'] || []).filter((v) => v.startsWith("'sha256-") && !hashesUsados.has(v));
check('CSP sem hashes de scripts que não existem mais', sobrando.length === 0, sobrando.join(' '));

/* ---------------------------------------------------------------------------
   Repositório
   --------------------------------------------------------------------------- */
const rastreados = execSync('git ls-files', { cwd: RAIZ, encoding: 'utf8' }).split('\n').filter(Boolean);
check('.env fora do repositório', !rastreados.some((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith('.example')));

const PADROES_SEGREDO = [
  /AIza[0-9A-Za-z_-]{35}/, // chave de API do Google
  /sk_(live|test)_[0-9a-zA-Z]{20,}/, // Stripe
  /gh[pousr]_[0-9A-Za-z]{36}/, // token do GitHub
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bG-(?!X{6,})[A-Z0-9]{8,12}\b/, // ID real do Google Analytics (fora dos exemplos G-XXXX)
];
const textos = rastreados.filter((f) => /\.(js|mjs|json|html|css|md|txt|xml|env\.example)$/.test(f) && !f.includes('package-lock'));
const comSegredo = textos.filter((f) => {
  const conteudo = readFileSync(join(RAIZ, f), 'utf8');
  return PADROES_SEGREDO.some((p) => p.test(conteudo));
});
check('nenhuma chave ou token no código', comSegredo.length === 0, comSegredo.join(', '));

/* ---------------------------------------------------------------------------
   Imagens: sem metadados (localização GPS, modelo do celular, data)
   --------------------------------------------------------------------------- */
function listar(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : [p];
  });
}
const imagens = [...listar(join(RAIZ, 'public', 'img')), ...listar(join(RAIZ, 'fotos'))]
  .filter((p) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(p).toLowerCase()));
const comMetadados = [];
for (const img of imagens) {
  const meta = await sharp(img).metadata();
  // EXIF: GPS, celular, data. XMP: autor e programa de edição — o logo saiu
  // do Canva com o nome de quem o exportou gravado como "Author".
  if (meta.exif || meta.xmp) comMetadados.push(img.replace(RAIZ, '').replace(/\\/g, '/'));
}
check(`${imagens.length} imagens sem metadados (EXIF/XMP)`, comMetadados.length === 0, comMetadados.slice(0, 5).join(', '));

console.log(falhas === 0 ? '\nAuditoria de segurança: tudo certo.' : `\n${falhas} problema(s) de segurança.`);
process.exit(falhas === 0 ? 0 : 1);
