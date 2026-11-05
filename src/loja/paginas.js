/**
 * ============================================================================
 * PÁGINAS DA LOJA — geração do HTML estático
 * ----------------------------------------------------------------------------
 * Funções puras que transformam o catálogo validado (catalogo.js) em HTML.
 * Chamadas pelo plugin do Vite (vite-plugin-loja.js) a cada build.
 *
 * Regras que valem para TODO o arquivo:
 * - todo dado do catálogo passa por esc() (anti-XSS);
 * - links de compra só existem para produtos "compráveis" (link validado);
 *   sem link, aparece "Oferta em breve" — nunca um botão que finge funcionar;
 * - links de afiliado: rel="sponsored nofollow noopener noreferrer";
 * - páginas sem oferta real ficam com noindex (nada de página vazia no Google);
 * - nada de AggregateRating/Offer no Schema.org: a escola não vende os
 *   produtos e as notas são da plataforma (diretrizes do Google).
 * ============================================================================
 */

import { esc, jsonLd } from './html.js';
import { formatarPreco, formatarData } from './catalogo.js';

/* ---------------------------------------------------------------------------
   Ícones (decorativos: aria-hidden)
   --------------------------------------------------------------------------- */

/** Mesma pegada das trilhas de patinhas do site (paws.js). */
const ICONE_PATA = `<svg class="loja-icone-pata" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><ellipse cx="32" cy="42" rx="15" ry="13"/><ellipse cx="14" cy="28" rx="7" ry="9" transform="rotate(-18 14 28)"/><ellipse cx="26" cy="17" rx="6.5" ry="9" transform="rotate(-7 26 17)"/><ellipse cx="40" cy="17" rx="6.5" ry="9" transform="rotate(7 40 17)"/><ellipse cx="51" cy="28" rx="7" ry="9" transform="rotate(18 51 28)"/></svg>`;

const ICONE_EXTERNO = `<svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>`;

const ICONES_CONFIANCA = {
  carrinho: '<path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5.2 4H2V2h4.6l.9 2H21a1 1 0 0 1 .96 1.27l-2.5 9A1 1 0 0 1 18.5 15H8.1l-1 2H19v2H5.4a1 1 0 0 1-.89-1.45L6.1 14.4 5.2 4z" />',
  caminhao: '<path d="M3 5h11v9h1.5l2.2-5H21l1 3v5h-2a2.5 2.5 0 0 1-5 0H9a2.5 2.5 0 0 1-5 0H2V6a1 1 0 0 1 1-1zm4 13.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm10.5 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM16 12h4.2l-.5-1.5h-3z" />',
  escola: '<path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3zM5 13.18v3.51L12 20l7-3.31v-3.51l-7 3.18-7-3.18z" />',
};

/* ---------------------------------------------------------------------------
   Peças pequenas
   --------------------------------------------------------------------------- */

/**
 * Foto do produto (ou o marcador "foto em breve").
 * @param {{src:string,alt:string}|null} imagem
 * @param {(src:string)=>({width:number,height:number,webp:string|null}|null)} infoImagem
 * @param {{ prioridade?: boolean }} [opcoes]
 */
function foto(imagem, infoImagem, { prioridade = false } = {}) {
  const info = imagem ? infoImagem(imagem.src) : null;
  if (!imagem || !info) {
    return `<span class="produto-foto produto-foto--vazia">${ICONE_PATA}<span>Foto em breve</span></span>`;
  }
  const carregamento = prioridade ? 'fetchpriority="high"' : 'loading="lazy"';
  const img = `<img src="${esc(imagem.src)}" alt="${esc(imagem.alt)}" width="${info.width}" height="${info.height}" ${carregamento} decoding="async" />`;
  const conteudo = info.webp
    ? `<picture><source type="image/webp" srcset="${esc(info.webp)}" />${img}</picture>`
    : img;
  return `<span class="produto-foto">${conteudo}</span>`;
}

/** Preço com data de consulta (nunca apresentado como garantido). */
function blocoPreco(p) {
  if (!p.preco) return '';
  const original = p.preco.original
    ? ` <s class="produto-preco__original"><span class="sr-only">Preço anterior: </span>${esc(formatarPreco(p.preco.original))}</s>`
    : '';
  return `
                <div class="produto-preco">
                  <p class="produto-preco__valor">${esc(formatarPreco(p.preco.valor))}${original}</p>
                  <p class="produto-preco__nota">Preço no ${esc(p.marketplace.nome)} em ${esc(formatarData(p.preco.consultadoEm))}. Pode ter mudado; confira na plataforma.</p>
                </div>`;
}

/** Nota e quantidade de avaliações — só quando autorizadas (config.js). */
function blocoAvaliacao(p) {
  if (!p.avaliacao) return '';
  const nota = p.avaliacao.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const total = p.avaliacao.total.toLocaleString('pt-BR');
  return `
                <p class="produto-avaliacao"><span aria-hidden="true">★</span> ${esc(nota)} de 5 · ${esc(total)} avaliações no ${esc(p.marketplace.nome)} (em ${esc(formatarData(p.avaliacao.consultadoEm))})</p>`;
}

/**
 * Ação comercial do produto.
 * - comprável: link de afiliado validado, nova aba, rel sponsored;
 * - link válido mas produto esgotado: aviso, sem link;
 * - sem link (vazio ou marcador): "Oferta em breve", sem link.
 */
function acaoComercial(p, { bloco = true, demonstracao = false } = {}) {
  if (p.compravel && demonstracao) {
    // Demonstração: mesma aparência do botão real, mas sem link — os
    // endereços dos produtos fictícios não existem.
    return `<span class="btn btn--primary${bloco ? ' btn--block' : ''} produto-oferta produto-oferta--demo"
                    >Ver oferta no ${esc(p.marketplace.nome)}${ICONE_EXTERNO}<span class="sr-only"> (demonstração, sem link)</span></span
                  >`;
  }
  if (p.compravel) {
    return `<a
                    class="btn btn--primary${bloco ? ' btn--block' : ''} produto-oferta"
                    href="${esc(p.link.url)}"
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    data-track="afiliado_clique"
                    data-track-label="${esc(`${p.marketplace.id}:${p.id}`)}"
                    >Ver oferta no ${esc(p.marketplace.nome)}${ICONE_EXTERNO}<span class="sr-only"> (abre em nova aba)</span></a
                  >`;
  }
  const texto = p.link.estado === 'valido' ? 'Indisponível no momento' : 'Oferta em breve';
  return `<p class="produto-indisponivel">${texto}</p>`;
}

/**
 * Card de produto (listagem da loja e destaques da home).
 * @param {any} p
 * @param {any} ctx
 * @param {{ nivel?: number }} [opcoes]  Nível do título (h2/h3), conforme a seção.
 */
export function cardProduto(p, ctx, { nivel = 3 } = {}) {
  return `
            <article class="card produto-card" data-loja-produto data-categoria="${esc(p.categoria.id)}" data-marketplace="${esc(p.marketplace.id)}">
              <a class="produto-card__media" href="${esc(p.url)}" tabindex="-1" aria-hidden="true">
                ${foto(p.imagem, ctx.infoImagem)}
              </a>
              <div class="card__body">
                <div class="produto-card__meta">
                  <span class="tag">${esc(p.categoria.nome)}</span>
                  <span class="tag tag--plataforma">${esc(p.marketplace.nome)}</span>
                </div>
                <h${nivel} class="produto-card__titulo"><a href="${esc(p.url)}">${esc(p.title)}</a></h${nivel}>
                ${p.short_description ? `<p class="card__text">${esc(p.short_description)}</p>` : ''}${blocoPreco(p)}${blocoAvaliacao(p)}
                <div class="produto-card__footer">
                  ${acaoComercial(p, { demonstracao: ctx.demonstracao })}
                </div>
              </div>
            </article>`;
}

/** Faixa de aviso exibida em todas as páginas no modo demonstração. */
function faixaDemonstracao(ctx) {
  if (!ctx.demonstracao) return '';
  return `<p class="loja-demo" role="note"><strong>Demonstração:</strong> produtos, preços e avaliações fictícios, só para visualizar o layout. Os botões não levam a nenhuma oferta.</p>`;
}

/** Trilha de navegação visível (o JSON-LD equivalente é gerado à parte). */
function breadcrumb(itens) {
  const lis = itens
    .map((item, i) =>
      i === itens.length - 1
        ? `<li><span aria-current="page">${esc(item.nome)}</span></li>`
        : `<li><a href="${esc(item.url)}">${esc(item.nome)}</a></li>`
    )
    .join('');
  return `<nav class="breadcrumb" aria-label="Você está aqui"><ol>${lis}</ol></nav>`;
}

function breadcrumbJsonLd(itens, siteUrl) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nome,
      item: `${siteUrl}${item.url}`,
    })),
  };
}

/** Faixa final que devolve o visitante para a escola (prioridade 1 do site). */
function faixaEscola() {
  return `
      <section class="section section--alt" data-header-theme="dark" aria-labelledby="loja-escola-title">
        <div class="container">
          <div class="cta-band">
            <div>
              <h2 id="loja-escola-title">Quer transformar o cuidado com os animais em profissão?</h2>
              <p>
                A Giovanella é uma escola de estética animal em Joinville, com cursos presenciais de
                banho, tosa e especializações.
              </p>
            </div>
            <div class="cta-band__actions">
              <a class="btn btn--outline-light" href="/#cursos" data-track="cta_clique" data-track-label="loja_cursos"
                >Conheça os cursos</a
              >
              <a
                class="btn btn--whatsapp"
                data-wa="default"
                data-track="whatsapp_clique"
                data-track-label="loja"
                href="https://wa.me/5547996086955"
                >Falar no WhatsApp</a
              >
            </div>
          </div>
        </div>
      </section>`;
}

/* ---------------------------------------------------------------------------
   Documento completo
   --------------------------------------------------------------------------- */

/**
 * @param {{ titulo: string, descricao: string, caminho: string, indexavel: boolean,
 *           imagemSocial?: {url:string, alt:string, width?:number, height?:number},
 *           dados: object[], corpo: string }} pagina
 * @param {any} ctx
 */
function documento(pagina, ctx) {
  const { site, layout } = ctx;
  const canonical = `${site.url}${pagina.caminho}`;
  const social = pagina.imagemSocial || ctx.imagemSocialPadrao;
  const medidas = social.width
    ? `
    <meta property="og:image:width" content="${social.width}" />
    <meta property="og:image:height" content="${social.height}" />`
    : '';
  const grafo = { '@context': 'https://schema.org', '@graph': pagina.dados };

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#294908" />

    <!-- Página GERADA no build a partir de src/loja/ (vite-plugin-loja.js).
         Não edite este arquivo: as mudanças seriam perdidas. -->
    <title>${esc(pagina.titulo)}</title>
    <meta name="description" content="${esc(pagina.descricao)}" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta name="robots" content="${pagina.indexavel ? 'index, follow, max-image-preview:large' : 'noindex, follow'}" />

    <meta property="og:type" content="website" />
    <meta property="og:locale" content="pt_BR" />
    <meta property="og:site_name" content="${esc(site.nome)}" />
    <meta property="og:title" content="${esc(pagina.titulo)}" />
    <meta property="og:description" content="${esc(pagina.descricao)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:image" content="${esc(social.url)}" />${medidas}
    <meta property="og:image:alt" content="${esc(social.alt)}" />
    <meta name="twitter:card" content="summary_large_image" />

    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />

    ${layout.scripts}

    <script type="application/ld+json">
${jsonLd(grafo)}
    </script>
  </head>

  <body>
    <a class="skip-link" href="#main">Pular para o conteúdo principal</a>

    ${layout.header}

    ${layout.menu}

    <main id="main" class="loja" data-paw-seams>${pagina.corpo}
    </main>

    ${layout.footer}

    ${layout.whatsapp}

    ${layout.consentimento}
  </body>
</html>
`;
}

/* ---------------------------------------------------------------------------
   /loja/
   --------------------------------------------------------------------------- */

/** Barra de filtros. Sem JavaScript ela fica oculta e tudo aparece listado. */
function filtros(catalogo) {
  const grupos = [];
  const chip = (tipo, valor, nome, total, ativo) =>
    `<button class="loja-chip" type="button" data-filtro="${tipo}" data-valor="${esc(valor)}" aria-pressed="${ativo}">${esc(nome)} <span class="loja-chip__total">${total}</span></button>`;

  if (catalogo.categorias.length > 1) {
    const chips = [chip('categoria', '', 'Todos', catalogo.produtos.length, true)]
      .concat(catalogo.categorias.map((c) => chip('categoria', c.id, c.nome, c.total, false)));
    grupos.push(`<div class="loja-filtros__grupo" role="group" aria-label="Filtrar por categoria">${chips.join('')}</div>`);
  }

  const plataformas = [...new Map(catalogo.produtos.map((p) => [p.marketplace.id, p.marketplace])).values()];
  if (plataformas.length > 1) {
    const chips = [chip('marketplace', '', 'Todas as plataformas', catalogo.produtos.length, true)].concat(
      plataformas.map((m) =>
        chip('marketplace', m.id, m.nome, catalogo.produtos.filter((p) => p.marketplace.id === m.id).length, false)
      )
    );
    grupos.push(`<div class="loja-filtros__grupo" role="group" aria-label="Filtrar por plataforma">${chips.join('')}</div>`);
  }

  return grupos.length ? `<div class="loja-filtros" data-loja-filtros>${grupos.join('')}</div>` : '';
}

/** Estado vazio: catálogo ainda sem produtos. */
function emBreve() {
  return `
          <div class="loja-em-breve">
            ${ICONE_PATA}
            <h3>Produtos em breve</h3>
            <p>
              Estamos selecionando produtos, acessórios e ferramentas para quem cuida da estética
              animal. Enquanto isso, conheça os cursos da escola.
            </p>
            <div class="loja-em-breve__acoes">
              <a class="btn btn--primary" href="/#cursos">Conheça os cursos</a>
              <a
                class="btn btn--whatsapp"
                data-wa="default"
                data-track="whatsapp_clique"
                data-track-label="loja_em_breve"
                href="https://wa.me/5547996086955"
                >Fale conosco</a
              >
            </div>
          </div>`;
}

/**
 * Página principal da loja.
 * @param {{ produtos: any[], categorias: any[] }} catalogo
 * @param {any} ctx
 */
export function paginaLoja(catalogo, ctx) {
  const { site, config } = ctx;
  const compraveis = catalogo.produtos.filter((p) => p.compravel);
  // Sem nenhuma oferta real, a loja não deve aparecer no Google.
  const indexavel = !ctx.demonstracao && compraveis.length > 0;
  const migalhas = [
    { nome: 'Início', url: '/' },
    { nome: config.nome, url: config.caminho },
  ];
  const total = catalogo.produtos.length;
  const contagem = `${total} ${total === 1 ? 'produto' : 'produtos'}`;

  const listagem = total
    ? `
          ${filtros(catalogo)}
          <p class="loja-contagem" data-loja-contagem aria-live="polite">${contagem}</p>
          <div class="grid loja-grid" data-loja-lista>${catalogo.produtos.map((p) => cardProduto(p, ctx, { nivel: 3 })).join('')}
          </div>
          <div class="loja-vazio" data-loja-vazio hidden>
            <p>Nenhum produto com esses filtros.</p>
            <button class="btn btn--secondary" type="button" data-loja-limpar>Mostrar todos</button>
          </div>`
    : emBreve();

  const corpo = `
      <section class="hero loja-hero" aria-labelledby="loja-title">
        <div class="container hero__grid">
          <div>
            ${faixaDemonstracao(ctx)}
            ${breadcrumb(migalhas)}
            <h1 class="hero__title" id="loja-title">
              <span class="section__eyebrow hero__kicker">Loja · Giovanella Escola Estética Animal</span>
              <span class="hero__headline">Tudo para cuidar, transformar e valorizar a <em>estética animal</em></span>
            </h1>
            <p class="hero__subtitle">
              Encontre produtos, acessórios e ferramentas selecionados para o universo da estética
              animal. <strong>A compra é feita no Mercado Livre ou na Shopee.</strong>
            </p>
            <div class="hero__actions">
              <a class="btn btn--primary" href="#produtos">Ver produtos</a>
              <a class="btn btn--secondary" href="/#cursos">Conheça os cursos da escola</a>
            </div>
          </div>

          <div class="hero__media">
            <figure class="photo hero__photo">
              <!-- Foto: Pexels (licença Pexels, uso comercial livre). Gerada por
                   "npm run fotos" a partir de fotos/loja-topo/. -->
              <picture>
                <source
                  type="image/webp"
                  srcset="/img/loja/topo/ferramentas-de-tosa-460.webp 460w, /img/loja/topo/ferramentas-de-tosa.webp 920w"
                  sizes="(min-width: 960px) 460px, calc(100vw - 2rem)"
                />
                <img
                  src="/img/loja/topo/ferramentas-de-tosa.jpg"
                  srcset="/img/loja/topo/ferramentas-de-tosa-460.jpg 460w, /img/loja/topo/ferramentas-de-tosa.jpg 920w"
                  sizes="(min-width: 960px) 460px, calc(100vw - 2rem)"
                  alt="Pente de metal, máquina de tosa e tesouras sobre a mesa de tosa, com pelos cortados"
                  width="920"
                  height="920"
                  fetchpriority="high"
                  decoding="async"
                />
              </picture>
            </figure>
          </div>
        </div>
      </section>

      <section class="section" id="produtos" aria-labelledby="produtos-title">
        <div class="container" data-loja>
          <div class="section__header">
            <p class="section__eyebrow">Produtos</p>
            <h2 id="produtos-title">Seleção da escola</h2>
            <p class="section__lead">
              Cada botão leva à oferta na plataforma parceira. Pagamento, entrega e trocas são feitos
              diretamente com ela.
            </p>
          </div>
          ${listagem}
        </div>
      </section>

      <section class="section section--alt" aria-labelledby="como-funciona-title">
        <div class="container">
          <div class="section__header">
            <p class="section__eyebrow">Transparência</p>
            <h2 id="como-funciona-title">Como funciona a loja</h2>
          </div>
          <ul class="trust loja-passos">
            <li class="trust__item">
              <svg class="trust__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONES_CONFIANCA.escola}</svg>
              <span>
                <span class="trust__label">A escola indica</span>
                <span class="trust__desc">Produtos escolhidos para quem trabalha com banho, tosa e estética animal.</span>
              </span>
            </li>
            <li class="trust__item">
              <svg class="trust__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONES_CONFIANCA.carrinho}</svg>
              <span>
                <span class="trust__label">Você compra na plataforma</span>
                <span class="trust__desc">O botão abre a oferta no Mercado Livre ou na Shopee, em uma nova aba.</span>
              </span>
            </li>
            <li class="trust__item">
              <svg class="trust__icon" viewBox="0 0 24 24" aria-hidden="true">${ICONES_CONFIANCA.caminhao}</svg>
              <span>
                <span class="trust__label">Ela cuida do pedido</span>
                <span class="trust__desc">Pagamento, estoque, entrega e trocas seguem as condições da plataforma.</span>
              </span>
            </li>
          </ul>
          <p class="loja-aviso">${esc(config.avisoAfiliados)}</p>
        </div>
      </section>
${faixaEscola()}`;

  const urlLoja = `${site.url}${config.caminho}`;
  const dados = [
    {
      '@type': 'CollectionPage',
      '@id': `${urlLoja}#pagina`,
      url: urlLoja,
      name: 'Loja Giovanella — produtos para banho, tosa e estética animal',
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${site.url}/#website` },
      about: { '@id': `${site.url}/#business` },
      breadcrumb: { '@id': `${urlLoja}#breadcrumb` },
    },
    { ...breadcrumbJsonLd(migalhas, site.url), '@id': `${urlLoja}#breadcrumb` },
  ];
  if (indexavel) {
    dados.push({
      '@type': 'ItemList',
      name: 'Produtos da loja',
      numberOfItems: compraveis.length,
      itemListElement: compraveis.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${site.url}${p.url}`,
        name: p.title,
      })),
    });
  }

  return documento(
    {
      titulo: 'Produtos para banho, tosa e estética animal | Loja Giovanella',
      descricao:
        'Produtos, acessórios e ferramentas de banho, tosa e estética animal selecionados pela escola Giovanella. Compra feita no Mercado Livre e na Shopee.',
      caminho: config.caminho,
      indexavel,
      dados,
      corpo,
    },
    ctx
  );
}

/* ---------------------------------------------------------------------------
   /loja/<slug>/
   --------------------------------------------------------------------------- */

/** Descrição curta para a meta description (até ~155 caracteres). */
function resumo(p) {
  const base = p.short_description || p.paragrafos[0] || `${p.title} — oferta no ${p.marketplace.nome}.`;
  return base.length > 155 ? `${base.slice(0, 152).replace(/\s+\S*$/, '')}...` : base;
}

/**
 * Página de um produto.
 * @param {any} p
 * @param {any} ctx
 */
export function paginaProduto(p, ctx) {
  const { site, config } = ctx;
  const migalhas = [
    { nome: 'Início', url: '/' },
    { nome: config.nome, url: config.caminho },
    { nome: p.title, url: p.url },
  ];

  const fotos = [p.imagem, ...p.galeria].filter(Boolean);
  const galeria = fotos.length > 1
    ? `<ul class="produto-galeria" aria-label="Mais fotos">${fotos
        .slice(1)
        .map((f) => `<li>${foto(f, ctx.infoImagem)}</li>`)
        .join('')}</ul>`
    : '';

  const especificacoes = p.especificacoes.length
    ? `
              <h2 class="produto-secao">Características</h2>
              <dl class="produto-specs">${p.especificacoes
                .map((s) => `<div><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`)
                .join('')}</dl>`
    : '';

  const descricao = p.paragrafos.length
    ? `
              <h2 class="produto-secao">Sobre o produto</h2>
              ${p.paragrafos.map((t) => `<p>${esc(t)}</p>`).join('\n              ')}`
    : '';

  const redirecionamento = p.compravel && ctx.demonstracao
    ? 'Demonstração: em produção, este botão leva à oferta na plataforma parceira.'
    : p.compravel
    ? `Ao clicar, você vai para o ${esc(p.marketplace.nome)}. A compra, o pagamento, a entrega e as trocas são feitos lá, conforme as condições da plataforma.`
    : `Este produto ainda não tem oferta disponível na loja.`;

  const corpo = `
      <section class="section loja-produto" aria-labelledby="produto-title">
        <div class="container">
          ${faixaDemonstracao(ctx)}
          ${breadcrumb(migalhas)}
          <div class="loja-produto__grid">
            <div class="loja-produto__fotos">
              ${foto(p.imagem, ctx.infoImagem, { prioridade: true })}
              ${galeria}
            </div>

            <div class="loja-produto__info">
              <div class="produto-card__meta">
                <a class="tag" href="${esc(config.caminho)}?categoria=${esc(p.categoria.id)}#produtos">${esc(p.categoria.nome)}</a>
                <span class="tag tag--plataforma">${esc(p.marketplace.nome)}</span>
              </div>
              <h1 id="produto-title" class="loja-produto__titulo">${esc(p.title)}</h1>
              ${p.short_description ? `<p class="loja-produto__lead">${esc(p.short_description)}</p>` : ''}${blocoPreco(p)}${blocoAvaliacao(p)}
              <div class="loja-produto__acao">
                ${acaoComercial(p, { bloco: false, demonstracao: ctx.demonstracao })}
                <p class="loja-produto__redirecionamento">${redirecionamento}</p>
              </div>
              <p class="loja-aviso">${esc(config.avisoAfiliados)}</p>
              ${especificacoes}${descricao}
              <p><a class="loja-voltar" href="${esc(config.caminho)}#produtos">← Ver todos os produtos</a></p>
            </div>
          </div>
        </div>
      </section>
${faixaEscola()}`;

  const urlProduto = `${site.url}${p.url}`;
  const dados = [
    {
      // WebPage (e não Product): a escola não é a vendedora, e o Google exige
      // oferta/avaliação próprias para marcar Product. Ver IMPLEMENTATION_STATUS.md.
      '@type': 'WebPage',
      '@id': `${urlProduto}#pagina`,
      url: urlProduto,
      name: p.title,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${site.url}/#website` },
      breadcrumb: { '@id': `${urlProduto}#breadcrumb` },
      ...(p.imagem && ctx.infoImagem(p.imagem.src) ? { primaryImageOfPage: `${site.url}${p.imagem.src}` } : {}),
    },
    { ...breadcrumbJsonLd(migalhas, site.url), '@id': `${urlProduto}#breadcrumb` },
  ];

  const info = p.imagem ? ctx.infoImagem(p.imagem.src) : null;
  return documento(
    {
      titulo: `${p.title} | Loja Giovanella`,
      descricao: resumo(p),
      caminho: p.url,
      // Produto sem oferta real não vai para o Google.
      indexavel: !ctx.demonstracao && p.compravel,
      imagemSocial: info
        ? { url: `${site.url}${p.imagem.src}`, alt: p.imagem.alt, width: info.width, height: info.height }
        : undefined,
      dados,
      corpo,
    },
    ctx
  );
}

/* ---------------------------------------------------------------------------
   Destaques na página inicial da escola
   --------------------------------------------------------------------------- */

/**
 * Seção discreta de produtos recomendados para a home. Vazia ('') enquanto
 * não houver produto comprável marcado com is_featured — a home fica
 * exatamente como antes.
 * @param {{ produtos: any[] }} catalogo
 * @param {any} ctx
 */
export function secaoDestaques(catalogo, ctx) {
  const destaques = catalogo.produtos.filter((p) => p.destaque && p.compravel).slice(0, ctx.config.destaquesNaHome);
  if (!destaques.length) return '';
  return `<section class="section loja-destaques" id="loja" aria-labelledby="loja-destaques-title">
        <div class="container">
          <div class="section__header section__header--center">
            <p class="section__eyebrow" data-reveal>Loja</p>
            <h2 id="loja-destaques-title" data-reveal>Produtos recomendados pela escola</h2>
            <p class="section__lead" data-reveal>
              Ferramentas e acessórios para banho, tosa e estética animal, com compra no Mercado Livre
              ou na Shopee.
            </p>
          </div>
          ${faixaDemonstracao(ctx)}
          <div class="grid loja-grid">${destaques.map((p) => cardProduto(p, ctx, { nivel: 3 })).join('')}
          </div>
          <p class="loja-destaques__acoes">
            <a class="btn btn--secondary" href="${esc(ctx.config.caminho)}" data-track="cta_clique" data-track-label="home_loja">Ver todos os produtos</a>
          </p>
          <p class="loja-aviso loja-aviso--centro">${esc(ctx.config.avisoAfiliados)}</p>
        </div>
      </section>`;
}
