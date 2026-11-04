/**
 * ============================================================================
 * CONFIGURAÇÃO DA LOJA (vitrine de afiliados)
 * ----------------------------------------------------------------------------
 * A loja NÃO vende nada: cada produto leva o visitante para a oferta no
 * Mercado Livre ou na Shopee, por um link de afiliado da escola. Pagamento,
 * estoque, entrega e troca são da plataforma parceira.
 *
 * Este arquivo define as REGRAS da loja (marketplaces aceitos, domínios
 * permitidos, textos de transparência). Os produtos ficam em produtos.js e
 * as categorias em categorias.js. Passo a passo: AFFILIATE_CONFIGURATION.md.
 *
 * Tudo aqui é usado no BUILD (Node), não no navegador: as páginas da loja
 * são HTML estático gerado a partir destes dados (melhor para SEO e para
 * funcionar sem JavaScript).
 * ============================================================================
 */

export const LOJA = {
  /** Caminho público da loja dentro do site. */
  caminho: '/loja/',

  /** Nome exibido no menu, no título das páginas e nos breadcrumbs. */
  nome: 'Loja',

  /**
   * Preços dos marketplaces mudam com frequência. Um preço consultado há mais
   * dias do que isto deixa de ser exibido (o botão continua funcionando).
   * A conta é feita no momento do build.
   */
  precoValidadeDias: 7,

  /** Quantos produtos em destaque aparecem na página inicial da escola. */
  destaquesNaHome: 4,

  /** Aviso de transparência exibido no rodapé e nas páginas da loja. */
  avisoAfiliados:
    'Este site pode receber comissões por compras realizadas por meio de links de afiliados. ' +
    'A compra é concluída diretamente na plataforma parceira, conforme suas condições comerciais.',
};

/**
 * Marketplaces aceitos.
 *
 * `dominios`: o link de afiliado só é aceito se o endereço for HTTPS e o
 * domínio for exatamente um destes ou um subdomínio deles. É isso que impede
 * que um erro de digitação (ou um link adulterado) leve o visitante para um
 * site falso. Confirme com o primeiro link real gerado no painel de cada
 * programa — ver AFFILIATE_CONFIGURATION.md, seção "Domínios aceitos".
 *
 * `exibirAvaliacoes`: notas e número de avaliações só aparecem depois que a
 * escola confirmar, nos termos do programa, que pode reproduzi-las.
 */
export const MARKETPLACES = {
  'mercado-livre': {
    nome: 'Mercado Livre',
    // Links do gerador de afiliados: mercadolivre.com/sec/... ou
    // mercadolivre.com.br/social/... (e páginas de produto do próprio site).
    dominios: ['mercadolivre.com', 'mercadolivre.com.br'],
    // Programa de afiliados: AGUARDANDO_CADASTRO (ver IMPLEMENTATION_STATUS.md).
    exibirAvaliacoes: false,
  },
  shopee: {
    nome: 'Shopee',
    // Links curtos do painel de afiliados: s.shopee.com.br/... ou shope.ee/...
    dominios: ['shopee.com.br', 'shope.ee'],
    // Programa de afiliados: AGUARDANDO_CADASTRO (ver IMPLEMENTATION_STATUS.md).
    exibirAvaliacoes: false,
  },
};
