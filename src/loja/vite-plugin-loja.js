/**
 * ============================================================================
 * PLUGIN DO VITE — gera a loja a cada build (e no `npm run dev`)
 * ----------------------------------------------------------------------------
 * 1. Lê config.js, categorias.js e produtos.js e valida tudo (catalogo.js).
 *    Erro no catálogo = build interrompido, com a explicação no terminal.
 * 2. Gera HTML estático em loja/ (pasta GERADA, fora do Git):
 *      loja/index.html            → /loja/
 *      loja/<slug>/index.html     → /loja/<slug>/
 *    e registra essas páginas como entradas do build.
 * 3. Na home (index.html), troca o marcador <!-- loja:destaques --> pela
 *    seção de produtos em destaque — ou o deixa como está, se não houver.
 * 4. No fim do build, acrescenta as páginas indexáveis ao dist/sitemap.xml.
 *
 * Variáveis só para TESTES (recusadas na Vercel, para que nunca publiquem
 * dados de exemplo): LOJA_PRODUTOS (arquivo alternativo de produtos) e
 * LOJA_HOJE (data AAAA-MM-DD usada como "hoje" na validade dos preços).
 * ============================================================================
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { montarCatalogo, lerData } from './catalogo.js';
import { extrairLayout } from './html.js';
import { paginaLoja, paginaProduto, secaoDestaques } from './paginas.js';

/** Arquivo que identifica a pasta loja/ como gerada (só ela pode ser apagada). */
const MARCA_GERADA = '.gerada-pelo-build';
const MARCADOR_HOME = '<!-- loja:destaques -->';

/** Importa um módulo sempre do disco (sem cache), para refletir edições no dev. */
async function importarFresco(caminho) {
  return import(`${pathToFileURL(caminho).href}?t=${Date.now()}`);
}

/**
 * Dimensões e versão WebP de cada foto de produto, para o HTML já sair com
 * width/height (evita "pulos" de layout) e com <picture>.
 */
async function medirImagens(raiz, produtos, avisos) {
  const sharp = (await import('sharp')).default;
  const medidas = new Map();
  const caminhos = new Set(produtos.flatMap((p) => [p.imagem, ...p.galeria].filter(Boolean).map((f) => f.src)));

  for (const src of caminhos) {
    const arquivo = join(raiz, 'public', src);
    if (!existsSync(arquivo)) {
      avisos.push(`foto ${src} não encontrada em public/ — exibindo o marcador de foto`);
      continue;
    }
    const { width, height } = await sharp(arquivo).metadata();
    const webp = src.replace(/\.(jpe?g|png)$/, '.webp');
    medidas.set(src, {
      width,
      height,
      webp: webp !== src && existsSync(join(raiz, 'public', webp)) ? webp : null,
    });
  }
  return medidas;
}

/**
 * Trava do modo demonstração: na Vercel, se o domínio de produção do projeto
 * já for o domínio oficial da escola, o build para. Produtos fictícios nunca
 * chegam ao site oficial, mesmo se alguém esquecer de desligar o modo.
 * (VERCEL_PROJECT_PRODUCTION_URL é definida pela própria Vercel.)
 */
export function recusarDemonstracaoNoDominioOficial(siteUrl) {
  const oficial = new URL(siteUrl).hostname.replace(/^www\./, '').split('.')[0];
  const producao = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').toLowerCase();
  if (process.env.VERCEL && producao.includes(oficial)) {
    throw new Error(
      `[loja] O modo demonstração (produtos fictícios) está ligado, mas o projeto já responde em ${producao}. ` +
        'Mude "demonstracao" para false em src/loja/config.js antes de publicar no domínio oficial.'
    );
  }
  console.warn('\x1b[33m[loja] MODO DEMONSTRAÇÃO ligado: produtos fictícios, sem links, fora do Google.\x1b[0m');
}

/** Lê os dados, valida e devolve tudo o que a geração precisa. */
async function carregar(raiz) {
  const variavelTeste = process.env.LOJA_PRODUTOS || process.env.LOJA_HOJE;
  if (variavelTeste && process.env.VERCEL) {
    throw new Error('[loja] LOJA_PRODUTOS/LOJA_HOJE são só para testes locais e não podem ser usadas na Vercel.');
  }

  const pasta = join(raiz, 'src', 'loja');
  const { LOJA, MARKETPLACES } = await importarFresco(join(pasta, 'config.js'));
  const { CATEGORIAS } = await importarFresco(join(pasta, 'categorias.js'));
  const { SITE } = await importarFresco(join(raiz, 'src', 'js', 'config', 'site.config.js'));

  // Modo demonstração (config.js). Os testes, que trazem o próprio catálogo
  // por LOJA_PRODUTOS, sempre rodam no modo normal.
  const demonstracao = LOJA.demonstracao === true && !process.env.LOJA_PRODUTOS;
  if (demonstracao) recusarDemonstracaoNoDominioOficial(SITE.siteUrl);

  const arquivoProdutos = process.env.LOJA_PRODUTOS
    ? resolve(raiz, process.env.LOJA_PRODUTOS)
    : join(pasta, demonstracao ? 'produtos-demonstracao.js' : 'produtos.js');
  const { PRODUTOS } = await importarFresco(arquivoProdutos);
  // Na demonstração, as notas fictícias aparecem para mostrar o layout completo.
  const marketplaces = demonstracao
    ? Object.fromEntries(Object.entries(MARKETPLACES).map(([id, m]) => [id, { ...m, exibirAvaliacoes: true }]))
    : MARKETPLACES;

  const hoje = process.env.LOJA_HOJE ? lerData(process.env.LOJA_HOJE) : new Date();
  if (!hoje) throw new Error('[loja] LOJA_HOJE inválida (use AAAA-MM-DD).');

  const catalogo = montarCatalogo({ produtos: PRODUTOS, categorias: CATEGORIAS, marketplaces, config: LOJA, hoje });
  if (catalogo.erros.length) {
    throw new Error(
      `[loja] O catálogo tem ${catalogo.erros.length} erro(s) — nada foi publicado:\n  - ${catalogo.erros.join('\n  - ')}\n` +
        'Corrija em src/loja/ (guia: AFFILIATE_CONFIGURATION.md).'
    );
  }

  const medidas = await medirImagens(raiz, catalogo.produtos, catalogo.avisos);
  const site = { url: SITE.siteUrl.replace(/\/$/, ''), nome: SITE.businessName };
  const ctx = {
    site,
    config: LOJA,
    demonstracao,
    layout: extrairLayout(readFileSync(join(raiz, 'index.html'), 'utf8'), LOJA),
    infoImagem: (src) => medidas.get(src) || null,
    imagemSocialPadrao: {
      url: `${site.url}/img/social/og-image.jpg`,
      alt: 'Fachada da Giovanella Escola Estética Animal, em Joinville',
      width: 1200,
      height: 630,
    },
  };
  return { catalogo, ctx, hoje };
}

/** Grava as páginas em loja/ e devolve as entradas do build. */
function gravarPaginas(raiz, { catalogo, ctx }) {
  const pastaLoja = join(raiz, ctx.config.caminho.replace(/^\/|\/$/g, ''));

  // Só apaga a pasta se ela foi criada por este plugin (tem a marca).
  if (existsSync(pastaLoja)) {
    if (!existsSync(join(pastaLoja, MARCA_GERADA))) {
      throw new Error(`[loja] a pasta ${pastaLoja} existe e não foi gerada pelo build. Mova o conteúdo dela antes de continuar.`);
    }
    rmSync(pastaLoja, { recursive: true, force: true });
  }
  mkdirSync(pastaLoja, { recursive: true });
  writeFileSync(
    join(pastaLoja, MARCA_GERADA),
    'Pasta gerada automaticamente a partir de src/loja/ (ver vite-plugin-loja.js). Não edite: é recriada a cada build.\n'
  );

  const entradas = {};
  const gravar = (nome, relativo, html) => {
    const arquivo = join(raiz, relativo);
    mkdirSync(dirname(arquivo), { recursive: true });
    writeFileSync(arquivo, html);
    entradas[nome] = arquivo;
  };

  const base = ctx.config.caminho.replace(/^\//, '');
  gravar('loja', `${base}index.html`, paginaLoja(catalogo, ctx));
  for (const p of catalogo.produtos) {
    gravar(`loja-${p.slug}`, `${base}${p.slug}/index.html`, paginaProduto(p, ctx));
  }
  return entradas;
}

/** Páginas que vão para o sitemap: só as que têm oferta real. */
function urlsIndexaveis({ catalogo, ctx, hoje }) {
  const compraveis = catalogo.produtos.filter((p) => p.compravel);
  if (!compraveis.length || ctx.demonstracao) return [];
  const dia = (d) => d.toISOString().slice(0, 10);
  return [
    { loc: `${ctx.site.url}${ctx.config.caminho}`, lastmod: dia(hoje), prioridade: '0.6' },
    ...compraveis.map((p) => ({
      loc: `${ctx.site.url}${p.url}`,
      lastmod: dia(p.ultimaAtualizacao || hoje),
      prioridade: '0.5',
    })),
  ];
}

export function lojaPlugin() {
  let raiz = process.cwd();
  let outDir = 'dist';
  /** @type {Awaited<ReturnType<typeof carregar>> | null} */
  let estado = null;

  const avisar = (avisos) => {
    for (const a of avisos) console.warn(`\x1b[33m[loja] aviso:\x1b[0m ${a}`);
  };

  return {
    name: 'giovanella-loja',

    async config(userConfig) {
      raiz = resolve(userConfig.root || process.cwd());
      estado = await carregar(raiz);
      avisar(estado.catalogo.avisos);
      const entradas = gravarPaginas(raiz, estado);
      return { build: { rollupOptions: { input: entradas } } };
    },

    configResolved(resolvido) {
      outDir = resolve(resolvido.root, resolvido.build.outDir);
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!estado || !html.includes(MARCADOR_HOME)) return html;
        if (resolve(ctx.filename) !== resolve(raiz, 'index.html')) return html;
        const secao = secaoDestaques(estado.catalogo, estado.ctx);
        return secao ? html.replace(MARCADOR_HOME, secao) : html;
      },
    },

    configureServer(server) {
      // No `npm run dev`, editar o catálogo (ou o index.html, de onde vem o
      // layout) regenera a loja e recarrega o navegador.
      const observados = [join(raiz, 'src', 'loja'), join(raiz, 'index.html'), join(raiz, 'public', 'img', 'loja')];
      server.watcher.add(observados);
      server.watcher.on('all', async (_evento, arquivo) => {
        const caminho = resolve(arquivo);
        const relevante =
          /[\\/]src[\\/]loja[\\/](config|categorias|produtos)\.js$/.test(caminho) ||
          caminho === resolve(raiz, 'index.html') ||
          caminho.startsWith(join(raiz, 'public', 'img', 'loja'));
        if (!relevante) return;
        try {
          estado = await carregar(raiz);
          avisar(estado.catalogo.avisos);
          gravarPaginas(raiz, estado);
          server.ws.send({ type: 'full-reload' });
        } catch (erro) {
          // No dev, um erro de digitação não derruba o servidor: avisa e
          // mantém as páginas anteriores.
          server.config.logger.error(erro.message);
        }
      });
    },

    closeBundle() {
      if (!estado) return;
      const sitemap = join(outDir, 'sitemap.xml');
      const urls = urlsIndexaveis(estado);
      if (!urls.length || !existsSync(sitemap)) return;
      const blocos = urls
        .map(
          (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.prioridade}</priority>
  </url>`
        )
        .join('\n');
      const xml = readFileSync(sitemap, 'utf8').replace('</urlset>', `  <!-- Loja (gerado no build) -->\n${blocos}\n</urlset>`);
      writeFileSync(sitemap, xml);
    },
  };
}
