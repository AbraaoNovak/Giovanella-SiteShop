# Status da implementação — Loja de afiliados

Atualizado em **4 de novembro de 2026**.

Legenda: **Implementado** (feito e testado) · **Pendente** (depende de
alguém) · **Simulado** (só existe com dados de teste).

---

## 1. Diagnóstico

### Repositório novo (`Giovanella-SiteShop`)

- Cópia completa do site institucional em produção, em **HTML + CSS + JS
  puro com Vite 6**. Não há framework de UI, TypeScript, banco nem backend.
- O upload inicial pelo GitHub tinha ficado incompleto (21 arquivos de
  fora, incluindo `.gitignore`, `sitemap.xml` e imagens). Foi completado no
  commit "Base do projeto: site atual completo, antes da loja".
- Hospedagem prevista: **Vercel** (`vercel.json` com CSP estrita, cabeçalhos
  de segurança e redirecionamentos do Wix). Domínio definitivo no código:
  `https://www.escolabanhoetosarosigiovanella.com.br`.

### Identidade visual

Levantada no código e no site. A cor `#294908` foi **confirmada**. O
detalhamento está em [docs/IDENTIDADE_VISUAL_LOJA.md](docs/IDENTIDADE_VISUAL_LOJA.md).

### Decisão de arquitetura

| Opção | Avaliação |
| --- | --- |
| **B — rota `/loja/` no mesmo site** ✅ | Este repositório já contém o site inteiro: a loja usa o mesmo cabeçalho, CSS, domínio e deploy. Herda a autoridade do domínio da escola, sem configuração de DNS nem subdomínio. **Escolhida.** |
| A — subdomínio `shop.` | Exigiria segundo projeto, DNS e cabeçalho duplicado, e dividiria a autoridade de SEO. Sem vantagem para um catálogo estático |

- **Mantida a stack existente** (regras 1 e 2 do briefing). React/TypeScript
  só seriam propostos para um repositório vazio. Aqui, trocar de tecnologia
  significaria reescrever o site institucional.
- **Sem backend e sem banco** (regra 8): catálogo manual em
  `src/loja/produtos.js`, validado e transformado em **HTML estático no
  build**. As páginas carregam rápido, são indexáveis e funcionam sem
  JavaScript.
- O repositório original (`Giovanella-Petshop`) **não foi alterado**.

## 2. O que foi implementado

| Item | Status | Onde |
| --- | --- | --- |
| Página `/loja/` (topo, produtos, filtros, "Como funciona", faixa da escola) | Implementado | `src/loja/paginas.js` |
| Página por produto `/loja/<slug>/` (fotos, descrição, características, oferta, aviso de redirecionamento) | Implementado | `src/loja/paginas.js` |
| Catálogo centralizado com os 20 campos pedidos | Implementado | `src/loja/produtos.js` |
| Validação de links (só HTTPS e domínios oficiais por plataforma), fotos, preços e datas | Implementado | `src/loja/catalogo.js` |
| Marcadores `{{LINK_AFILIADO_MERCADO_LIVRE}}` / `{{LINK_AFILIADO_SHOPEE}}` | Implementado | tratados como "aguardando link" |
| Botão de oferta com `rel="sponsored nofollow noopener noreferrer"` | Implementado | só para produtos com link válido |
| "Oferta em breve" / "Indisponível no momento" sem link falso | Implementado | |
| Filtros por categoria e por plataforma, com `?categoria=` na URL | Implementado | `src/js/modules/loja-filtros.js` |
| Estado vazio "Produtos em breve" | Implementado | é o estado atual |
| Preço só com data de consulta; oculto após 7 dias | Implementado | `config.js → precoValidadeDias` |
| Notas e avaliações só quando autorizadas | Implementado (desligado) | `config.js → exibirAvaliacoes` |
| Item "Loja" no menu (desktop, celular, rodapé) | Implementado | `index.html` |
| Seção discreta de destaques na home | Implementado (aparece só com produto destacado e comprável) | marcador `<!-- loja:destaques -->` |
| Cabeçalho/rodapé da loja copiados da home no build (sem duplicação) | Implementado | `src/loja/html.js` |
| Aviso de afiliação (rodapé, "Como funciona", produto, destaques) | Implementado | `config.js → avisoAfiliados` |
| Política de Privacidade: seção "Loja e links de afiliados" | Implementado | `privacidade.html`, seção 6 |
| SEO: title/description únicos, canonical, Open Graph, Twitter Card, breadcrumbs, JSON-LD (`CollectionPage`, `BreadcrumbList`, `ItemList`, `WebPage`) | Implementado | |
| `noindex` automático para loja vazia e produtos sem oferta | Implementado | |
| Sitemap: páginas da loja acrescentadas só quando têm oferta | Implementado | `vite-plugin-loja.js` |
| Fotos de produto: `fotos/loja/` → `npm run fotos` → WebP + JPEG | Implementado | `scripts/otimizar-fotos.mjs` |
| Redirecionamento `/shop` → `/loja/` | Implementado | `vercel.json` |
| Integração por API dos programas | **Pendente** | depende de aprovação e credenciais (seção 4) |
| Produtos reais | **Pendente** | depende do cadastro nos programas |
| Modo demonstração: 12 produtos fictícios no `vercel.app`, com faixa de aviso, botões sem link, `noindex` e trava contra o domínio oficial | **Simulado** (ligado) | `config.js → demonstracao`, `produtos-demonstracao.js` |
| Produtos com links e preços | **Simulado** | só em `scripts/fixtures/produtos-exemplo.js`, usado nos testes. O plugin recusa esse arquivo na Vercel |

### Decisões que merecem registro

- **Sem `Product`, `Offer` nem `AggregateRating` no Schema.org.** A escola
  não vende os produtos, e o Google exige oferta ou avaliação **próprias**
  para marcar `Product`. Marcar notas da plataforma como se fossem do site
  viola as diretrizes. As páginas usam `WebPage` + `BreadcrumbList`.
- **Sem cores nem logos das plataformas**: evita visual de marketplace e uso
  de marca sem autorização.
- **Fotos só do próprio site** (`/img/loja/`): a CSP continua igual, nenhuma
  requisição a terceiros ao abrir a página e nenhum hotlink das plataformas.
- **Erro no catálogo interrompe o build**: um link adulterado ou digitado
  errado nunca chega ao ar. O site publicado fica na versão anterior.
- **Menu em 1024–1099px**: o item "Loja" passava 33px da largura. Só nessa
  faixa, os links do menu ficaram um pouco mais próximos (`loja.css`).

## 3. Relatório de testes

Executados em 4 de novembro de 2026, no Windows 11, com Edge 156, Chrome 156
e Brave (Chromium 156).

| Teste | Comando | Resultado |
| --- | --- | --- |
| Unitários (site + loja) | `npm test` | **124/124** (81 da loja) |
| Loja em navegadores reais, com CSP de produção | `npm run test:loja` | **140/140** (3 navegadores) |
| Site institucional em navegadores (8 cenários × 3) | `npm run test:navegadores` | **24/24** — nada regrediu |
| Auditoria de segurança do build (agora com as páginas da loja) | `npm run test:seguranca` | **41/41** |
| Dependências | `npm audit` | **0 vulnerabilidades** |
| Build de produção | `npm run build` | OK |
| Sintaxe dos módulos novos | `node --check` | OK |

Cobertura dos 20 itens do briefing:

| # | Item | Como foi verificado |
| --- | --- | --- |
| 1 | Build de produção | `npm run build` |
| 2 | TypeScript | **Não se aplica**: o projeto é JS puro (stack mantida). Equivalente: validação de tipos e campos do catálogo em `catalogo.js`, coberta pelos testes |
| 3 | Lint | **Não se aplica**: o projeto não tem linter configurado. Feito `node --check` + testes |
| 4–5 | Navegação entre páginas e mobile | `test:loja`: menu no celular de 360px, breadcrumbs, voltar à loja |
| 6–7 | Links internos e externos | `test:loja`: âncoras da home a partir da loja, ofertas só para domínios permitidos |
| 8 | Links de afiliado | 22 casos aceitos/recusados (`test-loja.mjs`), incluindo domínio parecido, `@`, barra invertida, porta, `javascript:` e plataforma trocada |
| 9 | Produtos sem URL | "Oferta em breve", sem `<a>`, `noindex` |
| 10 | Imagens ausentes | foto inexistente vira o marcador "Foto em breve" |
| 11 | Estados vazios | loja sem produtos; filtros sem resultado ("Mostrar todos") |
| 12–15 | Metadados, canonical, sitemap, robots | testes de página + sitemap do build de teste e do real |
| 16 | Acessibilidade | Lighthouse **100** (`/loja/` vazia, com produtos e página de produto); `aria-pressed`, `aria-live`, foco visível do site, alvos de 44–48px |
| 17 | Performance | Lighthouse celular: **98–99** |
| 18 | Responsividade | 360, 390, 1024 e 1280px sem rolagem horizontal; capturas revisadas |
| 19 | Segurança de URLs | sem redirecionamento aberto (nenhum destino vem do navegador); `?categoria=<script>` ignorado; tentativa de XSS no catálogo exibida como texto |
| 20 | Dependências | `npm audit`; **nenhuma dependência nova** |

Lighthouse local (celular, servidor com compressão):

| Página | Desempenho | Acessibilidade | Boas práticas | SEO |
| --- | --- | --- | --- | --- |
| `/loja/` vazia (estado atual) | 99 | 100 | 82* | 69** |
| `/loja/` com produtos (exemplo) | 98 | 100 | 82* | 100 |
| Página de produto (exemplo) | 99 | 100 | 82* | 100 |

\* 82 apenas por ser HTTP local (na Vercel é HTTPS), o mesmo resultado da
home.
\*\* 69 de propósito: loja vazia fica com `noindex` até existir oferta real.

## 4. Pendências que dependem da cliente

0. **Desligar o modo demonstração** (`demonstracao: false` em `src/loja/config.js`) ao
   cadastrar os produtos reais. Se esquecer, o build no domínio oficial é
   recusado (trava automática).
1. **Cadastro e aprovação** no Programa de Afiliados do Mercado Livre e da
   Shopee (status: `AGUARDANDO_CADASTRO`).
2. **Primeiros produtos**: lista, links gerados no painel e fotos.
3. **Termos dos programas**: confirmar se fotos, notas e número de avaliações
   dos anúncios podem ser reproduzidos (hoje: notas desligadas e fotos só
   próprias/autorizadas).
4. **Domínios dos links**: conferir o primeiro link real de cada programa
   contra a lista de `config.js` (seção 6 do guia).
5. **Categorias**: as 6 atuais são sugestões do briefing; ajustar à
   estratégia da escola.
6. **Nome no menu**: "Loja" (em português, como o resto do site). Trocar para
   "Shop" é uma linha em `config.js` e três em `index.html`.
7. **Revisão jurídica** do texto de afiliação e da seção 6 da Política de
   Privacidade (nenhum documento afirma conformidade legal).
8. **API dos programas** (opcional, futuro): só após aprovação e
   credenciais, pela documentação oficial. Nada de raspagem de páginas.

## 5. Problemas preexistentes (não relacionados à loja, NÃO corrigidos)

Registrados conforme o briefing, sem alteração por falta de autorização:

- **Botão "Fale conosco" do cabeçalho quebra em duas linhas entre 1024 e
  ~1060px.** Já acontecia antes da loja (medido: 127px de largura com e sem
  o item "Loja").
- **Logo do cabeçalho só em PNG** (o Lighthouse sugere WebP, cerca de 12 KiB).

## 6. Publicação e rollback

Nada foi publicado. A publicação depende de uma ação na Vercel, que é da
cliente/responsável:

**Recomendado — revisar antes, depois trocar:**

1. Na Vercel, **Add New → Project → importar `Giovanella-SiteShop`**. O
   endereço `*.vercel.app` gerado serve para revisão: ele já sai com
   `noindex` (vercel.json), sem risco de SEO.
2. Aprovado, mover o domínio para este projeto (**Settings → Domains**) ou,
   no projeto atual, trocar o repositório conectado (**Settings → Git →
   Connected Git Repository**).

**Rollback** (qualquer um, sem perda):

- Vercel → Deployments → no deploy anterior, **Instant Rollback /
  Promote to Production**;
- reconectar o projeto ao repositório `Giovanella-Petshop`, que continua
  intacto;
- no Git: `git revert <commit>` e `git push`.

Desligar só a loja, mantendo o resto: tirar os três links "Loja" do
`index.html`. A página continua existindo, mas sem produtos fica com
`noindex` e fora do sitemap.
