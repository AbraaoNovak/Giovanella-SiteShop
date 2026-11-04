/**
 * OTIMIZAÇÃO DE FOTOS
 *
 * Lê os originais em `fotos/` (NÃO publicados) e gera versões leves em
 * `public/img/` (publicadas), já recortadas e no tamanho certo para o site.
 *
 * Para cada foto são gerados dois formatos:
 *   - WebP (principal, ~30% menor que JPEG);
 *   - JPEG ou PNG (fallback para navegadores sem WebP, ex.: Safari no macOS
 *     anterior ao Big Sur). PNG apenas para logotipos, que precisam de
 *     transparência.
 *
 * Uso:   npm run fotos
 *
 * Para adicionar uma foto nova à galeria: coloque o original em
 * `fotos/galeria/`, acrescente uma linha em GALERIA abaixo e rode o comando.
 * O script imprime largura e altura de cada saída — copie esses números para
 * os atributos width/height do <img> (evita "pulos" de layout ao carregar).
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = join(RAIZ, 'fotos');
const DESTINO = join(RAIZ, 'public', 'img');

const QUALIDADE_WEBP = 78;
const QUALIDADE_JPEG = 80;

/* ---------------------------------------------------------------------------
   Recortes medidos nos pixels dos originais (ver histórico do projeto).
   --------------------------------------------------------------------------- */

/**
 * Nos pôsteres de curso (1024×1280), a foto ocupa um retângulo fixo do modelo,
 * de x=142 a 898 e y=88 a 488. Recuamos 3 px para não pegar a borda/sombra.
 */
const RECORTE_POSTER = { left: 145, top: 91, width: 750, height: 394 };

/** Cada entrada: [origem, destino, opções]. */
const TAREFAS = [
  // --- Destaque do topo (LCP): instrutora em aula ---------------------------
  ['destaque/instrutora-em-aula.jpg', 'destaque/instrutora-em-aula', {}],

  // --- Estrutura da escola ---------------------------------------------------
  // Fachada: recorte 16:9 alinhado à direita, para manter placa, porta,
  // vitrines e a tesoura grande da parede.
  ['estrutura/fachada.jpg', 'estrutura/fachada', {
    extract: { left: 228, top: 0, width: 1052, height: 592 },
    larguras: [1052, 640],
  }],
  // Capturas de câmera: quadrados que evitam as faixas pretas laterais e os
  // rótulos ("RECEPÇÃO", "BANHO") gravados pela câmera no canto direito.
  ['estrutura/recepcao.jpg', 'estrutura/recepcao', { extract: { left: 300, top: 3, width: 598, height: 598 } }],
  ['estrutura/sala-de-tosa.jpg', 'estrutura/sala-de-tosa', { extract: { left: 344, top: 0, width: 584, height: 584 } }],
  ['estrutura/banho.jpg', 'estrutura/banho', { extract: { left: 290, top: 3, width: 598, height: 598 } }],

  // --- Equipe -----------------------------------------------------------------
  ['equipe/instrutora.jpg', 'equipe/instrutora', { extract: { left: 0, top: 40, width: 388, height: 388 } }],

  // --- Parceiros (logotipos, com transparência) -------------------------------
  // Eco Dog: só o quadrado verde do logo, recortado do banner enviado.
  // O quadrado vai de x=13..114 e y=16..115; recuo de 1-2 px para não pegar
  // a pincelada marrom do fundo do banner.
  ['parceiros/ecodog.jpg', 'parceiros/ecodog', { extract: { left: 15, top: 17, width: 98, height: 98 }, logo: true }],
  // Litoral Pet: o círculo branco do logo, com máscara circular (cantos
  // transparentes) para não carregar o fundo cinza da foto original.
  ['parceiros/litoral-pet.jpg', 'parceiros/litoral-pet', {
    extract: { left: 31, top: 51, width: 543, height: 543 },
    larguras: [240],
    circular: true,
    logo: true,
  }],
];

/** Cursos: todos os pôsteres usam o mesmo recorte. */
const CURSOS = [
  'basico-banho-e-tosa', 'banhista-animais-domesticos', 'banho-e-tosa-assistido', 'estetica-animal',
  'fotografia-pet', 'groomer-designer', 'trimming-em-golden', 'tosa-em-spitz-alemao',
  'especializacao-pelo-longo', 'tintura-pet', 'rostinhos-fofinhos', 'lacos-pet',
  'primeiros-socorros-pet', 'tosa-em-chow-chow', 'tosas-premium', 'banho-e-tosa-em-gatos',
  'penteados-pet', 'dermatites-e-problemas-de-pele',
];
for (const c of CURSOS) {
  TAREFAS.push([`cursos/${c}.jpg`, `cursos/${c}`, { extract: RECORTE_POSTER, larguras: [720] }]);
}

/**
 * Galeria: proporção ORIGINAL preservada (o layout em colunas acomoda fotos
 * em pé e deitadas). Só é recortado o que é defeito da imagem.
 */
const GALERIA = [
  ['01-conclusao-certificado', {}],
  ['02-turma-aula-pratica', {}],
  ['03-turma-em-sala', {}],
  ['04-turma-com-spitz', {}],
  ['05-turma-com-schnauzers', {}],
  // Faixa preta de 20 px no topo (captura de tela).
  ['06-momentos-na-escola', { extract: { left: 0, top: 20, width: 516, height: 367 } }],
  ['07-procedimento-pelo-longo', {}],
  ['08-procedimento-tintura', {}],
];
for (const [nome, opcoes] of GALERIA) {
  TAREFAS.push([`galeria/${nome}.jpg`, `galeria/${nome}`, opcoes]);
}

/**
 * Imagem de compartilhamento (Open Graph: WhatsApp, Facebook, LinkedIn).
 * Formato exigido 1200x630; gerada da fachada, a única foto larga em alta
 * resolução. Alinhada à direita para manter placa, porta e tesoura.
 */
async function gerarImagemSocial() {
  const saida = join(DESTINO, 'social', 'og-image.jpg');
  await mkdir(dirname(saida), { recursive: true });
  await sharp(join(ORIGEM, 'estrutura', 'fachada.jpg'))
    .rotate()
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'right' })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(saida);
  return 'social/og-image  1200x630 (apenas JPEG: redes sociais não leem WebP de forma confiável)';
}

/**
 * Ícone da tela inicial do iPhone/iPad (apple-touch-icon), a partir do
 * favicon. Fundo verde chapado: o iOS pinta de PRETO as áreas transparentes
 * (os cantos arredondados do favicon); ele mesmo aplica o arredondamento.
 */
async function gerarIconeApple() {
  const saida = join(DESTINO, 'apple-touch-icon.png');
  await sharp(join(RAIZ, 'public', 'favicon.svg'), { density: 300 })
    .resize(180, 180)
    .flatten({ background: '#294908' })
    .png({ compressionLevel: 9 })
    .toFile(saida);
  return 'apple-touch-icon  180x180 (PNG, sem transparência)';
}

/* ---------------------------------------------------------------------------
   Processamento
   --------------------------------------------------------------------------- */

/** Máscara SVG circular do tamanho informado. */
const mascaraCircular = (lado) =>
  Buffer.from(`<svg width="${lado}" height="${lado}"><circle cx="${lado / 2}" cy="${lado / 2}" r="${lado / 2}"/></svg>`);

async function processar([origem, destino, opcoes]) {
  const entrada = join(ORIGEM, origem);
  // `rotate()` sem argumentos aplica a orientação EXIF (fotos de celular).
  let base = sharp(entrada).rotate();
  if (opcoes.extract) base = base.extract(opcoes.extract);

  // Intermediários SEMPRE em PNG (sem perdas e com canal alfa). Sem formato
  // explícito, o sharp devolveria o formato da entrada (JPEG): perderia a
  // transparência dos logos e recomprimiria as fotos duas vezes.
  const { data: recortado, info } = await base.png().toBuffer({ resolveWithObject: true });
  // Nunca ampliar: a largura máxima é a do próprio recorte.
  const larguras = (opcoes.larguras || [info.width]).map((l) => Math.min(l, info.width));
  const saidas = [];

  for (const [indice, largura] of larguras.entries()) {
    let img = sharp(recortado).resize({ width: largura, withoutEnlargement: true });

    if (opcoes.circular) {
      const { data } = await img.png().toBuffer({ resolveWithObject: true });
      img = sharp(data).ensureAlpha().composite([{ input: mascaraCircular(largura), blend: 'dest-in' }]);
    }

    // A primeira largura usa o nome base; as demais ganham sufixo "-<largura>".
    const sufixo = indice === 0 ? '' : `-${largura}`;
    const caminhoBase = join(DESTINO, `${destino}${sufixo}`);
    await mkdir(dirname(caminhoBase), { recursive: true });

    const buffer = await img.png().toBuffer();
    const meta = await sharp(buffer).metadata();

    await sharp(buffer).webp({ quality: QUALIDADE_WEBP, alphaQuality: 90 }).toFile(`${caminhoBase}.webp`);
    if (opcoes.logo) {
      await sharp(buffer).png({ compressionLevel: 9, palette: true }).toFile(`${caminhoBase}.png`);
    } else {
      // Fotos: JPEG progressivo, que aparece aos poucos em conexões lentas.
      await sharp(buffer).jpeg({ quality: QUALIDADE_JPEG, progressive: true, mozjpeg: true }).toFile(`${caminhoBase}.jpg`);
    }

    saidas.push(`${destino}${sufixo}  ${meta.width}x${meta.height}`);
  }
  return saidas;
}

const resultados = [];
for (const tarefa of TAREFAS) {
  resultados.push(...(await processar(tarefa)));
}
resultados.push(await gerarImagemSocial());
resultados.push(await gerarIconeApple());
console.log(resultados.join('\n'));
console.log(`\n${resultados.length} imagens geradas em public/img/ (cada uma em WebP + fallback).`);
