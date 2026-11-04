/**
 * Testes da loja (sem navegador): validação de links de afiliado, regras do
 * catálogo, escape de HTML e geração das páginas.
 * Executar com: node scripts/test-loja.mjs
 */
import { readFileSync } from 'node:fs';

import { validarLinkAfiliado, validarImagem, montarCatalogo } from '../src/loja/catalogo.js';
import { esc, jsonLd, extrairLayout } from '../src/loja/html.js';
import { paginaLoja, paginaProduto, secaoDestaques } from '../src/loja/paginas.js';
import { LOJA, MARKETPLACES } from '../src/loja/config.js';
import { CATEGORIAS } from '../src/loja/categorias.js';
import { PRODUTOS as PRODUTOS_REAIS } from '../src/loja/produtos.js';
import { PRODUTOS as EXEMPLO } from './fixtures/produtos-exemplo.js';

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

const ML = MARKETPLACES['mercado-livre'];
const SHOPEE = MARKETPLACES.shopee;
const HOJE = new Date('2026-11-04T12:00:00Z');

/* ---------------------------------------------------------------------------
   Links de afiliado
   --------------------------------------------------------------------------- */
const aceitos = [
  ['https://mercadolivre.com/sec/2abc123', ML],
  ['https://www.mercadolivre.com.br/social/loja?matt_tool=1', ML],
  ['https://produto.mercadolivre.com.br/MLB-123-tesoura', ML],
  ['HTTPS://MERCADOLIVRE.COM/sec/X', ML],
  ['https://s.shopee.com.br/7abc', SHOPEE],
  ['https://shope.ee/abc', SHOPEE],
  ['https://shopee.com.br/produto-i.1.2', SHOPEE],
];
for (const [url, m] of aceitos) {
  check(`aceita ${url}`, validarLinkAfiliado(url, m).estado === 'valido');
}

const recusados = [
  ['http://mercadolivre.com/sec/x', ML, 'sem HTTPS'],
  ['https://mercadolivre.com.evil.com/x', ML, 'domínio parecido no começo'],
  ['https://evilmercadolivre.com/x', ML, 'domínio parecido no fim'],
  ['https://mercadolivre.com@evil.com/x', ML, 'usuário no endereço'],
  ['https://evil.com\\@mercadolivre.com/x', ML, 'barra invertida'],
  ['https://mercadolivre.com:8443/x', ML, 'porta'],
  ['javascript:alert(1)', ML, 'javascript:'],
  ['data:text/html,<b>x</b>', ML, 'data:'],
  ['//mercadolivre.com/sec/x', ML, 'sem protocolo'],
  ['https://mercadolivre.com/sec/x y', ML, 'espaço no meio'],
  ['https://s.shopee.com.br/abc', ML, 'link da Shopee no Mercado Livre'],
  ['https://mercadolivre.com/sec/x', SHOPEE, 'link do Mercado Livre na Shopee'],
  ['https://shopee.ee/abc', SHOPEE, 'domínio não confirmado (shopee.ee)'],
  ['{{LINK_AFILIADO_ML', ML, 'marcador malformado'],
  [12345, ML, 'número em vez de texto'],
];
for (const [url, m, motivo] of recusados) {
  check(`recusa: ${motivo}`, validarLinkAfiliado(url, m).estado === 'invalido', String(url));
}

check('marcador {{LINK_AFILIADO_MERCADO_LIVRE}} = pendente', validarLinkAfiliado('{{LINK_AFILIADO_MERCADO_LIVRE}}', ML).estado === 'pendente');
check('texto vazio = vazio', validarLinkAfiliado('  ', ML).estado === 'vazio');
check('null = vazio', validarLinkAfiliado(null, ML).estado === 'vazio');

/* ---------------------------------------------------------------------------
   Fotos
   --------------------------------------------------------------------------- */
check('foto em /img/loja/ aceita', validarImagem('/img/loja/tesoura-7.jpg').ok);
check('foto em subpasta aceita', validarImagem('/img/loja/tesouras/reta.webp').ok);
for (const ruim of ['/img/loja/../Logo.png', 'https://http2.mlstatic.com/x.jpg', '/img/loja/Foto Nova.JPG', '/img/cursos/x.jpg', 'javascript:x']) {
  check(`foto recusada: ${ruim}`, !validarImagem(ruim).ok);
}

/* ---------------------------------------------------------------------------
   Catálogo
   --------------------------------------------------------------------------- */
const montar = (produtos, extra = {}) =>
  montarCatalogo({ produtos, categorias: CATEGORIAS, marketplaces: MARKETPLACES, config: LOJA, hoje: HOJE, ...extra });

const real = montar(PRODUTOS_REAIS);
check('catálogo real sem erros', real.erros.length === 0, real.erros.join(' | '));

const ex = montar(EXEMPLO);
check('catálogo de exemplo sem erros', ex.erros.length === 0, ex.erros.join(' | '));
check('produto desativado é ignorado (mesmo inválido)', ex.produtos.length === 5, `${ex.produtos.length} produtos`);
const porId = Object.fromEntries(ex.produtos.map((p) => [p.id, p]));
check('link válido + disponível = comprável', porId['teste-maquina'].compravel && porId['teste-tesoura'].compravel);
check('marcador = não comprável', !porId['teste-escova'].compravel && porId['teste-escova'].link.estado === 'pendente');
check('link vazio = não comprável', !porId['teste-shampoo'].compravel);
check('esgotado = não comprável', !porId['teste-esgotado'].compravel);
check('preço recente aparece, com preço "de"', porId['teste-maquina'].preco?.valor === 100 && porId['teste-maquina'].preco?.original === 120);
check('preço vencido some', porId['teste-tesoura'].preco === null);
check('nota oculta enquanto o programa não autoriza', porId['teste-maquina'].avaliacao === null);
check('categorias sem produto ficam fora dos filtros', ex.categorias.every((c) => c.total > 0) && ex.categorias.length === 4);

const comAvaliacao = montar(EXEMPLO, {
  marketplaces: { ...MARKETPLACES, 'mercado-livre': { ...ML, exibirAvaliacoes: true } },
});
check('nota aparece quando autorizada', comAvaliacao.produtos[0].avaliacao?.nota === 4.8);

const base = { id: 'a', slug: 'a', title: 'A', category: 'tesouras', marketplace: 'shopee' };
const casos = [
  ['slug repetido', [base, { ...base, id: 'b' }]],
  ['id repetido', [base, { ...base, slug: 'b' }]],
  ['categoria inexistente', [{ ...base, category: 'xyz' }]],
  ['marketplace inexistente', [{ ...base, marketplace: 'amazon' }]],
  ['marketplace "__proto__"', [{ ...base, marketplace: '__proto__' }]],
  ['link de outro domínio', [{ ...base, affiliate_url: 'https://site-falso.example/x' }]],
  ['slug com espaço', [{ ...base, slug: 'minha tesoura' }]],
  ['sem título', [{ ...base, title: '   ' }]],
];
for (const [nome, produtos] of casos) {
  check(`erro de build: ${nome}`, montar(produtos).erros.length > 0);
}
check('preço sem data some', montar([{ ...base, price: 10 }]).produtos[0].preco === null);
check('preço com data futura some', montar([{ ...base, price: 10, last_updated: '2026-12-25' }]).produtos[0].preco === null);
check('data impossível é recusada', montar([{ ...base, price: 10, last_updated: '2026-02-31' }]).produtos[0].preco === null);
check('preço "de" menor que o atual é ignorado',
  montar([{ ...base, price: 10, original_price: 5, last_updated: '2026-11-04' }]).produtos[0].preco.original === null);

/* ---------------------------------------------------------------------------
   HTML seguro
   --------------------------------------------------------------------------- */
check('esc() neutraliza tags e aspas', esc('<img src=x onerror="a">\'') === '&lt;img src=x onerror=&quot;a&quot;&gt;&#39;');
check('jsonLd() não deixa fechar o <script>', !jsonLd({ a: '</script><script>alert(1)</script>' }).includes('</script>'));

/* ---------------------------------------------------------------------------
   Layout copiado da home
   --------------------------------------------------------------------------- */
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const layout = extrairLayout(indexHtml, LOJA);
check('scripts do <head> copiados byte a byte (hash da CSP)', indexHtml.includes(layout.scripts) && layout.scripts.includes('<script nomodule>'));
check('âncoras do menu apontam para a home', layout.header.includes('href="/#cursos"') && !layout.header.includes('href="#'));
check('menu sem data-nav-link (header.js)', !/data-nav-link/.test(layout.header + layout.menu));
check('link "Loja" marcado como página atual', layout.header.includes('href="/loja/" aria-current="page"') && layout.menu.includes('href="/loja/" aria-current="page"'));
check('rodapé da loja com aviso de afiliados', layout.footer.includes('footer__afiliados') && layout.footer.includes('comissões'));
check('home com item "Loja" no menu e marcador de destaques',
  (indexHtml.match(/href="\/loja\/"/g) || []).length === 3 && indexHtml.includes('<!-- loja:destaques -->'));

/* ---------------------------------------------------------------------------
   Páginas geradas
   --------------------------------------------------------------------------- */
const ctx = (infoImagem = () => null) => ({
  site: { url: 'https://www.escolabanhoetosarosigiovanella.com.br', nome: 'Giovanella Escola Estética Animal' },
  config: LOJA,
  layout,
  infoImagem,
  imagemSocialPadrao: { url: 'https://x/og.jpg', alt: 'og', width: 1200, height: 630 },
});

const html = paginaLoja(ex, ctx());
const ofertas = html.match(/<a\b[^>]*class="[^"]*produto-oferta[^"]*"[^>]*>/g) || [];
check('um botão de oferta por produto comprável', ofertas.length === 2, `${ofertas.length}`);
check('todo botão de oferta tem rel sponsored nofollow noopener noreferrer',
  ofertas.every((a) => a.includes('rel="sponsored nofollow noopener noreferrer"') && a.includes('target="_blank"')));
check('"Oferta em breve" para link pendente/vazio', (html.match(/Oferta em breve/g) || []).length === 2);
check('"Indisponível" para esgotado', html.includes('Indisponível no momento'));
check('HTML do catálogo é escapado (sem tag injetada)', !html.includes('<img src=x') && !html.includes('<script>window.__xss'));
check('loja com oferta real é indexável', html.includes('content="index, follow'));
check('JSON-LD sem Product/Offer/AggregateRating', !/"(Product|Offer|AggregateRating)"/.test(html));
check('ItemList só com os compráveis', /"numberOfItems": 2/.test(html));
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let ldOk = false;
try { ldOk = Boolean(JSON.parse(ld[1])['@graph']); } catch { /* falha abaixo */ }
check('JSON-LD da loja é JSON válido', ldOk);

const vazia = paginaLoja(montar([]), ctx());
check('loja vazia: "Produtos em breve" e noindex', vazia.includes('Produtos em breve') && vazia.includes('content="noindex, follow"'));
check('loja vazia: sem filtros e sem ItemList', !vazia.includes('data-loja-filtros') && !vazia.includes('ItemList'));

const paginaPendente = paginaProduto(porId['teste-escova'], ctx());
check('produto sem oferta: noindex e sem link externo', paginaPendente.includes('noindex') && !/href="https:\/\/(?!wa\.me|www\.google)/.test(paginaPendente.replace(/<link[^>]*>|<meta[^>]*>/g, '')));
const paginaOk = paginaProduto(porId['teste-maquina'], ctx());
check('produto comprável: indexável, canonical e aviso de redirecionamento',
  paginaOk.includes('content="index, follow') &&
  paginaOk.includes('<link rel="canonical" href="https://www.escolabanhoetosarosigiovanella.com.br/loja/teste-maquina-de-tosa/"') &&
  paginaOk.includes('Ao clicar, você vai para o Mercado Livre'));
check('foto ausente vira marcador', paginaOk.includes('produto-foto--vazia'));

const comFoto = paginaProduto(porId['teste-maquina'], ctx(() => ({ width: 800, height: 800, webp: '/img/loja/x.webp' })));
check('foto existente: <picture> com WebP e width/height', /<picture><source type="image\/webp" srcset="\/img\/loja\/x.webp" \/><img [^>]*width="800" height="800"/.test(comFoto));

const destaques = secaoDestaques(ex, ctx());
check('home: só destaques compráveis (2 de 3 marcados)', (destaques.match(/data-loja-produto/g) || []).length === 2);
check('home: sem destaques, nada é inserido', secaoDestaques(montar([]), ctx()) === '');

console.log(falhas === 0 ? '\nTodos os testes da loja passaram.' : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
