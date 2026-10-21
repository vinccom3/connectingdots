// Contrast of the panel and index texts for the current theme (WCAG 2.1, minimum 4.5:1).
// The panel sits over the nebula at 96 % (90 % on the phone sheet's top edge), so the
// backdrop is mixed with the brightest wisp of nebula colour: that is the worst case.
import T from '../src/theme.js';

const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const enc = c => Math.round(255 * (c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055));
const lum = rgb => { const [r, g, b] = rgb.map(lin); return .2126 * r + .7152 * g + .0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

// brightest nebula pixel: base + wisp A at full strength (the shader works in linear light)
const neb = hex(T.nebula.base).map((c, i) => enc(Math.min(1, lin(c) + lin(hex(T.nebula.a)[i]) * T.nebula.aAmount + lin(hex(T.nebula.b)[i]) * T.nebula.bAmount)));
const bg = hex(T.bg), fg = hex(T.fg);
const rows = [];
for (const [where, a] of [['panel', .96], ['phone sheet', .9]]) {
  const back = over(bg, a, neb);
  rows.push([`${where}: title, connections`, ratio(fg, back)]);
  rows.push([`${where}: note text`, ratio(over(fg, .86, back), back)]);
  rows.push([`${where}: meta keys, verbs (dim)`, ratio(over(fg, T.dim, back), back)]);
  rows.push([`${where}: kind (accent)`, ratio(hex(T.accent), back)]);
}
rows.push(['index: names', ratio(bg, fg)]);
rows.push(['index: kinds', ratio(over(bg, T.indexDim, fg), fg)]);
rows.push(['index: hover', ratio(hex(T.indexHover), fg)]);

let fail = 0;
console.log(`theme ${T.name}`);
for (const [k, r] of rows) { const ok = r >= 4.5; if (!ok) fail++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  ${k}`); }
process.exit(fail ? 1 : 0);
