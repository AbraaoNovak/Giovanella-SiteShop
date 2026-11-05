# Identidade visual da Loja (derivada do site da escola)

A loja **não tem identidade própria**: ela usa os mesmos tokens e
componentes do site institucional, para parecer uma extensão natural da
escola e não um marketplace genérico. Este documento registra o que foi
levantado no site e como cada elemento foi aplicado na loja.

Fonte da verdade: `src/css/tokens.css`. Estilos exclusivos da loja:
`src/css/loja.css`.

## 1. Levantamento do site institucional

| Elemento | Encontrado no site |
| --- | --- |
| Cor principal | **`#294908`** (verde escuro): confirmada no código (`--color-primary`) e no `theme-color`. A referência inicial do briefing estava correta |
| Secundárias | `#5f7f35` (ícones, bordas), `#4a6528` (texto e links, AA), `#a8bc83` (destaques suaves), dourado `#c69a4b` (detalhes), terracota `#c97855` (raro) |
| Superfícies | Fundo creme `#f7f5ee`, seções alternadas `#e9e4d5`, cards brancos, rodapé `#162604` |
| Tipografia | **Inter** (variável, servida pelo próprio site), uma única família. Títulos 700 com leve aperto; escala fluida `--step--1` a `--step-5` |
| Botões | Pílula (`--radius-pill`), mínimo de 48px de altura. Primário verde cheio, secundário com contorno, WhatsApp em verde forte `#118449` |
| Cards | Branco, borda `#d9d3c1`, raio 22px; no hover, sobem 4px com sombra média |
| Etiquetas | `.tag`: pílula verde-clara translúcida com texto verde |
| Elemento de marca | **Patinhas**: trilhas de pegadas entre as seções (`data-paw-seams`) |
| Cabeçalho | Fixo e transparente no topo; ganha fundo translúcido ao rolar e inverte as cores sobre seções escuras. Logo à esquerda, menu no centro, "Fale conosco" à direita |
| Celular | Menu hambúrguer a partir de 1023px, com painel lateral, foco preso e ESC |
| Rodapé | Verde muito escuro com logo, navegação, contato e endereço |
| Fotos | Reais da escola, cantos de 22px, `<picture>` WebP + JPEG com width/height |

## 2. Tokens aplicados na Loja

Todo seletor de `loja.css` usa variáveis de `tokens.css`. A loja usa o
**terracota** e o **dourado** que já existiam na paleta, em tons mais escuros
para passar no contraste (tokens novos em `tokens.css`):

| Papel | Cor | Token | Contraste |
| --- | --- | --- | --- |
| Escola (menu, títulos, filtros, cursos) | Verde `#294908` | `--color-primary` | 10,2:1 com branco |
| **Comprar** (botão "Ver oferta", "Ver produtos", preço) | Terracota `#b0532c` | `--color-terracotta-deep` | 5,1:1 com branco |
| Hover das ações de compra | `#9c4626` | `--color-terracotta-deeper` | 6,3:1 com branco |
| **Destaque e desconto** (selos "Destaque", "-18%") | Dourado claro + texto `#6b4410` | `--color-gold-deep` | 7:1 |

Por quê: o efeito comprovado nas cores de compra é o **contraste**. Um
botão quente numa página verde chama o olho para a ação. Vermelho puro,
amarelo e laranja vivo foram descartados: o vermelho com o verde parece
Natal ou liquidação, e o amarelo e o laranja são as cores do Mercado Livre e
da Shopee (além de não passarem no contraste com texto branco).

Demais usos:

| Uso na loja | Token |
| --- | --- |
| Título, filtro ativo | `--color-primary` |
| Filtro inativo (borda), etiqueta da plataforma | `--color-border-strong`, `--color-white` |
| Etiqueta de categoria | `.tag` do site, sem alteração |
| Data do preço, avisos, textos auxiliares | `--color-text-muted`, `--step--1` |
| Marcador "Foto em breve" | Listras de `--color-light-green` sobre `--color-bg-alt` + patinha em `--color-secondary` |
| "Oferta em breve" | Pílula **tracejada** (`--color-border-strong`): visivelmente diferente de um botão |
| Estrela da nota (quando autorizada) | `--color-gold` (só ícone, nunca texto pequeno) |
| Raios, sombras, espaçamentos, movimento | Os mesmos tokens do site |

## 3. Decisões de identidade

- **Verde = escola, terracota = comprar.** A separação também deixa claro
  para o visitante o que é da escola e o que leva para outra plataforma.
- **Cores das plataformas não são usadas.** O amarelo do Mercado Livre e o
  laranja da Shopee competiriam com o verde da escola e dariam cara de
  marketplace. A plataforma aparece como **texto** numa etiqueta neutra e no
  próprio botão ("Ver oferta no Mercado Livre").
- **Logos das plataformas não são usados**, porque dependem de autorização
  de marca.
- **Topo da loja um degrau menor que o da home** (`--step-4` no título):
  a escola continua sendo o destaque do site.
- **Foto do topo da loja**: a sala de tosa da própria escola, e não uma foto
  de produto, para reforçar que é uma seleção da escola.
- **Patinhas** mantidas entre as seções da loja, o mesmo elemento de marca
  da home.
- **Faixa final verde** ("Quer transformar o cuidado com os animais em
  profissão?") reaproveita o `.cta-band` do site e leva de volta aos cursos.

## 4. Componentes reaproveitados (sem cópia de CSS)

`.hero`, `.hero__title`, `.section`, `.section__header`, `.section__eyebrow`,
`.card`, `.card__body`, `.tag`, `.btn` (todas as variantes), `.trust`,
`.cta-band`, `.photo`, `.sr-only` e, copiados do `index.html` no build,
cabeçalho, menu mobile, rodapé, botão flutuante de WhatsApp e aviso de
privacidade.

Novos (só da loja): `.produto-card`, `.produto-foto`, `.produto-preco`,
`.loja-chip` (filtros), `.breadcrumb`, `.loja-em-breve`, `.loja-produto`.
