/**
 * ILUSTRAÇÕES DO MODO DEMONSTRAÇÃO DA LOJA
 *
 * Desenha imagens simples de produtos (máquina, tesoura, escova...) para os
 * produtos FICTÍCIOS de src/loja/produtos-demonstracao.js. São desenhos
 * próprios, feitos aqui em SVG — nenhuma foto de anúncio foi copiada.
 *
 * Uso:   node scripts/gerar-fotos-demonstracao.mjs
 * Saída: public/img/loja/demo/<nome>.jpg + .webp (800x800)
 *
 * Quando a loja tiver produtos reais, esta pasta pode ser apagada junto com
 * o modo demonstração (ver AFFILIATE_CONFIGURATION.md, seção 13).
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public', 'img', 'loja', 'demo');

/** Moldura comum: fundo claro e uma sombra suave no "chão". */
const moldura = (fundo, desenho) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="#ffffff"/>
  <circle cx="400" cy="390" r="300" fill="${fundo}"/>
  <ellipse cx="400" cy="680" rx="230" ry="26" fill="#000" opacity="0.07"/>
  ${desenho}
</svg>`;

const DESENHOS = {
  // Máquina de tosa: corpo arredondado, faixa de borracha e lâmina.
  'maquina-de-tosa': moldura('#e8eedd', `
    <g transform="rotate(-28 400 400)">
      <rect x="330" y="170" width="140" height="440" rx="70" fill="#2f3a2a"/>
      <rect x="330" y="330" width="140" height="120" fill="#5f7f35"/>
      <rect x="345" y="140" width="110" height="60" rx="10" fill="#c9ccc4"/>
      <g fill="#9aa093">${Array.from({ length: 9 }, (_, i) => `<rect x="${349 + i * 12}" y="112" width="7" height="34" rx="2"/>`).join('')}</g>
      <circle cx="400" cy="540" r="16" fill="#a8bc83"/>
      <rect x="388" y="600" width="24" height="60" rx="8" fill="#1f261b"/>
    </g>`),

  // Tesoura reta: duas lâminas cruzadas e argolas.
  tesoura: moldura('#efe7d6', `
    <g transform="rotate(-38 400 400)">
      <path d="M392 120 L414 120 L420 430 L392 430 Z" fill="#cfd3d6"/>
      <path d="M408 120 L386 120 L380 430 L408 430 Z" fill="#b5babe" transform="rotate(9 400 430)"/>
      <circle cx="400" cy="432" r="10" fill="#6c7277"/>
      <circle cx="350" cy="560" r="62" fill="none" stroke="#294908" stroke-width="26"/>
      <circle cx="458" cy="560" r="54" fill="none" stroke="#294908" stroke-width="26"/>
      <path d="M392 440 L362 500 M410 440 L440 508" stroke="#294908" stroke-width="26" stroke-linecap="round"/>
    </g>`),

  // Rasqueadeira (slicker): cabeça com cerdas e cabo.
  escova: moldura('#e6ecef', `
    <g transform="rotate(-20 400 400)">
      <rect x="250" y="170" width="300" height="200" rx="40" fill="#c97855"/>
      <rect x="270" y="190" width="260" height="160" rx="28" fill="#f2efe4"/>
      <g fill="#8a8f86">${Array.from({ length: 8 }, (_, c) => Array.from({ length: 5 }, (_, l) => `<circle cx="${292 + c * 31}" cy="${212 + l * 29}" r="5"/>`).join('')).join('')}</g>
      <rect x="370" y="360" width="60" height="290" rx="30" fill="#c97855"/>
      <rect x="384" y="430" width="32" height="170" rx="16" fill="#a85f40"/>
    </g>`),

  // Pente de metal: barra com dentes de dois espaçamentos.
  pente: moldura('#ebe8f0', `
    <g transform="rotate(-15 400 400)">
      <rect x="170" y="300" width="460" height="70" rx="16" fill="#b5babe"/>
      <g fill="#cfd3d6">${Array.from({ length: 16 }, (_, i) => `<rect x="${182 + i * (i < 8 ? 26 : 30) + (i >= 8 ? -16 : 0)}" y="360" width="${i < 8 ? 9 : 12}" height="190" rx="4"/>`).join('')}</g>
      <rect x="170" y="300" width="460" height="20" rx="10" fill="#e3e6e8"/>
    </g>`),

  // Shampoo profissional: galão com rótulo verde.
  shampoo: moldura('#e2eee8', `
    <rect x="300" y="230" width="200" height="420" rx="42" fill="#f7f5ee" stroke="#d9d3c1" stroke-width="6"/>
    <rect x="350" y="170" width="100" height="70" rx="12" fill="#294908"/>
    <rect x="372" y="130" width="56" height="50" rx="8" fill="#5f7f35"/>
    <rect x="320" y="330" width="160" height="200" rx="18" fill="#a8bc83"/>
    <circle cx="400" cy="400" r="34" fill="#f7f5ee"/>
    <rect x="345" y="455" width="110" height="14" rx="7" fill="#294908"/>
    <rect x="365" y="482" width="70" height="12" rx="6" fill="#294908" opacity="0.6"/>`),

  // Máscara de hidratação: pote com tampa.
  hidratante: moldura('#f1e8e1', `
    <rect x="250" y="380" width="300" height="260" rx="34" fill="#f7f5ee" stroke="#d9d3c1" stroke-width="6"/>
    <rect x="235" y="300" width="330" height="96" rx="24" fill="#c69a4b"/>
    <rect x="235" y="300" width="330" height="26" rx="13" fill="#d8b678"/>
    <rect x="290" y="450" width="220" height="130" rx="16" fill="#efe1c6"/>
    <path d="M400 470 c-30 40 -30 70 0 80 c30 -10 30 -40 0 -80 z" fill="#c69a4b"/>`),

  // Soprador/secador: corpo, bocal e mangueira.
  secador: moldura('#e5e9f1', `
    <rect x="200" y="250" width="300" height="230" rx="60" fill="#294908"/>
    <rect x="490" y="320" width="150" height="90" rx="20" fill="#3d5f17"/>
    <rect x="620" y="330" width="40" height="70" rx="10" fill="#1d3505"/>
    <circle cx="320" cy="365" r="70" fill="#5f7f35"/>
    <circle cx="320" cy="365" r="30" fill="#a8bc83"/>
    <rect x="240" y="470" width="60" height="150" rx="16" fill="#1f261b"/>
    <path d="M270 620 C 270 680, 420 680, 470 640" stroke="#1f261b" stroke-width="22" fill="none" stroke-linecap="round"/>`),

  // Kit de laços: três laços coloridos.
  lacos: moldura('#f3e6ea', `
    ${[[290, 330, '#c97855'], [510, 330, '#5f7f35'], [400, 500, '#c69a4b']].map(([x, y, cor]) => `
    <g transform="translate(${x} ${y})">
      <path d="M0 0 L-95 -60 Q-120 0 -95 60 Z" fill="${cor}"/>
      <path d="M0 0 L95 -60 Q120 0 95 60 Z" fill="${cor}"/>
      <circle r="26" fill="${cor}" stroke="#ffffff" stroke-width="6"/>
    </g>`).join('')}`),
};

await mkdir(DESTINO, { recursive: true });
for (const [nome, svg] of Object.entries(DESENHOS)) {
  const base = sharp(Buffer.from(svg)).flatten({ background: '#ffffff' });
  await base.clone().webp({ quality: 80 }).toFile(join(DESTINO, `${nome}.webp`));
  await base.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(join(DESTINO, `${nome}.jpg`));
  console.log(`img/loja/demo/${nome}  800x800`);
}
console.log(`\n${Object.keys(DESENHOS).length} ilustrações geradas em public/img/loja/demo/.`);
