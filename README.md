# Giovanella Escola Estética Animal — Website

Site institucional da **Giovanella Escola Estética Animal**, em Joinville - SC.
Foco em conversão por **WhatsApp** e **telefone**, apresentação dos cursos e SEO local.

---

## 1. Nome do projeto

`giovanella-escola-estetica-animal`

## 2. Tecnologias

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Marcação | HTML5 semântico | Todo o conteúdo está no HTML — melhor SEO e funciona sem JS |
| Estilo | CSS moderno (custom properties, Grid, Flexbox, `clamp()`) | Sem framework: menos peso, controle total do design system |
| Comportamento | JavaScript ES modules (vanilla) | ~5 KB gzip no total, sem dependências de runtime |
| Build | [Vite](https://vitejs.dev) 6 | Servidor de desenvolvimento e minificação/hash de assets |
| Fonte | Inter servida pelo próprio site ([Fontsource](https://fontsource.org), licença OFL) | Sem requisição ao Google ao abrir a página (privacidade e CSP estrita); texto aparece mais rápido |
| Hospedagem | [Vercel](https://vercel.com), configurada em `vercel.json` | Cabeçalhos de segurança, cache e redirecionamentos do site antigo |

**Nenhuma dependência de runtime.** O `node_modules` existe apenas para o build.

## 3. Como instalar

```bash
npm install
```

## 4. Como executar

```bash
npm run dev
```

Abre em `http://localhost:5173` (ou na próxima porta livre).

Para rodar os testes automatizados:

```bash
npm test
```

Para testar o site em navegadores reais (Edge, Chrome e Brave instalados na
máquina) em 8 cenários — normal, menos movimento, aparelho fraco, alto
contraste, JavaScript bloqueado/desativado e celular:

```bash
npm run test:navegadores
```

Para reprocessar as fotos depois de trocar um original (ver seção 9):

```bash
npm run fotos
```

Para a auditoria de segurança automatizada (seção 21):

```bash
npm run test:seguranca
```

Para gerar capturas de tela de cada seção, em várias larguras, na pasta
`capturas/` (útil para revisar o visual depois de uma mudança):

```bash
npm run capturas
```

## 5. Como gerar build

```bash
npm run build
```

Gera a pasta `dist/` com HTML, CSS e JS minificados e com hash de cache.
Para conferir o resultado localmente antes de publicar:

```bash
npm run preview
```

## 6. Como fazer deploy

O resultado é um site **100% estático**: qualquer hospedagem serve.

**Vercel (hospedagem atual).** Tudo está em `vercel.json` — build, pasta de
saída, cabeçalhos de segurança, cache e redirecionamentos. Cada `git push` na
`main` publica sozinho. Variáveis de ambiente: ver seção 13 (opcionais).

**Netlify / Cloudflare Pages**
- Comando de build: `npm run build`
- Diretório de publicação: `dist`
- Os cabeçalhos e redirecionamentos do `vercel.json` precisam ser recriados
  no formato de cada plataforma (`_headers` / `_redirects`).

**Hospedagem tradicional (cPanel, FTP)**
1. Rode `npm run build` na sua máquina.
2. Envie **todo o conteúdo** de `dist/` para a pasta pública (`public_html`).
3. Garanta que o certificado HTTPS esteja ativo e que `http://` redirecione para `https://`.

**GitHub Pages**: se o site ficar em um subdiretório, altere `base` em `vite.config.js` para `'./'`.

## 7. Estrutura de pastas

```
.
├── index.html              # Página principal (todo o conteúdo do site)
├── privacidade.html        # Política de Privacidade (LGPD)
├── 404.html                # Página de "não encontrado" (noindex)
├── vercel.json             # Segurança (CSP etc.), cache e redirecionamentos do Wix
├── vite.config.js          # Configuração do build
├── .env.example            # Modelo das variáveis de ambiente
├── fotos/                  # ORIGINAIS das fotos (não vão para o site)
│   ├── destaque/ estrutura/ equipe/ cursos/ galeria/ parceiros/
│   └── nao-utilizadas/
├── public/                 # Copiado para a raiz do site, sem processamento
│   ├── favicon.svg
│   ├── robots.txt
│   ├── sitemap.xml
│   └── img/                # Fotos OTIMIZADAS — geradas por `npm run fotos`
│       ├── Logo-Giovanella.png
│       └── cursos/ destaque/ equipe/ estrutura/ galeria/ parceiros/ social/
├── scripts/
│   ├── otimizar-fotos.mjs  # Recorta e converte as fotos (npm run fotos)
│   ├── test-whatsapp.mjs   # Testes unitários (npm test)
│   ├── test-paws.mjs
│   ├── test-env.mjs
│   ├── test-navegadores.mjs # Testes em Edge/Chrome/Brave reais (com a CSP)
│   ├── test-seguranca.mjs   # Auditoria de segurança do build
│   └── capturas.mjs         # Capturas de tela para revisão visual
└── src/
    ├── css/
    │   ├── main.css        # Ponto de entrada — importa os demais
    │   ├── tokens.css      # CORES, tipografia, espaçamentos  ← edite aqui
    │   ├── base.css        # Reset, tipografia base, acessibilidade
    │   ├── components.css  # Botões, header, menu, cards, formulário, footer
    │   ├── sections.css    # Layout de cada seção
    │   ├── animations.css  # Scroll reveal, patinhas, reduced-motion
    │   └── compat.css      # Fallbacks para navegadores antigos
    └── js/
        ├── main.js         # Ponto de entrada
        ├── config/
        │   └── site.config.js   # TELEFONE, WHATSAPP, ENDEREÇO  ← edite aqui
        └── modules/
            ├── analytics.js     # GA4 condicional + eventos
            ├── config-bind.js   # Sincroniza o HTML com a configuração
            ├── consent.js       # Banner LGPD
            ├── courses.js       # Botão "Ver todos os cursos"
            ├── env.js           # Detecção de reduced-motion / device fraco
            ├── form.js          # Formulário de interesse → WhatsApp
            ├── header.js        # Header fixo, adaptativo, seção ativa
            ├── map.js           # Google Maps sob demanda + "Como chegar"
            ├── mobile-menu.js   # Hamburger, ESC, foco preso
            ├── paws.js          # Experimento das patinhas
            ├── reveal.js        # Scroll reveal
            └── whatsapp.js      # Montagem dos links de WhatsApp
```

## 8. Como trocar a logo

1. Substitua `public/img/Logo-Giovanella.png` mantendo **o mesmo nome**.
2. Se as proporções mudarem, ajuste `width` e `height` nas duas tags `<img>`
   (`index.html`: header e footer) — elas evitam deslocamento de layout (CLS).

> A logo atual é monocromática escura. No footer e sobre seções escuras ela é
> convertida para branco via `filter: brightness(0) invert(1)`
> (`src/css/components.css`). Se você receber uma versão clara oficial, troque o
> `src` dessas ocorrências e remova o filtro.

**Favicon:** `public/favicon.svg` é provisório (pegada nas cores da marca).
Substitua por uma versão quadrada da logo quando houver.

## 9. Como trocar as imagens

As fotos seguem um fluxo em duas pastas:

| Pasta | Conteúdo | Vai para o site? |
| --- | --- | --- |
| `fotos/` | Originais, como chegaram (WhatsApp, celular) | **Não** |
| `public/img/` | Versões otimizadas, recortadas, em WebP + JPEG/PNG | Sim |

A conversão é feita por um único comando:

```bash
npm run fotos
```

Ele lê `fotos/`, aplica os recortes definidos em `scripts/otimizar-fotos.mjs`,
gera WebP (principal) e JPEG/PNG (fallback para navegadores antigos) e imprime
largura × altura de cada saída. **Nunca edite `public/img/` à mão** — rode o
comando de novo.

| Onde aparece | Original em `fotos/` | Observação |
| --- | --- | --- |
| Foto do topo | `destaque/instrutora-em-aula.jpg` | Carrega com prioridade (é o maior elemento da tela) |
| Sobre → mosaico | `estrutura/*.jpg`, `equipe/instrutora.jpg` | Fachada larga (16:9) + quatro quadrados |
| Cursos | `cursos/<curso>.jpg` (o pôster inteiro) | O script recorta só a foto do pôster |
| Galeria | `galeria/NN-descricao.jpg` | Proporção original preservada |
| Patrocinadores | `parceiros/*.jpg` | Logos com fundo transparente |
| Compartilhamento (WhatsApp, redes) | `estrutura/fachada.jpg` | Gera `img/social/og-image.jpg`, 1200×630 |

`fotos/nao-utilizadas/` guarda o que ficou de fora — hoje, uma foto de
samoieda com apenas 224 px, pequena demais para o site.

**Para trocar uma foto existente:** substitua o original em `fotos/` mantendo
o nome e rode `npm run fotos`. Se as proporções mudarem, revise o recorte no
script e os atributos `width`/`height` no HTML.

> **Fotos dos cursos e direitos de uso.** As imagens dos cards foram recortadas
> dos pôsteres enviados pela escola e parecem ser de banco de imagens (em uma
> delas, a de tintura, aparece a marca de outra empresa na roupa da pessoa).
> Antes de publicar, confirme que a licença dessas imagens permite uso no site.

## 9b. Posicionamento: escola, não loja

O cliente pediu explicitamente que o site **não tenha nenhuma correlação com
petshop** — a justificativa é que muitos petshops passaram a dar aulas, e a
escola quer se diferenciar disso. Em termos práticos:

- o Schema.org usa `EducationalOrganization` + `LocalBusiness`.
  **Não reintroduza `PetStore`** nem tipos de loja/varejo;
- os textos falam de cursos, turmas e matrículas — não de serviços prestados;
- a palavra "petshop" não aparece em nenhum arquivo do site.

> O repositório ainda se chama `Giovanella-Petshop`. Vale renomeá-lo no GitHub
> (Settings → Repository name); o Git cria um redirecionamento automático, então
> nada quebra — basta depois rodar
> `git remote set-url origin <nova-url>`.

## 10. Como alterar as cores

Todas as cores vivem em `src/css/tokens.css`, no bloco `:root`.
Trocar `--color-primary` muda botões, títulos e ícones em todo o site.

**Tipografia.** O site usa **uma única família** — Inter, a mesma do menu do
header. O token `--font-display` existe apenas para permitir que títulos voltem
a divergir no futuro; hoje ele aponta para `--font-sans`. A fonte é instalada
pelo pacote `@fontsource-variable/inter` e importada em `src/css/main.css`. Para
trocá-la, instale o pacote Fontsource da nova fonte e ajuste esse import e o
`--font-sans` — **não volte a usar o `<link>` do Google Fonts**: a CSP o
bloquearia (seção 21) e a política de privacidade deixaria de ser verdadeira.

> **Atenção ao contraste.** Dois tokens existem por acessibilidade:
> `--color-secondary-deep` (links/textos, 6:1) e `--color-whatsapp-strong`
> (fundo de botão com texto branco, 4.75:1). O `#5F7F35` e o `#25D366` originais
> não atingem AA como texto, por isso são usados em ícones, bordas e realces.

## 11. Como adicionar cursos

Os 18 cursos atuais foram **transcritos dos pôsteres oficiais**: a foto de cada
card é recortada do pôster, e o texto é HTML de verdade — indexável pelo Google
e lido por leitores de tela, o que a arte do pôster não seria.

Para adicionar um curso:

1. coloque o pôster em `fotos/cursos/<nome-do-curso>.jpg`, acrescente o nome à
   lista `CURSOS` em `scripts/otimizar-fotos.mjs` e rode `npm run fotos`
   (pôsteres no mesmo modelo usam o mesmo recorte automaticamente);
2. em `index.html`, seção `#cursos`, duplique um `<article class="card course-card">`
   e ajuste a imagem, o `<h3 class="card__title">`, as `<span class="tag">`
   (horas e modalidade), a lista `course-card__list` e **o atributo
   `data-course` do botão** — é ele que entra na mensagem do WhatsApp;
3. acrescente o curso ao `<optgroup label="Cursos">` do formulário de contato;
4. acrescente-o ao segundo bloco JSON-LD do `<head>` (tipo `Course`), que
   informa os cursos ao Google.

> **Ajustes feitos na transcrição.** Erros de digitação dos pôsteres foram
> corrigidos ("Expecialização" → "Especialização", "Maquina" → "máquina",
> "aulas teórica" → "aulas teóricas"). No *Banho e Tosa Assistido*, o pôster diz
> "funcionamento de um **Pet Shop**"; no site está "funcionamento de um banho e
> tosa", para manter a regra de não associar a escola a petshop (seção 9b).

```html
<a class="btn btn--whatsapp btn--block"
   data-wa="course"
   data-course="Banho e Tosa — Módulo I"
   data-track="curso_interesse"
   data-track-label="banho_tosa_1"
   href="https://wa.me/5547996086955">Tenho interesse</a>
```

O `href` é reescrito automaticamente com a mensagem codificada; o valor no HTML
serve apenas como fallback caso o JavaScript não carregue.

Atualize também as opções do `<select id="form-assunto">` na seção de contato.

### Destaques e o botão "Ver mais"

A seção tem **duas grades**:

| Grade | O que é |
| --- | --- |
| `<div class="grid">` | Os cursos em destaque — sempre visíveis |
| `<div class="grid courses__extra" id="cursos-extras">` | Os demais — recolhidos atrás do botão |

Para promover ou rebaixar um curso, **mova o `<article>` inteiro** de uma grade
para a outra. Nada mais precisa ser tocado: o rótulo do botão é montado a partir
da contagem real de cards (`Ver todos os N cursos`), então ele se ajusta sozinho
quando cursos são adicionados ou removidos.

Só os destaques trazem a lista `course-card__list`. É proposital — dá peso
comercial a eles —, mas nada impede usá-la também nos demais.

**Por que os cursos ocultos continuam no HTML:** o buscador indexa os nomes de
todos os cursos, não apenas os quatro visíveis. Eles são recolhidos por CSS
(`.js .courses__extra`), e a classe `.js` é aplicada por um script inline no
`<head>` — antes da primeira pintura, para não haver piscada. Sem JavaScript,
todos os cursos aparecem e o botão não é exibido. **Não troque esse mecanismo
por `hidden` no HTML**: isso tornaria os cursos inacessíveis sem JavaScript.

## 11b. Como adicionar fotos à galeria e parceiros

**Galeria** (seção `#galeria`, "Turmas, conclusões e procedimentos"):

1. coloque o original em `fotos/galeria/` com um prefixo numérico
   (`09-conclusao-curso-spitz.jpg`) — ele define a ordem;
2. acrescente-o à lista `GALERIA` em `scripts/otimizar-fotos.mjs`;
3. rode `npm run fotos` e anote largura × altura impressas;
4. no `index.html`, duplique um `<figure class="gallery__item">`, troque os
   caminhos, `width`/`height`, o `alt` (descreva o que se vê na foto) e a legenda.

Use uma das tags existentes — **Conclusão de curso**, **Turma**, **Procedimento**
— para manter a galeria consistente. A grade é em colunas e preserva a proporção
de cada foto, então fotos em pé e deitadas podem ser misturadas à vontade.

> Publique fotos de alunos apenas com autorização deles (LGPD — uso de imagem).

**Patrocinadores** (seção `#patriocinio`): o logotipo vai em `fotos/parceiros/`,
registrado no script com `logo: true` (gera PNG transparente). Se o parceiro
tiver site, envolva o `<figure class="sponsor">` num link
`<a href="..." target="_blank" rel="noopener noreferrer">`. Logos circulares
recebem também a classe `sponsor--round`, que compensa a margem interna do
círculo.

## 12. Como adicionar depoimentos

A seção `#depoimentos` mostra **avaliações reais do perfil da escola no Google**,
copiadas manualmente. Para adicionar uma, duplique um `<article class="testimonial">`
e troque o texto, o nome e a inicial do avatar. Se a nota não for 5, ajuste o
número de estrelas e o `aria-label`.

Regras seguidas, e que valem manter:

- **Texto literal.** Grafia e emojis originais. Não "melhore" a avaliação de
  alguém; se não servir, simplesmente não a publique.
- **Nome curto.** Primeiro nome + inicial do sobrenome, por privacidade (LGPD).
- **Sem data.** O Google mostra "há 4 meses", que envelheceria num site estático.
- **Curso só se a própria avaliação o citar.** Hoje, apenas uma cita
  ("Curso de Estética Animal").
- **Sem marcação Schema.org.** Avaliações de terceiros não podem virar
  `Review`/`AggregateRating` do próprio site (diretrizes do Google).

> Uma avaliação recebida ficou de fora de propósito: trata do banho de uma
> cadela no "pet-shop Giovanella", não da escola, e contradiz o posicionamento
> da seção 9b.

Os depoimentos ficam num **carrossel contínuo** (`src/js/modules/marquee.js`):
deslizam devagar da direita para a esquerda, com as bordas esmaecidas. Edite só
os cards originais — o JavaScript cria sozinho as cópias que fecham o loop. A
velocidade é a constante `VELOCIDADE` (pixels por segundo) no topo do módulo.
Não há botão de pausa (decisão do cliente). A pausa, exigida por
acessibilidade para conteúdo em movimento, acontece com o **mouse por cima**,
com **um toque** no celular (o toque dá foco ao carrossel) e ao chegar pelo
**teclado** (Tab); fora da tela ele também para sozinho. Isso depende do
`tabindex="0"` do carrossel — **não o remova**. `npm run test:navegadores`
verifica a pausa por toque e por foco. Com "reduzir movimento" ou sem JavaScript, vira uma faixa
parada que rola com o dedo.

O botão "Ver todas as avaliações no Google" abre a busca do Google já com o
painel de avaliações da escola (trecho `#lrd=` do link).

## 13. Como configurar o Google Analytics

1. Crie a propriedade GA4 e copie o *Measurement ID* (`G-XXXXXXXXXX`).
2. Copie `.env.example` para `.env` e preencha:

```
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

3. Rode `npm run build` novamente.

**Comportamento:** sem ID configurado, nenhum script de medição é carregado e o
banner de consentimento nem aparece. Com ID configurado, o GA só é carregado
**após o "Aceitar"** do visitante, com `anonymize_ip` e sinais de anúncio
desativados.

**Eventos registrados** (nenhum contém dado pessoal):

| Evento | Quando ocorre |
| --- | --- |
| `whatsapp_clique` | Qualquer CTA de WhatsApp (com `label` da origem) |
| `telefone_clique` | Qualquer link `tel:` |
| `como_chegar_clique` | Botão "Como chegar" |
| `curso_interesse` | Botão "Tenho interesse" de um curso |
| `cta_clique` | Demais CTAs principais |
| `menu_mobile_abrir` | Abertura do menu mobile |
| `mapa_carregar` | Carregamento do mapa |
| `formulario_whatsapp` | Envio do formulário (só o assunto escolhido) |

Para rastrear um novo elemento, basta adicionar `data-track="nome_do_evento"`
(e, opcionalmente, `data-track-label="origem"`).

## 14. Como configurar o Google Maps

A implementação atual **não usa API Key e não tem custo**: o mapa é o embed
público do Google, buscado pelo endereço, e só é carregado quando o visitante
clica — o que economiza centenas de KB e evita cookies de terceiros antes do
consentimento.

Nada precisa ser configurado. Se você mudar o endereço em `site.config.js`, o
mapa e o botão "Como chegar" acompanham automaticamente.

Para migrar para a Maps JavaScript API (marcador customizado, estilo próprio):
preencha `VITE_GOOGLE_MAPS_API_KEY` no `.env`, **restrinja a chave por domínio**
no Google Cloud Console e ajuste `src/js/modules/map.js`.

## 15. Como integrar avaliações Google

Hoje as avaliações são **copiadas manualmente** do perfil da escola (seção 12) —
sem scraping, que é proibido pelos termos do Google. Para que elas se
atualizem sozinhas, os caminhos oficiais são:

1. **Google Places API — Place Details** (recomendado). Retorna até 5 avaliações.
   Exige chave *server-side*: crie um pequeno endpoint (Netlify/Vercel Function)
   que consulta a API, cacheia o resultado e devolve o JSON ao site. **A chave
   nunca pode ir para o navegador.** Preencha `VITE_GOOGLE_PLACE_ID` com o Place
   ID do perfil.
2. **Widget de terceiros autorizado** (Elfsight, Trustindex, EmbedSocial, etc.):
   solução paga, sem backend próprio.

Só depois de exibir avaliações reais e elegíveis é permitido adicionar
`AggregateRating` ao Schema.org — usá-lo sem isso viola as diretrizes do Google.

## 16. Como alterar o telefone

`src/js/config/site.config.js` → `contact.phoneDisplay` (exibição) e
`contact.phoneE164` (link `tel:`). Todos os links `tel:` e textos marcados com
`data-config="contact.phoneDisplay"` são atualizados sozinhos.

Atualize também o valor escrito no HTML (para quem acessa sem JS) e o campo
`telephone` do Schema.org no `<head>` do `index.html`.

## 17. Como alterar o WhatsApp

`src/js/config/site.config.js` → `contact.whatsapp` (somente dígitos, com código
do país: `5547996086955`). As mensagens padrão ficam logo abaixo, em `messages`.

## 18. Como alterar o endereço

`src/js/config/site.config.js` → objeto `address`. Isso atualiza o mapa e o botão
"Como chegar". Atualize também, manualmente:

- os blocos `<address>` em `index.html` (contato e footer);
- o `PostalAddress` do Schema.org no `<head>`;
- a `<meta name="geo.placename">`, se a cidade mudar.

## 19. Como alterar textos

Todo o conteúdo está diretamente no `index.html` (bom para SEO). Procure por
`TODO:` — cada trecho provisório está marcado no código **e** sinalizado
visualmente no site pelo selo laranja `placeholder-note`.

O rótulo **"Patriocinio"** foi mantido exatamente como informado pelo
proprietário e está centralizado em `site.config.js` → `labels.sponsorship`.
Para trocar por "Patrocínio", altere apenas essa linha: menu desktop, menu
mobile, título da seção e footer acompanham. (O `id="patriocinio"` da seção e os
`href="#patriocinio"` permanecem — mudá-los quebraria links já compartilhados.)

## 20. Checklist de produção

**Conteúdo**
- [x] Substituir todos os `TODO:` do site (nenhum selo laranja restante)
- [x] Inserir os cursos reais (18 cursos, transcritos dos pôsteres)
- [ ] Confirmar a licença das fotos de banco de imagens usadas nos cursos
- [x] Inserir depoimentos reais (avaliações do Google)
- [x] Inserir fotos reais (estrutura, equipe, galeria) em WebP, com `width`/`height`
- [ ] Obter autorização de uso de imagem dos alunos que aparecem na galeria
- [x] Inserir logos dos parceiros (Eco Dog e Litoral Pet)
- [ ] Pedir logos em alta resolução (o da Eco Dog veio com apenas 98 px)
- [ ] Revisar a Política de Privacidade com apoio jurídico

**Configuração**
- [x] Domínio definitivo no código (`escolabanhoetosarosigiovanella.com.br`)
- [ ] Registrar o `.com.br` e concluir a migração do Wix (seção 22)
- [x] Criar a imagem social 1200×630 e apontar a `og:image` para ela
- [x] Gerar `apple-touch-icon.png` (180×180)
- [x] Preencher o CEP no Schema.org
- [ ] Informar o horário de funcionamento para o Schema.org
- [ ] Configurar o GA4 (opcional)

**Técnico**
- [x] `npm test`, `npm run test:navegadores`, `npm run test:seguranca` e
      `npm run build` sem erros
- [x] `npm audit` sem vulnerabilidades
- [ ] Conferir os cabeçalhos no domínio publicado em https://securityheaders.com
- [ ] HTTPS ativo com redirecionamento de `http://` (automático na Vercel)
- [ ] Testar em Chrome, Safari, Firefox e Edge; iOS e Android reais
- [ ] Testar o WhatsApp em celular (deve abrir o app, não o navegador)
- [ ] Testar o link `tel:` em celular
- [ ] Rodar Lighthouse (metas: Performance ≥ 90, Acessibilidade ≥ 95, SEO 100)
- [ ] Enviar o `sitemap.xml` no Google Search Console
- [ ] Cadastrar/atualizar o Perfil da Empresa no Google (essencial para SEO local)

## 21. Segurança

O site não tem servidor, banco de dados, login nem formulário que envie dados —
a superfície de ataque é pequena por construção. Sobre ela, estas camadas:

| Proteção | Onde | O que evita |
| --- | --- | --- |
| **CSP estrita** (Content-Security-Policy) | `vercel.json` | Execução de qualquer script, estilo ou recurso que não seja do próprio site — a principal defesa contra injeção de código (XSS) |
| HSTS | `vercel.json` | Acesso sem HTTPS |
| `X-Frame-Options` + `frame-ancestors` | `vercel.json` | O site ser embutido em outro para enganar cliques |
| `nosniff`, `Referrer-Policy`, `Permissions-Policy`, COOP | `vercel.json` | Interpretação errada de arquivos, vazamento de endereço, uso de câmera/microfone/localização |
| `form-action 'none'` + `method="post"` + formulário oculto sem JS | `vercel.json`, `index.html` | Nome e telefone indo para a URL se o JavaScript falhar |
| `rel="noopener"` em links externos | HTML e `whatsapp.js` | A página aberta controlar a aba do site |
| Imagens sem metadados | `npm run fotos` | GPS, modelo de celular ou nome do autor publicados nas fotos |
| Fonte e recursos próprios | `src/css/main.css` | Requisições a terceiros ao abrir a página |
| `X-Robots-Tag: noindex` em `*.vercel.app` | `vercel.json` | Endereços de teste da Vercel aparecendo no Google |
| Dependências auditadas | `npm audit` | Vulnerabilidades conhecidas nas ferramentas de build |

**`npm run test:seguranca`** confere tudo isso no build final e falha se algo
regredir. Os testes de navegador rodam com a mesma CSP da produção e falham se
ela bloquear qualquer coisa legítima.

> **Ao alterar um script inline do `<head>`** (os blocos que ativam a classe
> `.js`), o hash dele muda e a CSP passa a bloqueá-lo. Rode
> `npm run test:seguranca`: ele mostra o hash novo, que deve substituir o
> antigo em `script-src`, no `vercel.json`.

> **Ao ativar o Google Analytics**, a CSP já libera os domínios oficiais do GA4.
> Se usar outro serviço externo (Instagram, YouTube…), acrescente o domínio à
> diretiva correspondente da CSP.

## 22. Domínio e migração do Wix

**Situação levantada em 01/11/2026:**

| Item | Situação |
| --- | --- |
| Domínio atual | `escolabanhoetosarosigiovanella.com`, **registrado no Wix** até 12/02/2027 |
| DNS atual | Administrado pelo Wix (`ns12`/`ns13.wixdns.net`) |
| E-mail no domínio | Nenhum (sem registro MX) — a troca não afeta e-mail |
| `escolabanhoetosarosigiovanella.com.br` | Livre no Registro.br |
| Site antigo | 33 posts de blog, 8 páginas e 13 produtos de loja-modelo do Wix |

**Domínio principal do site novo:** `https://www.escolabanhoetosarosigiovanella.com.br`
(canonical, sitemap, robots, Open Graph e Schema.org já usam esse endereço).

**Passo a passo, NESTA ordem** (a ordem evita que o Google veja o site fora do
ar ou apontando para um endereço inexistente):

1. **Registrar o `.com.br`** em https://registro.br, com o CPF ou CNPJ da escola.
2. **Vercel → Settings → Domains:** adicionar `www.escolabanhoetosarosigiovanella.com.br`
   (principal) e `escolabanhoetosarosigiovanella.com.br`, redirecionando para o `www`.
   Configurar no Registro.br os registros que a Vercel mostrar na tela — use os
   valores exibidos lá, que podem mudar com o tempo.
3. Aguardar o domínio ficar válido na Vercel e confirmar o site no ar pelo `.com.br`.
4. **Vercel → Domains:** adicionar também `www.escolabanhoetosarosigiovanella.com`
   e `escolabanhoetosarosigiovanella.com`, ambos com **redirecionamento
   permanente (308) para o `.com.br`**.
5. **Wix → Domínios:** apontar o `.com` para a Vercel, editando os registros DNS
   com os valores que a Vercel mostrar. **Só depois disso** cancelar o plano
   do site no Wix — e **manter o domínio `.com` renovando** (vence em
   12/02/2027): é ele que preserva os links antigos.
6. **Google Search Console:** verificar os dois domínios, enviar o `sitemap.xml`
   do `.com.br` e usar **"Mudança de endereço"** do `.com` para o `.com.br`.
7. **Perfil da Empresa no Google:** trocar o site para o `.com.br`.

**Endereços antigos:** os 56 caminhos do Wix (`/post/…`, `/about-1`,
`/product-page/…` etc.) têm redirecionamento permanente para a página inicial
em `vercel.json`. Qualquer outro endereço inexistente mostra a página
`404.html`, com link para o início e para os cursos.

---

## Notas de implementação

**Sem e-mail, sem backend.** O formulário não envia e-mail e não armazena nada:
ele valida os campos, monta a mensagem e abre o WhatsApp. As proteções são as
possíveis sem servidor — validação, limites de tamanho, sanitização, honeypot e
trava contra cliques repetidos. **Não há** (nem seria possível haver) bloqueio
por IP ou rate limiting real sem backend, e o código não finge que há.

**Privacidade por padrão.** Nenhum recurso de terceiros é carregado sem ação do
visitante: o mapa só depois do clique, o analytics só depois do consentimento.
Nome, telefone e mensagem nunca são enviados ao analytics.

**Acessibilidade.** Contraste verificado (menor par em uso: 4.75:1), navegação
completa por teclado, foco visível, foco preso no menu mobile, `aria-expanded`/
`aria-controls`, skip link, erros de formulário anunciados por `role="alert"` e
`prefers-reduced-motion` respeitado em todo o site.

**Performance.** Sem framework, ~5,5 KB de JS (gzip) e ~6 KB de CSS (gzip); as
patinhas entram em `requestIdleCallback` para não competir com o LCP e se
desligam sozinhas em aparelhos fracos ou com `saveData`.

**Compatibilidade com navegadores.** Suportados: Chrome/Edge 88+, Firefox 78+
(ESR), Safari/iOS 14+ e Samsung Internet 15+. O site foi desenhado para
**nunca esconder conteúdo** quando algo falha:

| Situação | O que acontece |
| --- | --- |
| JavaScript desativado ou bloqueado | Todos os 16 cursos visíveis, sem botão "Ver mais"; hamburger oculto (navegação pela rolagem e pelo rodapé); links de WhatsApp funcionam sem mensagem pré-preenchida |
| Script não carrega (rede, bloqueador, `file://`) | Detectado por um listener no `<head>`, que devolve a página ao modo sem JS |
| Navegador sem ES modules | `<script nomodule>` devolve a página ao modo sem JS |
| Erro durante a inicialização | Cada módulo roda isolado (`safely()` em `main.js`); se nada terminar em 8 s, a página volta ao modo sem JS |
| "Reduzir movimento" no sistema | Patinhas **estáticas** (visíveis, sem animação) |
| Aparelho muito limitado / economia de dados | Patinhas estáticas |
| Alto contraste do Windows | Patinhas ocultas (decorativas; viram borrões com cores forçadas) |

Fallbacks de CSS ficam em `src/css/compat.css`. **Não use `inset`** no CSS
(escreva `top/right/bottom/left`) e **não chame `matchMedia(...).addEventListener`
diretamente** — use `onMediaChange()` de `env.js`.

> **"As patinhas não aparecem no meu navegador."** Em ordem: (1) elas surgem
> **nas divisas entre as seções** ao rolar, não no topo da página; (2) verifique
> se o Windows está em **alto contraste** — nesse caso ficam ocultas de
> propósito; (3) desative extensões de **modo escuro** (ex.: Dark Reader), que
> recolorem a página e podem torná-las invisíveis; (4) abra o console (F12) e
> procure mensagens `[Giovanella]`.

**Patinhas (Experimento 1).** Em cada emenda entre duas seções o JS insere uma
trilha que atravessa a página na diagonal, cruzando a divisa. As pegadas não se
movem: são *carimbadas* uma a uma conforme a divisa sobe pela tela — rolando
para baixo elas surgem na ordem do trajeto, rolando para cima somem na ordem
inversa. O sentido alterna a cada divisa (direita→esquerda, depois
esquerda→direita). As posições são calculadas uma única vez; durante o scroll o
código só alterna a classe `.is-stamped`, sem recálculo de layout por frame.
Parâmetros ajustáveis no topo de `src/js/modules/paws.js`:

| Constante | O que controla |
| --- | --- |
| `SEAM_SPREAD` | Quanto a trilha se afasta da divisa (altura da diagonal) |
| `TRAIL_HALF` | Meia-altura da janela que **recorta** a trilha (ver aviso abaixo) |
| `PAW_SIZE` | Lado da pegada; publicado no CSS como `--paw-size` |
| `STEP_SPACING` | Espaçamento entre pegadas (define quantas cabem na largura) |
| `MIN_PAWS` / `MAX_PAWS` | Limites de pegadas por trilha |
| `MAX_OPACITY` | Intensidade máxima do efeito |
| `PAW_STRIDE` | Afastamento entre a pata esquerda e a direita |

> **Não remova o `overflow: hidden` da `.paw-trail`.** As pegadas das pontas
> saem pelas laterais de propósito; sem o recorte elas alargam o documento e,
> no celular, a viewport de layout — o que empurra o header fixo para fora da
> coluna visível. Pela mesma razão, se aumentar `SEAM_SPREAD` aumente
> `TRAIL_HALF` junto: há um teste em `scripts/test-paws.mjs` que falha se a
> geometria passar a ser cortada na vertical.

> **Cuidado com `aspect-ratio` + `min-height` no mesmo elemento.** Quando a
> largura disponível fica menor que `min-height × proporção`, é o `min-height`
> que passa a ditar a **largura**, estourando a coluna. Foi o que aconteceu com
> o `.map` (`4/3` + `300px` exigiam 400px de largura em telas de 320px).
> Prefira definir a altura por proporção sobre a largura, sem `min-height`.
