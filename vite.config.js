import { defineConfig } from 'vite';
import { resolve } from 'node:path';

/**
 * Configuração do Vite.
 *
 * O site é HTML/CSS/JS puro: o Vite serve apenas como servidor de
 * desenvolvimento e empacotador (minificação + hash de cache). Não há
 * framework de UI, o que mantém o JavaScript enviado ao navegador mínimo.
 */
export default defineConfig({
  // Caminhos relativos à raiz do domínio (troque para './' em subdiretórios).
  base: '/',

  build: {
    outDir: 'dist',
    // Navegadores suportados. O esbuild rebaixa a SINTAXE para esses alvos
    // (ex.: `?.`/`??` no JS; `inset` -> top/right/bottom/left no CSS).
    // Ele NÃO adiciona polyfills de APIs — essas diferenças são tratadas no
    // próprio código (ver env.js e css/compat.css).
    target: ['es2019', 'chrome88', 'edge88', 'firefox78', 'safari14', 'ios14'],
    cssTarget: ['chrome88', 'edge88', 'firefox78', 'safari14', 'ios14'],
    cssMinify: true,
    // Inline apenas de assets muito pequenos; o resto vira arquivo com hash.
    assetsInlineLimit: 2048,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacidade: resolve(__dirname, 'privacidade.html'),
        // A Vercel serve /404.html automaticamente para endereços inexistentes.
        erro404: resolve(__dirname, '404.html'),
      },
    },
  },

  server: {
    // Respeita a variável PORT quando definida; senão usa a porta padrão.
    port: Number(process.env.PORT) || 5173,
    open: true,
  },
});
