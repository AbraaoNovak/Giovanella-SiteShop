# Configuração de afiliados — Mercado Livre e Shopee

Guia para cadastrar produtos e links de afiliado na **Loja** do site
(`/loja/`). Não é preciso saber programar: tudo fica em três arquivos de
texto, e o build confere cada item antes de publicar.

> **Situação atual:** os dois programas estão **aguardando cadastro**. Por
> isso a loja está vazia, mostra "Produtos em breve" e fica fora do Google.
> Nenhum link, preço, nota ou foto foi inventado.

---

## 1. Como a loja funciona

- A escola **não vende** os produtos. Cada botão "Ver oferta no Mercado Livre"
  ou "Ver oferta na Shopee" abre a página do produto na plataforma, por um
  **link de afiliado** da escola.
- Pagamento, estoque, entrega e trocas são da plataforma. A escola recebe
  uma **comissão** quando a compra acontece por esse link.
- As páginas da loja são **geradas no build**: a Vercel monta o HTML a partir
  dos arquivos abaixo a cada `git push`.

## 2. Onde fica cada coisa

| Arquivo | O que tem | Quem edita |
| --- | --- | --- |
| `src/loja/produtos.js` | **Os produtos e os links de afiliado** | Você, sempre que mudar o catálogo |
| `src/loja/categorias.js` | As categorias dos filtros | Quando mudar a organização |
| `src/loja/config.js` | Regras: domínios aceitos, validade do preço, aviso de comissão | Raramente |
| `fotos/loja/` | Fotos originais dos produtos | Você, ao adicionar produto |
| `public/img/loja/` | Fotos otimizadas (geradas por `npm run fotos`) | Ninguém: é gerada |
| `loja/` (na raiz) | Páginas HTML da loja | Ninguém: é gerada e fica fora do Git |

**Os links de afiliado ficam somente em `src/loja/produtos.js`**, no campo
`affiliate_url` de cada produto. Não existe nenhum outro lugar do código com
URL comercial.

## 3. Antes de começar: cadastro nos programas

1. **Mercado Livre:** cadastro no Programa de Afiliados
   ([mercadolivre.com.br/l/afiliados-home](https://mercadolivre.com.br/l/afiliados-home)).
   O painel fica em `afiliados.mercadolivre.com.br`.
2. **Shopee:** cadastro no Programa de Afiliados da Shopee
   (`affiliate.shopee.com.br`).
3. Leia os **termos** de cada programa e confirme:
   - como a divulgação da comissão deve aparecer (o site já mostra um aviso,
     ver seção 10);
   - se é permitido **reproduzir fotos, notas e número de avaliações** dos
     anúncios. Até essa confirmação, as notas ficam ocultas
     (`exibirAvaliacoes: false`, seção 7);
   - quais categorias de produto podem ter link (há categorias excluídas).

## 4. Passo a passo: adicionar um produto

1. **Gere o link de afiliado** no painel do programa:
   - Mercado Livre: *Ferramentas → Gerador de link*, ou o botão
     *Compartilhar* do anúncio com a conta de afiliado. O link sai como
     `https://mercadolivre.com/sec/...` ou
     `https://www.mercadolivre.com.br/social/...`;
   - Shopee: no painel de afiliados, gere o link do produto. O link curto sai
     como `https://s.shopee.com.br/...` (ou `https://shope.ee/...`).

   > Use **sempre** o link gerado no painel. O endereço comum do anúncio
   > (copiado da barra do navegador) **não** registra a indicação, e você
   > não recebe comissão.

2. **Foto (opcional, mas recomendada):** salve a foto em `fotos/loja/` com
   nome em minúsculas, números e hífen (ex.: `tesoura-reta-7.jpg`) e rode:

   ```bash
   npm run fotos
   ```

   Isso gera `public/img/loja/tesoura-reta-7.jpg` e `.webp`. Use só fotos que
   a escola pode publicar (ver seção 3). Sem foto, o card mostra uma patinha
   com "Foto em breve".

3. **Cadastre o produto** em `src/loja/produtos.js`: copie o modelo
   comentado do arquivo para dentro de `PRODUTOS = [ ... ]` e preencha.
   Exemplo:

   ```js
   export const PRODUTOS = [
     {
       id: 'tesoura-reta-7',
       slug: 'tesoura-reta-7-polegadas',
       title: 'Tesoura reta 7 polegadas para tosa',
       short_description: 'Tesoura de aço inox para acabamento à tesoura.',
       description: 'Texto da página do produto.\n\nOutro parágrafo.',
       category: 'tesouras',
       marketplace: 'mercado-livre',
       affiliate_url: 'https://mercadolivre.com/sec/SEU-CODIGO',
       image_url: '/img/loja/tesoura-reta-7.jpg',
       image_alt: 'Tesoura reta de 7 polegadas com cabo verde',
       availability_status: 'disponivel',
       last_updated: '2026-11-10',
       is_featured: false,
       is_active: true,
     },
   ];
   ```

4. **Confira localmente:**

   ```bash
   npm run dev
   ```

   Abra `http://localhost:5173/loja/`. O terminal mostra **avisos**
   (amarelo) e **erros** do catálogo (seção 9).

5. **Publique** com `git add`, `git commit` e `git push`. A Vercel refaz o
   build. Se houver erro no catálogo, o build para e o site continua na
   versão anterior: nada quebrado vai ao ar.

## 5. Campos de cada produto

| Campo | Obrigatório | Regras |
| --- | --- | --- |
| `id` | sim | Único. Minúsculas, números e hífen |
| `slug` | sim | Único. Vira o endereço `/loja/<slug>/` |
| `title` | sim | Nome do produto (até ~140 caracteres) |
| `category` | sim | Um `id` de `categorias.js` |
| `marketplace` | sim | `'mercado-livre'` ou `'shopee'` |
| `affiliate_url` | não | Link do painel, marcador ou vazio (seção 6) |
| `short_description` | não | Uma frase para o card (até ~200 caracteres) |
| `description` | não | Texto da página. Linha em branco = novo parágrafo |
| `external_product_id` | não | Código do anúncio (ex.: MLB...), só para controle |
| `image_url` / `image_alt` | não | Foto em `/img/loja/` + descrição da foto |
| `gallery` | não | Lista de outras fotos (mesmas regras) |
| `price` / `original_price` | não | Número (ex.: `189.9`). Exige `last_updated` |
| `rating` / `review_count` | não | Nota 0–5 e total. Só aparecem se autorizadas (seção 7) |
| `specifications` | não | Lista de `{ label: 'Tamanho', value: '7"' }` |
| `availability_status` | não | `'disponivel'`, `'indisponivel'` ou `'desconhecido'` |
| `last_updated` | não | Data `'AAAA-MM-DD'` em que preço/nota foram conferidos |
| `is_featured` | não | `true` = aparece na página inicial da escola |
| `is_active` | não | `false` = some da loja sem apagar o cadastro |

Todo texto é tratado como **texto puro**: se alguém digitar HTML ou código,
ele aparece escrito na página e nunca é executado.

## 6. Links de afiliado: o que o build aceita

| Valor em `affiliate_url` | Resultado |
| --- | --- |
| `''` (vazio) | Card com **"Oferta em breve"**, sem botão. Página fora do Google |
| `'{{LINK_AFILIADO_MERCADO_LIVRE}}'` ou `'{{LINK_AFILIADO_SHOPEE}}'` | Igual ao vazio: marca o produto como "aguardando link" |
| Link HTTPS do domínio da plataforma escolhida | Botão **"Ver oferta no ..."** (nova aba, `rel="sponsored nofollow noopener noreferrer"`) |
| Qualquer outra coisa | **Build interrompido** com a explicação |

Exemplos que **interrompem o build** (de propósito):

- link `http://` (sem o S);
- link de outro site, ou parecido com o original
  (`mercadolivre.com.site-falso.com`);
- link da Shopee num produto marcado como Mercado Livre (ou o contrário);
- endereço com espaço, usuário/senha ou porta;
- marcador digitado errado (`{{LINK_AFILIADO_ML`).

Os marcadores `{{...}}` **não são URLs**. Eles só sinalizam que o link ainda
vai ser colado, e nunca viram botão.

### Domínios aceitos

Ficam em `src/loja/config.js` → `MARKETPLACES`:

| Plataforma | Domínios (e subdomínios) |
| --- | --- |
| Mercado Livre | `mercadolivre.com`, `mercadolivre.com.br` |
| Shopee | `shopee.com.br`, `shope.ee` |

Eles foram definidos a partir dos formatos públicos dos links dos programas.
**Ao gerar o primeiro link real de cada programa, confira se o domínio está
na lista.** Se o painel gerar outro domínio oficial, acrescente-o ali (só
domínios da própria plataforma, nunca encurtadores genéricos como bit.ly).

## 7. Preço e avaliações

- O preço só aparece com `last_updated` preenchido e sempre vem acompanhado
  de "Preço no Mercado Livre em DD/MM/AAAA. Pode ter mudado".
- Preço conferido há **mais de 7 dias** some sozinho no próximo build (o
  botão continua). O prazo fica em `config.js` → `precoValidadeDias`.
- Para atualizar: confira o anúncio, troque `price` e `last_updated` e
  publique. Se não quiser manter preço, deixe `price: null`: o card fica
  sem preço e a pessoa vê o valor na plataforma.
- **Notas e número de avaliações** ficam ocultos até que a escola confirme
  nos termos do programa que pode reproduzi-los. Depois disso, mude
  `exibirAvaliacoes` para `true` na plataforma correspondente em `config.js`.

## 8. Categorias, destaques e desativação

- **Nova categoria:** acrescente `{ id: 'nome-curto', nome: 'Nome visível' }`
  em `src/loja/categorias.js`. Categorias sem produto não aparecem nos filtros.
- **Destaque na página inicial:** `is_featured: true`. Aparecem até 4
  produtos (`config.js` → `destaquesNaHome`), só os que têm link válido.
  Sem nenhum, a home fica exatamente como antes.
- **Tirar um produto do ar:** `is_active: false` (o cadastro fica guardado),
  ou apague o bloco do produto.
- **Produto esgotado:** `availability_status: 'indisponivel'`. O card mostra
  "Indisponível no momento", sem botão.

## 9. Mensagens do build

- **Erro** (vermelho, build interrompido): dado que poderia levar o visitante
  a um lugar errado ou quebrar a página. Corrija o que a mensagem indica.
- **Aviso** (amarelo, build continua): dado incompleto tratado com segurança.
  Por exemplo: foto não encontrada (vira marcador), preço sem data (oculto)
  ou produto sem link ("Oferta em breve").

## 10. Transparência (afiliação)

O aviso abaixo aparece no rodapé de todas as páginas da loja, no bloco
"Como funciona", na página de cada produto e na seção de destaques da home:

> Este site pode receber comissões por compras realizadas por meio de links
> de afiliados. A compra é concluída diretamente na plataforma parceira,
> conforme suas condições comerciais.

Para mudar o texto, edite `config.js` → `avisoAfiliados`. A Política de
Privacidade (`privacidade.html`, seção 6) explica o mesmo ao visitante.

## 11. Integrações futuras por API

Hoje o catálogo é **manual**, e isso basta para começar. Antes de integrar
qualquer API dos programas:

1. confirme que a conta de afiliado foi **aprovada**;
2. confirme que ela tem **credenciais de API** (cadastro de afiliado não dá
   acesso automático às APIs de catálogo);
3. leia a **documentação oficial vigente** do programa;
4. confirme **quais dados** podem ser consultados e exibidos (preço, fotos,
   notas, descrições);
5. implemente só o que for permitido. **Nunca** use raspagem de páginas
   (scraping) nem endereços não documentados.

Como encaixar na arquitetura atual, sem expor segredos:

- as credenciais ficam em **variáveis de ambiente da Vercel** (Project →
  Settings → Environment Variables), **sem** o prefixo `VITE_`: assim elas
  existem só no build e nunca chegam ao navegador;
- um script de build consulta a API e devolve os dados no **mesmo formato**
  de `produtos.js`; o resto (validação, páginas, SEO) continua igual;
- o `affiliate_url` que vier da API passa pela mesma validação de domínio.

## 12. Checklist antes de publicar um produto

- [ ] Link gerado no **painel de afiliados** (não o endereço comum do anúncio)
- [ ] Testei o link numa aba anônima: abre o produto certo
- [ ] Foto autorizada, em `fotos/loja/`, e `npm run fotos` rodado
- [ ] `image_alt` descreve a foto
- [ ] Preço com `last_updated` de hoje (ou `price: null`)
- [ ] `npm run dev`, abri `/loja/` e a página do produto, sem erro no terminal
- [ ] `git add`, `git commit`, `git push`

## 13. Modo demonstração (produtos fictícios)

Para visualizar o layout antes de existirem produtos reais, a loja tem um
**modo demonstração**, hoje **ligado** (`src/loja/config.js` → `demonstracao: true`).

Com ele ligado:

- a loja mostra os 12 produtos **fictícios** de
  `src/loja/produtos-demonstracao.js` (nomes genéricos, preços e notas
  inventados, ilustrações próprias em `public/img/loja/demo/`);
- toda página da loja (e a seção de destaques da home) mostra a faixa
  **"Demonstração: produtos, preços e avaliações fictícios"**;
- os botões "Ver oferta" têm a mesma aparência, mas **não têm link**;
- tudo fica com `noindex` e fora do sitemap;
- **trava:** se o projeto da Vercel já estiver no domínio oficial da escola
  (`escolabanhoetosarosigiovanella`), o build é **recusado**. Produtos
  fictícios nunca chegam ao site oficial, mesmo que alguém esqueça de
  desligar o modo.

**Para desligar** (ao cadastrar os produtos reais):

1. em `src/loja/config.js`, mude para `demonstracao: false`;
2. cadastre os produtos reais em `src/loja/produtos.js` (seção 4);
3. opcional: apague `src/loja/produtos-demonstracao.js`,
   `public/img/loja/demo/` e `scripts/gerar-fotos-demonstracao.mjs`
   (e as 3 linhas que os citam em `scripts/test-loja.mjs`).
