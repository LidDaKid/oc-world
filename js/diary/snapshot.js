// saving a page (or both open pages) as a png: paper, writing, drawing, stickers + photos, all of it.
// html-to-image does the drawing. we hand it just the fonts that are really on the page (it would grab every font otherwise).

const LIB = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm';
let lib = null;
const fontCache = new Map(); // woff2 url -> data url

const toDataURL = blob => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});

function familiesIn(node) {
  const used = new Set();
  for (const el of [node, ...node.querySelectorAll('*')]) {
    const f = getComputedStyle(el).fontFamily;
    for (const name of f.split(',')) used.add(name.trim().replace(/^["']|["']$/g, '').toLowerCase());
  }
  return used;
}

// @font-face rules for the fonts in use (latin letters only, so it stays small), with the files baked in
async function fontCSS(node) {
  const used = familiesIn(node);
  const sheets = [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href).filter(u => u.includes('fonts.googleapis.com'));
  let out = '';
  for (const href of sheets) {
    let css = '';
    try { css = await (await fetch(href)).text(); } catch { continue; }
    const blocks = css.split(/(?=\/\*[^*]*\*\/\s*@font-face)|(?=@font-face)/).filter(b => b.includes('@font-face'));
    for (const block of blocks) {
      const fam = (block.match(/font-family:\s*['"]?([^;'"]+)/) || [])[1];
      if (!fam || !used.has(fam.toLowerCase())) continue;
      const label = (block.match(/\/\*\s*([\w-]+)\s*\*\//) || [])[1];
      if (label && label !== 'latin') continue;
      const url = (block.match(/url\(([^)]+)\)/) || [])[1];
      if (!url) continue;
      try {
        if (!fontCache.has(url)) fontCache.set(url, toDataURL(await (await fetch(url)).blob()));
        const data = await fontCache.get(url);
        out += block.replace(/\/\*[^*]*\*\//, '').replace(url, data) + '\n';
      } catch { /* that font just won't be baked in */ }
    }
  }
  return out;
}

// node = the page (or the spread). resolves when the download has started
export async function savePNG(node, filename) {
  lib ||= import(LIB);
  const { toBlob } = await lib;
  const fontEmbedCSS = await fontCSS(node);
  const opts = {
    pixelRatio: 2,
    fontEmbedCSS,
    width: node.offsetWidth,
    height: node.offsetHeight,
    style: { transform: 'none', left: '0', top: '0', margin: '0' },
    filter: el => !(el.classList && (el.classList.contains('it-h') || el.classList.contains('leaf') || el.classList.contains('song-state') || el.classList.contains('tw-strike'))),
    imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  };
  node.classList.add('snapping');
  try {
    // the first go warms up pictures, the second one has them all (a known html-to-image quirk with fresh images)
    await toBlob(node, opts).catch(() => null);
    const blob = await toBlob(node, opts);
    if (!blob) throw new Error('no picture');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 8000);
    return blob;
  } finally {
    node.classList.remove('snapping');
  }
}
