/**
 * ============================================================================
 * CATÁLOGO — validação e normalização dos produtos
 * ----------------------------------------------------------------------------
 * Funções puras (sem acesso a arquivos nem ao DOM): recebem os dados de
 * produtos.js / categorias.js / config.js e devolvem uma versão segura e
 * completa, pronta para virar HTML. Testadas em scripts/test-loja.mjs.
 *
 * Problemas são separados em dois níveis:
 *   - `erros`: dado que poderia levar o visitante a um lugar errado ou quebrar
 *     a página (link de outro domínio, categoria inexistente, slug repetido).
 *     O build FALHA — o site publicado continua sendo a versão anterior.
 *   - `avisos`: dado incompleto, tratado com segurança (preço sem data é
 *     escondido, foto ausente vira marcador). O build segue e avisa no terminal.
 * ============================================================================
 */

/** Marcador de link ainda não fornecido, ex.: {{LINK_AFILIADO_MERCADO_LIVRE}}. */
const MARCADOR = /^\{\{\s*LINK_AFILIADO_[A-Z0-9_]+\s*\}\}$/;

/** id, slug e ids de categoria: minúsculas, números e hífen. */
const IDENTIFICADOR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Fotos da loja: sempre arquivos do próprio site, dentro de /img/loja/. */
const CAMINHO_IMAGEM = /^\/img\/loja\/[a-z0-9][a-z0-9_-]*(?:\/[a-z0-9][a-z0-9_-]*)*\.(?:jpe?g|png|webp)$/;

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const DISPONIBILIDADES = ['disponivel', 'indisponivel', 'desconhecido'];

const LIMITES = { title: 140, short_description: 200, description: 4000 };

/**
 * Valida um link de afiliado para o marketplace informado.
 *
 * Nunca "conserta" um link: ou ele é exatamente aceitável, ou é recusado.
 * Isso evita redirecionamento aberto (open redirect) e links adulterados.
 *
 * @param {unknown} valor
 * @param {{ dominios: string[] }} marketplace
 * @returns {{ estado: 'vazio'|'pendente'|'valido'|'invalido', url?: string, motivo?: string }}
 */
export function validarLinkAfiliado(valor, marketplace) {
  if (valor == null) return { estado: 'vazio' };
  if (typeof valor !== 'string') return { estado: 'invalido', motivo: 'o link precisa ser um texto' };

  const texto = valor.trim();
  if (texto === '') return { estado: 'vazio' };
  if (MARCADOR.test(texto)) return { estado: 'pendente' };
  if (texto.includes('{{') || texto.includes('}}')) {
    return { estado: 'invalido', motivo: 'marcador malformado (use {{LINK_AFILIADO_NOME}})' };
  }
  if (texto.length > 2048) return { estado: 'invalido', motivo: 'link longo demais' };
  // Espaços e caracteres de controle no meio indicam colagem errada.
  if (/[\s\u0000-\u001f\u007f]/.test(texto)) {
    return { estado: 'invalido', motivo: 'o link contém espaços ou caracteres invisíveis' };
  }

  let url;
  try {
    url = new URL(texto);
  } catch {
    return { estado: 'invalido', motivo: 'não é um endereço válido' };
  }

  if (url.protocol !== 'https:') return { estado: 'invalido', motivo: 'o link precisa começar com https://' };
  if (url.username || url.password) return { estado: 'invalido', motivo: 'o link não pode conter usuário ou senha' };
  if (url.port) return { estado: 'invalido', motivo: 'o link não pode indicar porta' };

  const host = url.hostname.toLowerCase();
  const permitido = marketplace.dominios.some((d) => host === d || host.endsWith(`.${d}`));
  if (!permitido) {
    return {
      estado: 'invalido',
      motivo: `o domínio "${host}" não é aceito para este marketplace (aceitos: ${marketplace.dominios.join(', ')})`,
    };
  }

  return { estado: 'valido', url: url.href };
}

/**
 * Valida o caminho de uma foto da loja.
 * @param {unknown} valor
 * @returns {{ ok: boolean, caminho?: string, motivo?: string }}
 */
export function validarImagem(valor) {
  if (valor == null || valor === '') return { ok: false };
  if (typeof valor !== 'string' || !CAMINHO_IMAGEM.test(valor.trim())) {
    return {
      ok: false,
      motivo: `imagem "${String(valor)}" fora do padrão — use /img/loja/nome-do-arquivo.jpg (minúsculas, sem espaços)`,
    };
  }
  return { ok: true, caminho: valor.trim() };
}

/**
 * Texto livre: remove caracteres de controle e espaços repetidos.
 * O escape para HTML é feito depois, na renderização.
 * @param {unknown} valor
 * @param {boolean} [manterParagrafos]
 */
function limparTexto(valor, manterParagrafos = false) {
  if (valor == null) return '';
  let texto = String(valor).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
  texto = manterParagrafos ? texto.replace(/[ \t]+/g, ' ') : texto.replace(/\s+/g, ' ');
  return texto.trim();
}

/** Número positivo finito, ou null. */
function numeroPositivo(valor) {
  return typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : null;
}

/**
 * Data 'AAAA-MM-DD' válida → Date (UTC). Inválida → null.
 * @param {unknown} valor
 */
export function lerData(valor) {
  if (typeof valor !== 'string' || !DATA_ISO.test(valor)) return null;
  const data = new Date(`${valor}T00:00:00Z`);
  // Recusa datas impossíveis (ex.: 2026-02-31 vira 03/03 no JS).
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor ? data : null;
}

/** Dias inteiros entre duas datas (b - a). */
function diasEntre(a, b) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

/** 189.9 → "R$ 189,90" no padrão brasileiro. */
export function formatarPreco(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

/** Date → "04/11/2026". */
export function formatarData(data) {
  return data.toISOString().slice(0, 10).split('-').reverse().join('/');
}

/**
 * Normaliza um produto. Devolve null quando o cadastro é inutilizável.
 *
 * @param {Record<string, any>} bruto
 * @param {{ categorias: Map<string, {id:string,nome:string}>, marketplaces: Record<string, any>,
 *           config: Record<string, any>, hoje: Date }} ctx
 * @param {string[]} erros
 * @param {string[]} avisos
 */
function normalizarProduto(bruto, ctx, erros, avisos) {
  if (!bruto || typeof bruto !== 'object') {
    erros.push('item do catálogo que não é um produto (verifique vírgulas e chaves em produtos.js)');
    return null;
  }

  const ref = `produto "${typeof bruto.id === 'string' && bruto.id ? bruto.id : '(sem id)'}"`;
  const erro = (msg) => erros.push(`${ref}: ${msg}`);
  const aviso = (msg) => avisos.push(`${ref}: ${msg}`);
  const inicioErros = erros.length;

  if (typeof bruto.id !== 'string' || !IDENTIFICADOR.test(bruto.id)) erro('id ausente ou fora do padrão (a-z, 0-9, hífen)');
  if (typeof bruto.slug !== 'string' || !IDENTIFICADOR.test(bruto.slug)) erro('slug ausente ou fora do padrão (a-z, 0-9, hífen)');

  const title = limparTexto(bruto.title);
  if (!title) erro('title (nome do produto) é obrigatório');
  else if (title.length > LIMITES.title) aviso(`title com mais de ${LIMITES.title} caracteres pode ser cortado no Google`);

  const categoria = ctx.categorias.get(bruto.category);
  if (!categoria) erro(`category "${bruto.category}" não existe em categorias.js`);

  const marketplace = Object.prototype.hasOwnProperty.call(ctx.marketplaces, bruto.marketplace)
    ? ctx.marketplaces[bruto.marketplace]
    : null;
  if (!marketplace) erro(`marketplace "${bruto.marketplace}" não existe (use: ${Object.keys(ctx.marketplaces).join(', ')})`);

  let link = { estado: 'vazio' };
  if (marketplace) {
    link = validarLinkAfiliado(bruto.affiliate_url, marketplace);
    if (link.estado === 'invalido') erro(`affiliate_url recusado — ${link.motivo}`);
  }

  if (erros.length > inicioErros) return null;

  const short = limparTexto(bruto.short_description);
  if (short.length > LIMITES.short_description) aviso(`short_description com mais de ${LIMITES.short_description} caracteres`);

  const descricao = limparTexto(bruto.description, true).slice(0, LIMITES.description);
  const paragrafos = descricao.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // --- Fotos ---------------------------------------------------------------
  let imagem = null;
  const principal = validarImagem(bruto.image_url);
  if (principal.ok) {
    const alt = limparTexto(bruto.image_alt);
    if (!alt) aviso('image_alt vazio — descreva a foto (acessibilidade); usando o nome do produto');
    imagem = { src: principal.caminho, alt: alt || title };
  } else if (principal.motivo) {
    aviso(`${principal.motivo}; exibindo o marcador de foto`);
  }

  const galeria = [];
  for (const item of Array.isArray(bruto.gallery) ? bruto.gallery : []) {
    const caminho = typeof item === 'string' ? item : item && item.src;
    const foto = validarImagem(caminho);
    if (foto.ok) galeria.push({ src: foto.caminho, alt: limparTexto(item && item.alt) || title });
    else if (foto.motivo) aviso(`galeria: ${foto.motivo}`);
  }

  // --- Data de conferência, preço e avaliação -------------------------------
  const ultimaAtualizacao = lerData(bruto.last_updated);
  if (bruto.last_updated && !ultimaAtualizacao) aviso(`last_updated "${bruto.last_updated}" inválido (use AAAA-MM-DD)`);
  if (ultimaAtualizacao && ultimaAtualizacao > ctx.hoje) aviso('last_updated no futuro — preço e nota ocultados');
  const dataConfiavel = ultimaAtualizacao && ultimaAtualizacao <= ctx.hoje ? ultimaAtualizacao : null;

  let preco = null;
  const valor = numeroPositivo(bruto.price);
  if (bruto.price != null && valor === null) aviso('price precisa ser um número (ex.: 189.9)');
  if (valor !== null) {
    if (!dataConfiavel) {
      aviso('price sem last_updated válido — preço ocultado (preço sem data parece garantido)');
    } else if (diasEntre(dataConfiavel, ctx.hoje) > ctx.config.precoValidadeDias) {
      aviso(`preço conferido há mais de ${ctx.config.precoValidadeDias} dias — ocultado até ser atualizado`);
    } else {
      const original = numeroPositivo(bruto.original_price);
      preco = { valor, original: original !== null && original > valor ? original : null, consultadoEm: dataConfiavel };
    }
  }

  let avaliacao = null;
  const nota = typeof bruto.rating === 'number' && bruto.rating >= 0 && bruto.rating <= 5 ? bruto.rating : null;
  const total = Number.isInteger(bruto.review_count) && bruto.review_count > 0 ? bruto.review_count : null;
  if (nota !== null && total !== null && dataConfiavel && marketplace.exibirAvaliacoes) {
    avaliacao = { nota, total, consultadoEm: dataConfiavel };
  }

  // --- Especificações --------------------------------------------------------
  const especificacoes = (Array.isArray(bruto.specifications) ? bruto.specifications : [])
    .map((s) => ({ label: limparTexto(s && s.label), value: limparTexto(s && s.value) }))
    .filter((s) => s.label && s.value);

  const disponibilidade = DISPONIBILIDADES.includes(bruto.availability_status) ? bruto.availability_status : 'desconhecido';
  if (bruto.availability_status && disponibilidade !== bruto.availability_status) {
    aviso(`availability_status "${bruto.availability_status}" desconhecido — usando "desconhecido"`);
  }

  if (link.estado !== 'valido') aviso('sem link de afiliado ainda — aparece como "Oferta em breve" e fica fora do Google');

  return {
    id: bruto.id,
    slug: bruto.slug,
    url: `${ctx.config.caminho}${bruto.slug}/`,
    title,
    short_description: short,
    paragrafos,
    categoria,
    marketplace: { id: bruto.marketplace, ...marketplace },
    external_product_id: limparTexto(bruto.external_product_id),
    link,
    imagem,
    galeria,
    preco,
    avaliacao,
    especificacoes,
    disponibilidade,
    ultimaAtualizacao: dataConfiavel,
    destaque: bruto.is_featured === true,
    // "Comprável" = tem link de afiliado válido e não está marcado como esgotado.
    // Só produtos compráveis ganham botão de oferta e entram no Google.
    compravel: link.estado === 'valido' && disponibilidade !== 'indisponivel',
  };
}

/**
 * Monta o catálogo completo a partir dos dados brutos.
 *
 * @param {{ produtos: any[], categorias: {id:string,nome:string}[], marketplaces: Record<string, any>,
 *           config: Record<string, any>, hoje?: Date }} dados
 * @returns {{ produtos: any[], categorias: any[], erros: string[], avisos: string[] }}
 */
export function montarCatalogo({ produtos, categorias, marketplaces, config, hoje = new Date() }) {
  const erros = [];
  const avisos = [];

  // Datas do catálogo são dias (sem hora): compara pelo início do dia em UTC.
  const hojeDia = new Date(`${hoje.toISOString().slice(0, 10)}T00:00:00Z`);

  const mapaCategorias = new Map();
  for (const c of Array.isArray(categorias) ? categorias : []) {
    if (!c || typeof c.id !== 'string' || !IDENTIFICADOR.test(c.id) || !limparTexto(c.nome)) {
      erros.push(`categoria inválida em categorias.js: ${JSON.stringify(c)}`);
      continue;
    }
    if (mapaCategorias.has(c.id)) erros.push(`categoria "${c.id}" repetida em categorias.js`);
    mapaCategorias.set(c.id, { id: c.id, nome: limparTexto(c.nome) });
  }

  if (!Array.isArray(produtos)) {
    erros.push('produtos.js precisa exportar PRODUTOS como uma lista ([ ... ])');
    return { produtos: [], categorias: [], erros, avisos };
  }

  const ctx = { categorias: mapaCategorias, marketplaces, config, hoje: hojeDia };
  const ids = new Set();
  const slugs = new Set();
  const lista = [];

  for (const bruto of produtos) {
    // Produto desativado: ignorado por completo (nem validado), para que
    // um cadastro antigo e incompleto não trave o build.
    if (bruto && bruto.is_active === false) continue;

    const produto = normalizarProduto(bruto, ctx, erros, avisos);
    if (!produto) continue;

    if (ids.has(produto.id)) erros.push(`id "${produto.id}" repetido`);
    if (slugs.has(produto.slug)) erros.push(`slug "${produto.slug}" repetido (dois produtos no mesmo endereço)`);
    ids.add(produto.id);
    slugs.add(produto.slug);
    lista.push(produto);
  }

  // Categorias na ordem de categorias.js, só as que têm produto.
  const usadas = [...mapaCategorias.values()]
    .map((c) => ({ ...c, total: lista.filter((p) => p.categoria.id === c.id).length }))
    .filter((c) => c.total > 0);

  return { produtos: lista, categorias: usadas, erros, avisos };
}
