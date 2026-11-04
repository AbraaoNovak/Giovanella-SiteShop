/**
 * CATÁLOGO FALSO — SOMENTE PARA TESTES AUTOMATIZADOS.
 *
 * Usado por scripts/test-loja.mjs e scripts/test-loja-navegador.mjs via
 * LOJA_PRODUTOS. O plugin recusa essa variável na Vercel, então estes dados
 * nunca chegam ao site publicado. Links "TESTE" não existem nas plataformas.
 *
 * Cobre os casos difíceis: link válido de cada plataforma, marcador pendente,
 * link vazio, produto esgotado, preço vencido, foto ausente, título com HTML
 * malicioso e produto desativado com dados inválidos.
 */
export const PRODUTOS = [
  {
    id: 'teste-maquina',
    slug: 'teste-maquina-de-tosa',
    title: 'TESTE — Máquina de tosa',
    short_description: 'Produto fictício para testes automatizados.',
    description: 'Primeiro parágrafo de teste.\n\nSegundo parágrafo de teste.',
    category: 'maquinas',
    marketplace: 'mercado-livre',
    affiliate_url: 'https://mercadolivre.com/sec/TESTE001',
    image_url: '/img/loja/teste-nao-existe.jpg',
    image_alt: 'Foto que não existe (testa o marcador)',
    price: 100,
    original_price: 120,
    rating: 4.8,
    review_count: 1234,
    specifications: [{ label: 'Voltagem', value: 'Bivolt' }],
    availability_status: 'disponivel',
    last_updated: '2026-11-03',
    is_featured: true,
    is_active: true,
  },
  {
    id: 'teste-tesoura',
    slug: 'teste-tesoura',
    title: 'TESTE — Tesoura',
    short_description: 'Produto fictício da Shopee.',
    category: 'tesouras',
    marketplace: 'shopee',
    affiliate_url: 'https://s.shopee.com.br/TESTE002',
    price: 50,
    last_updated: '2026-09-01', // vencido: o preço não pode aparecer
    is_featured: true,
  },
  {
    id: 'teste-escova',
    slug: 'teste-escova',
    title: 'TESTE — Escova <img src=x data-xss="1"> "aspas" & cia',
    short_description: '<script>window.__xss = 1</script>',
    category: 'escovas',
    marketplace: 'mercado-livre',
    affiliate_url: '{{LINK_AFILIADO_MERCADO_LIVRE}}',
    is_featured: true, // sem link: NÃO pode ir para a home
  },
  {
    id: 'teste-shampoo',
    slug: 'teste-shampoo',
    title: 'TESTE — Shampoo',
    category: 'higiene',
    marketplace: 'shopee',
    affiliate_url: '',
  },
  {
    id: 'teste-esgotado',
    slug: 'teste-esgotado',
    title: 'TESTE — Secador esgotado',
    category: 'maquinas',
    marketplace: 'mercado-livre',
    affiliate_url: 'https://www.mercadolivre.com.br/social/TESTE003',
    availability_status: 'indisponivel',
  },
  {
    // Desativado: ignorado mesmo com dados inválidos.
    id: 'TESTE INVALIDO',
    category: 'nao-existe',
    marketplace: 'nao-existe',
    affiliate_url: 'http://site-falso.example',
    is_active: false,
  },
];
