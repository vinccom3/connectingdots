import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The index list is rendered into the HTML at build time so search engines and
// no-JS visitors get the full directory. At runtime main.js rebuilds it from the
// same JSON, so a data edit without a rebuild still shows up in the live page.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function staticIndex() {
  return {
    name: 'static-index',
    transformIndexHtml(html, ctx) {
      if (!ctx.filename.endsWith('/index.html') || ctx.filename.includes('/legacy/')) return html;
      const nodes = JSON.parse(readFileSync(resolve('public/data/nodes.json'), 'utf8'));
      const items = [...nodes].sort((a, b) => a.label.localeCompare(b.label, 'en'))
        .map(n => `<li><button type="button" data-id="${esc(n.id)}">${esc(n.label)}</button><small>${esc(n.kind)}</small></li>`).join('');
      return html.replace('<!--INDEX-->', items);
    },
  };
}

export default defineConfig({
  plugins: [staticIndex()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: { main: resolve('index.html'), v1: resolve('legacy/v1.html') } },
  },
});
