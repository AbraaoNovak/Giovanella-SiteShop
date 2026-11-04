/**
 * Teste da geometria das trilhas de patinhas (sem DOM).
 * Executar com: node scripts/test-paws.mjs
 */
import {
  computeTrailPaw,
  seamProgress,
  stampTrail,
  TRAIL_HALF,
  PAW_SIZE,
} from '../src/js/modules/paws.js';

const LARGURA = 1200;
const COUNT = 9;

let falhas = 0;
const check = (nome, ok, detalhe = '') => {
  console.log(`${ok ? 'PASS' : 'FALHA'}  ${nome}${detalhe ? ' — ' + detalhe : ''}`);
  if (!ok) falhas += 1;
};

const trilha = (direction) =>
  Array.from({ length: COUNT }, (_, index) =>
    computeTrailPaw({ index, count: COUNT, width: LARGURA, direction })
  );

const direita = trilha(1); // da direita para a esquerda
const esquerda = trilha(-1); // da esquerda para a direita

// 1. A trilha atravessa a página inteira, começando e terminando fora da tela.
check(
  'trajeto comeca fora da tela e termina do outro lado',
  direita[0].x > LARGURA - 60 && direita[COUNT - 1].x < 60,
  `${direita[0].x.toFixed(0)}px -> ${direita[COUNT - 1].x.toFixed(0)}px`
);
check(
  'sentido invertido espelha o trajeto',
  esquerda[0].x < 60 && esquerda[COUNT - 1].x > LARGURA - 60
);

// 2. Avanco sempre no mesmo sentido, sem voltar atras.
let monotonico = true;
for (let i = 1; i < COUNT; i += 1) {
  if (direita[i].x >= direita[i - 1].x) monotonico = false;
}
check('as pegadas avancam sempre para o mesmo lado', monotonico);

// 3. A trilha CRUZA a divisa: comeca abaixo (y > 0) e termina acima (y < 0).
check(
  'a trilha cruza a divisa entre as secoes',
  direita[0].y > 0 && direita[COUNT - 1].y < 0,
  `y ${direita[0].y.toFixed(0)} -> ${direita[COUNT - 1].y.toFixed(0)}`
);

// 4. Nenhuma pegada se afasta demais da emenda.
const maxDistancia = Math.max(...direita.map((p) => Math.abs(p.y)));
check('nenhuma pegada se afasta demais da divisa', maxDistancia < 110, `${maxDistancia.toFixed(0)}px`);

// 4b. Regressao: a trilha e recortada por uma caixa de altura TRAIL_HALF*2.
//     Se a geometria crescer alem dela, as pegadas serao cortadas na vertical.
//     (Na horizontal o recorte e proposital: as pontas entram/saem da pagina.)
// A pegada ocupa de p.y ate p.y + PAW_SIZE dentro da caixa [-HALF, +HALF].
const cabeNaCaixa = [...direita, ...esquerda].every(
  (p) => p.y >= -TRAIL_HALF && p.y + PAW_SIZE <= TRAIL_HALF
);
check(
  'a geometria cabe na janela de recorte da trilha',
  cabeNaCaixa,
  `topo ${Math.min(...direita.map((p) => p.y)).toFixed(0)}px / base ${Math.max(...direita.map((p) => p.y + PAW_SIZE)).toFixed(0)}px, limite +-${TRAIL_HALF}px`
);

// 5. As patas alternam os lados do trajeto.
const desvio = direita.map((p, i) => {
  const reta = computeTrailPaw({ index: i, count: COUNT, width: LARGURA, direction: 1 });
  return reta;
});
check('pegadas consecutivas nao se sobrepoem', desvio.every((p, i) => {
  if (i === 0) return true;
  return Math.hypot(p.x - desvio[i - 1].x, p.y - desvio[i - 1].y) > 30;
}));

// 6. Giro coerente com o sentido da caminhada (aponta para onde o animal vai).
const giroDireita = direita[4].rotation;
const giroEsquerda = esquerda[4].rotation;
check(
  'os dois sentidos apontam para lados opostos',
  Math.abs(Math.abs(giroDireita - giroEsquerda) - 180) < 25,
  `${giroDireita.toFixed(0)}deg vs ${giroEsquerda.toFixed(0)}deg`
);

// 7. Determinismo: mesma entrada, mesma saida (nada de Math.random).
const a = computeTrailPaw({ index: 3, count: COUNT, width: LARGURA, direction: 1 });
const b = computeTrailPaw({ index: 3, count: COUNT, width: LARGURA, direction: 1 });
check('calculo deterministico', a.x === b.x && a.y === b.y && a.rotation === b.rotation);

// 8. Progresso da divisa: 0 na base da tela, 1 acima do meio, sempre limitado.
const vh = 800;
check('progresso zero quando a divisa esta na base', seamProgress(vh, vh) === 0);
check('progresso completo acima de 35% da altura', seamProgress(vh * 0.3, vh) === 1);
check('progresso intermediario no meio do caminho', Math.abs(seamProgress(vh * 0.675, vh) - 0.5) < 0.01);
check(
  'progresso nunca sai do intervalo 0..1',
  [-500, 0, 400, 900, 5000].every((y) => {
    const p = seamProgress(y, vh);
    return p >= 0 && p <= 1;
  })
);

// 9. Progresso cresce conforme a divisa sobe (scroll para baixo).
let cresce = true;
let anterior = seamProgress(vh, vh);
for (let y = vh; y >= 0; y -= 10) {
  const atual = seamProgress(y, vh);
  if (atual < anterior) cresce = false;
  anterior = atual;
}
check('progresso cresce enquanto a divisa sobe pela tela', cresce);

// 10. Carimbo e descarimbo: simetricos e sem tocar em quem nao mudou.
const fakeTrilha = () =>
  Array.from({ length: 6 }, () => {
    const estado = { marcada: false, toques: 0 };
    return {
      estado,
      classList: {
        add: () => {
          estado.marcada = true;
          estado.toques += 1;
        },
        remove: () => {
          estado.marcada = false;
          estado.toques += 1;
        },
      },
    };
  });

const paws = fakeTrilha();
let n = stampTrail(paws, 0, 4);
check(
  'carimba as primeiras pegadas do trajeto',
  n === 4 && paws.slice(0, 4).every((p) => p.estado.marcada) && !paws[4].estado.marcada
);

n = stampTrail(paws, n, 2);
check(
  'descarimba na ordem inversa (scroll para cima)',
  n === 2 && paws[1].estado.marcada && !paws[2].estado.marcada && !paws[3].estado.marcada
);

const toquesAntes = paws.map((p) => p.estado.toques);
n = stampTrail(paws, n, 2);
check(
  'nao toca no DOM quando nada muda',
  paws.every((p, i) => p.estado.toques === toquesAntes[i])
);

n = stampTrail(paws, n, 99);
check('limita ao tamanho da trilha', n === 6 && paws.every((p) => p.estado.marcada));

n = stampTrail(paws, n, -5);
check('limita no minimo zero', n === 0 && paws.every((p) => !p.estado.marcada));

console.log(falhas === 0 ? '\nTodos os testes passaram.' : `\n${falhas} teste(s) falharam.`);
process.exit(falhas === 0 ? 0 : 1);
