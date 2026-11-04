/**
 * Filtros da loja (categoria e plataforma).
 *
 * Melhoria progressiva: o HTML já traz todos os produtos. Sem JavaScript, os
 * botões de filtro ficam ocultos (CSS) e a lista completa continua visível.
 *
 * - botões com aria-pressed (leitores de tela anunciam o estado);
 * - contagem atualizada numa região aria-live;
 * - o filtro de categoria vai para a URL (?categoria=...), para que um link
 *   como "/loja/?categoria=tesouras" já abra filtrado. O valor da URL só é
 *   aceito se existir entre os botões — nada vindo da URL entra no HTML.
 */

export function initLojaFiltros() {
  const raiz = document.querySelector('[data-loja]');
  const barra = raiz && raiz.querySelector('[data-loja-filtros]');
  if (!raiz || !barra) return;

  const produtos = Array.from(raiz.querySelectorAll('[data-loja-produto]'));
  const botoes = Array.from(barra.querySelectorAll('[data-filtro]'));
  const contagem = raiz.querySelector('[data-loja-contagem]');
  const vazio = raiz.querySelector('[data-loja-vazio]');
  const limpar = raiz.querySelector('[data-loja-limpar]');

  /** Filtro ativo por tipo ('' = todos). */
  const ativo = { categoria: '', marketplace: '' };

  /** Só valores que existem como botão são aceitos (ex.: vindos da URL). */
  const valoresValidos = (tipo) =>
    botoes.filter((b) => b.getAttribute('data-filtro') === tipo).map((b) => b.getAttribute('data-valor'));

  function aplicar({ atualizarUrl = true } = {}) {
    let visiveis = 0;
    produtos.forEach((card) => {
      const passa =
        (!ativo.categoria || card.getAttribute('data-categoria') === ativo.categoria) &&
        (!ativo.marketplace || card.getAttribute('data-marketplace') === ativo.marketplace);
      card.hidden = !passa;
      if (passa) visiveis += 1;
    });

    botoes.forEach((b) => {
      const tipo = b.getAttribute('data-filtro');
      b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === ativo[tipo]));
    });

    if (contagem) contagem.textContent = `${visiveis} ${visiveis === 1 ? 'produto' : 'produtos'}`;
    if (vazio) vazio.hidden = visiveis > 0;

    if (atualizarUrl && window.history && window.history.replaceState) {
      const url = new URL(window.location.href);
      if (ativo.categoria) url.searchParams.set('categoria', ativo.categoria);
      else url.searchParams.delete('categoria');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }

  barra.addEventListener('click', (event) => {
    const botao = event.target instanceof Element ? event.target.closest('[data-filtro]') : null;
    if (!botao) return;
    ativo[botao.getAttribute('data-filtro')] = botao.getAttribute('data-valor') || '';
    aplicar();
  });

  if (limpar) {
    limpar.addEventListener('click', () => {
      ativo.categoria = '';
      ativo.marketplace = '';
      aplicar();
    });
  }

  // Categoria pedida na URL (links da página de produto e da home).
  const pedida = new URLSearchParams(window.location.search).get('categoria');
  if (pedida && valoresValidos('categoria').includes(pedida)) ativo.categoria = pedida;
  aplicar({ atualizarUrl: false });
}
