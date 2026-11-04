/**
 * ============================================================================
 * CATÁLOGO DE PRODUTOS
 * ----------------------------------------------------------------------------
 * Vazio de propósito: nenhum produto, preço ou link foi inventado. Enquanto
 * estiver vazio, a loja mostra "produtos em breve" e fica FORA do Google
 * (noindex e fora do sitemap).
 *
 * Para adicionar um produto, copie o modelo comentado abaixo para dentro do
 * array PRODUTOS e preencha. Guia completo: AFFILIATE_CONFIGURATION.md.
 *
 * Regras que o build confere (e que o fazem FALHAR se forem quebradas, para
 * que um erro nunca chegue ao ar):
 *   - `id` e `slug` únicos, só com a-z, 0-9 e hífen;
 *   - `category` existente em categorias.js; `marketplace` existente em
 *     config.js;
 *   - `affiliate_url` vazio, um marcador {{LINK_AFILIADO_...}} ou um endereço
 *     HTTPS do domínio do marketplace escolhido;
 *   - imagens dentro de /img/loja/ (fotos baixadas e otimizadas, ver guia).
 *
 * Todo texto é tratado como TEXTO PURO (HTML digitado aqui aparece escrito na
 * página, não é executado).
 * ============================================================================
 */

export const PRODUTOS = [
  /*
  {
    id: 'tesoura-reta-7',                 // identificador interno, único
    slug: 'tesoura-reta-7-polegadas',     // endereço: /loja/tesoura-reta-7-polegadas/
    title: 'Nome do produto como no anúncio',
    short_description: 'Uma frase para o card (até ~140 caracteres).',
    description: 'Texto da página do produto.\n\nLinha em branco = novo parágrafo.',
    category: 'tesouras',                 // id de categorias.js
    marketplace: 'mercado-livre',         // 'mercado-livre' ou 'shopee'
    external_product_id: '',              // ex.: código MLB... do anúncio (opcional)
    affiliate_url: '{{LINK_AFILIADO_MERCADO_LIVRE}}', // troque pelo link do painel de afiliados
    image_url: '/img/loja/tesoura-reta-7.jpg',        // opcional; sem foto aparece um marcador
    image_alt: 'Tesoura reta de 7 polegadas com cabo verde',
    gallery: [],                          // outras fotos, mesmas regras de image_url
    price: null,                          // ex.: 189.9 — só com last_updated
    original_price: null,                 // preço "de", se o anúncio mostrar
    rating: null,                         // ex.: 4.8 — só aparece se o programa permitir
    review_count: null,                   // ex.: 1234
    specifications: [                     // opcional
      { label: 'Tamanho', value: '7 polegadas' },
    ],
    availability_status: 'desconhecido',  // 'disponivel', 'indisponivel' ou 'desconhecido'
    last_updated: '2026-11-04',           // data em que preço/nota foram conferidos
    is_featured: false,                   // true = aparece na página inicial da escola
    is_active: true,                      // false = some da loja sem apagar o cadastro
  },
  */
];
