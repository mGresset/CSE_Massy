/* Exporte le MEL témoin V10 (33 diapositives fictives) en PowerPoint modifiable.
 * Usage : node tests/export-v10-demo.js sortie.pptx [chemin/vers/@napi-rs/canvas] */
'use strict';
const fs = require('fs'), path = require('path');
const { loadExport } = require('./lib/env');
const out = process.argv[2] || 'CSE_MEL_2026_Semaine_46_DEMO.pptx', canvasPath = process.argv[3] || '';
const CSE = loadExport(canvasPath || null);
let photo = () => '';
if (canvasPath) {
  require(path.join(__dirname, '..', 'js/core/demo-art.js'));
  photo = (t) => { const id = 'img:demo-' + t; CSE.images.put(id, globalThis.CSE.demoArt.paint(t, 1200, 800)); return id; };
}
const demo = require('./fixtures/v10-demo.js').build(CSE, '2026-11-09', photo);
const entries = [];
const t0 = Date.now();
CSE.templates.renderIssue(demo.project, demo.issue).forEach((r) => r.slides.forEach((s) => {
  const it = r.page.kind === 'item' ? CSE.compose.findItem(demo.project, r.page.itemId) : null;
  entries.push({ slide: s, title: it ? it.title : r.page.kind, notes: 'MEL témoin CSE Studio V10 — données fictives.' });
}));
const layoutMs = Date.now() - t0;
CSE.pptx.toBlob(entries, { title: 'MEL témoin CSE Studio V10 (fictif)' }).then((r) => {
  fs.writeFileSync(out, r.buffer);
  const templates = new Set(entries.map((e) => e.slide.templateId));
  console.log('MEL témoin :', entries.length, 'diapositives,', templates.size, 'modèles (' + Array.from(templates).join(', ') + '), calcul', layoutMs, 'ms, contrôle', JSON.stringify(r.check));
  entries.forEach((e, i) => { const w = e.slide.warnings.filter((x) => x.level !== 'info').map((x) => x.msg); if (w.length) console.log('  ⚠ ' + (i + 1) + ' ' + e.title + ' : ' + w.join(' / ')); });
}).catch((e) => { console.error(e); process.exit(1); });
