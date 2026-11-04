/**
 * ============================================================================
 * HTML SEGURO + LAYOUT COMPARTILHADO
 * ----------------------------------------------------------------------------
 * 1. Escape: todo dado do catálogo passa por `esc()` antes de entrar no HTML.
 *    Um título como `<script>` aparece escrito na página, nunca é executado.
 *
 * 2. Layout: o cabeçalho, o menu mobile, o rodapé, o botão de WhatsApp e o
 *    aviso de privacidade das páginas da loja são COPIADOS do index.html no
 *    build — não reescritos. Assim existe uma única versão de cada um: mudou
 *    o menu do site, a loja acompanha no próximo build.
 *    O mesmo vale para os scripts do <head>: cópia exata, byte a byte, para
 *    que os hashes já autorizados na CSP (vercel.json) continuem valendo.
 * ============================================================================
 */

/**
 * Escapa texto para conteúdo E atributos HTML (entre aspas duplas).
 * @param {unknown} valor
 * @returns {string}
 */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Serializa JSON-LD para dentro de <script type="application/ld+json">.
 * `<` vira <: um texto com "</script>" não consegue fechar a tag.
 * @param {unknown} dados
 */
export function jsonLd(dados) {
  return JSON.stringify(dados, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Recorta um elemento inteiro (com filhos) a partir da posição da sua tag de
 * abertura, contando aberturas e fechamentos da mesma tag.
 *
 * @param {string} html
 * @param {RegExp} abertura  Expressão que encontra a tag de abertura.
 * @param {string} tag       Nome da tag (div, header, footer...).
 * @param {string} nome      Nome amigável, para a mensagem de erro.
 */
function recortarElemento(html, abertura, tag, nome) {
  const achado = abertura.exec(html);
  if (!achado) {
    throw new Error(`[loja] não encontrei ${nome} no index.html (${abertura}). O layout da loja é copiado de lá.`);
  }
  const inicio = achado.index;
  const marcador = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g');
  marcador.lastIndex = inicio;
  let profundidade = 0;
  let m;
  while ((m = marcador.exec(html))) {
    profundidade += m[0].startsWith('</') ? -1 : 1;
    if (profundidade === 0) return html.slice(inicio, marcador.lastIndex);
  }
  throw new Error(`[loja] ${nome} sem fechamento </${tag}> no index.html.`);
}

/**
 * Adapta um trecho da página inicial para ser usado em outra página:
 * - âncoras internas (#cursos) passam a apontar para a home (/#cursos);
 * - `data-nav-link` sai (o destaque de seção ativa só faz sentido na home, e
 *   o header.js usaria o href como seletor CSS);
 * - o link da loja ganha aria-current="page".
 * @param {string} trecho
 * @param {string} caminhoLoja
 */
function adaptarParaOutraPagina(trecho, caminhoLoja) {
  return trecho
    .replace(/href="#inicio"/g, 'href="/"')
    .replace(/href="#([a-z0-9-]+)"/g, 'href="/#$1"')
    .replace(/\sdata-nav-link(?=[\s>])/g, '')
    .replace(/\sfetchpriority="high"/g, '')
    .replace('ir para o início', 'ir para a página inicial')
    .replace(new RegExp(`href="${caminhoLoja}"`, 'g'), `href="${caminhoLoja}" aria-current="page"`);
}

/**
 * Extrai do index.html as partes de layout reutilizadas pela loja.
 *
 * @param {string} indexHtml  Conteúdo do index.html.
 * @param {{ caminho: string, avisoAfiliados: string }} config
 */
export function extrairLayout(indexHtml, config) {
  // Scripts do <head>: do primeiro <script> sem atributos até o fim do
  // <script nomodule>. Copiados sem nenhuma alteração (hash da CSP).
  const inicioScripts = indexHtml.indexOf('<script>');
  const nomodule = indexHtml.indexOf('<script nomodule>', inicioScripts);
  const fimScripts = indexHtml.indexOf('</script>', nomodule);
  if (inicioScripts < 0 || nomodule < 0 || fimScripts < 0) {
    throw new Error('[loja] não encontrei os scripts do <head> no index.html.');
  }
  const scripts = indexHtml.slice(inicioScripts, fimScripts + '</script>'.length);

  const header = recortarElemento(indexHtml, /<header class="header"/, 'header', 'o <header>');
  const menu = recortarElemento(indexHtml, /<div class="mobile-menu"/, 'div', 'o menu mobile');
  let footer = recortarElemento(indexHtml, /<footer class="footer"/, 'footer', 'o <footer>');
  const whatsapp = recortarElemento(indexHtml, /<a\s+class="wa-float"/, 'a', 'o botão flutuante de WhatsApp');
  const consentimento = recortarElemento(indexHtml, /<aside class="consent"/, 'aside', 'o aviso de privacidade');

  // Aviso de afiliados no rodapé da loja, antes da linha de copyright.
  const aviso = `<p class="footer__afiliados">${esc(config.avisoAfiliados)}</p>\n\n        `;
  footer = footer.replace('<div class="footer__bottom">', `${aviso}<div class="footer__bottom">`);

  const caminho = config.caminho;
  return {
    scripts,
    header: adaptarParaOutraPagina(header, caminho),
    menu: adaptarParaOutraPagina(menu, caminho),
    footer: adaptarParaOutraPagina(footer, caminho),
    whatsapp,
    consentimento,
  };
}
