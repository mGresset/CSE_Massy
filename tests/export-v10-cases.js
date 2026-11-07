/* Génère le PPTX des cas de référence V10 (contrôle graphique, parité aperçu/PowerPoint).
 * Usage : node tests/export-v10-cases.js sortie.pptx [chemin/vers/@napi-rs/canvas] [sortie.layouts.json] */
'use strict';
const fs = require('fs'), path = require('path');
const { loadExport } = require('./lib/env');
const out = process.argv[2] || 'cas-v10.pptx', canvasPath = process.argv[3] || '', layoutsOut = process.argv[4] || '';
const CSE = loadExport(canvasPath || null);
let photo = () => '';
if (canvasPath) {
  require(path.join(__dirname, '..', 'js/core/demo-art.js'));
  photo = (t) => { const id = 'img:demo-' + t; CSE.images.put(id, globalThis.CSE.demoArt.paint(t, 900, 600)); return id; };
}
const cases = require('./fixtures/v10-cases.js').build(CSE, '2026-11-09', photo);
const entries = [];
CSE.templates.renderIssue(cases.project, cases.issue).forEach((r) => r.slides.forEach((s) => {
  const it = r.page.kind === 'item' ? CSE.compose.findItem(cases.project, r.page.itemId) : null;
  entries.push({ slide: s, title: it ? (cases.labels[it.id] || it.title) : r.page.kind });
}));
if (layoutsOut) fs.writeFileSync(layoutsOut, JSON.stringify(entries.map((e) => ({ title: e.title, slide: e.slide }))));
const t0 = Date.now();
CSE.pptx.toBlob(entries, { title: 'Cas V10' }).then((r) => {
  fs.writeFileSync(out, r.buffer);
  console.log('PPTX écrit :', out, entries.length, 'diapositives en', Date.now() - t0, 'ms');
  entries.forEach((e, i) => {
    const w = e.slide.warnings.filter((x) => x.level !== 'info').map((x) => x.msg);
    console.log(String(i + 1).padStart(2, '0') + ' ' + e.title + (e.slide.part ? ' (' + e.slide.part + ')' : '') + ' · min ' + (e.slide.minBody || '—') + (w.length ? '  ⚠ ' + w.join(' / ') : ''));
  });
}).catch((e) => { console.error(e); process.exit(1); });
