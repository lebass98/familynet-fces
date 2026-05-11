import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'glob';
import nunjucks from 'nunjucks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, 'src');

nunjucks.configure(srcDir, { autoescape: false, noCache: true });

const htmlFiles = globSync('**/*.html', {
  cwd: srcDir,
  ignore: ['_inc/**', 'node_modules/**'],
});

const input = Object.fromEntries(
  htmlFiles.map((file) => {
    const name = file.replace(/\.html$/, '').replace(/\//g, '_') || 'index';
    return [name, resolve(srcDir, file)];
  })
);

function nunjucksPlugin() {
  return {
    name: 'vite-plugin-nunjucks',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return nunjucks.renderString(html, {});
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.html')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  root: srcDir,
  publicDir: resolve(__dirname, 'public'),
  base: '/familynet-fces/',
  plugins: [nunjucksPlugin()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input,
      output: {
        entryFileNames: 'js/[name].js',
        chunkFileNames: 'js/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (/\.css$/.test(name)) return 'css/[name][extname]';
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) return 'images/[name][extname]';
          if (/\.(woff2?|ttf|otf|eot)$/.test(name)) return 'fonts/[name][extname]';
          return 'assets/[name][extname]';
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});
