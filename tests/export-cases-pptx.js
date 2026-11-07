/* Génère le PPTX des 5 cas de référence V9.1 (captures avant/après, parité HTML/PPTX).
 * Usage : node tests/export-cases-pptx.js sortie.pptx [chemin/vers/@napi-rs/canvas] */
'use strict';
const fs = require('fs'), path = require('path');
const { loadExport } = require('./lib/env');
const out = process.argv[2] || 'cas-v91.pptx', canvasPath = process.argv[3] || '';
const CSE = loadExport(canvasPath || null);
let photo = () => '';
if (canvasPath) {
  require(path.join(__dirname, '..', 'js/core/demo-art.js'));
  photo = (t) => { const id = 'img:demo-' + t; CSE.images.put(id, globalThis.CSE.demoArt.paint(t, 900, 600)); return id; };
}
const cases = require('./fixtures/v91-cases.js').build(CSE, '2026-11-09', photo);
const entries = [];
CSE.templates.renderIssue(cases.project, cases.issue).forEach((r, i) => r.slides.forEach((s) => entries.push({ slide: s, title: cases.labels[i] })));
CSE.pptx.toBlob(entries, { title: 'Cas V9.1' }).then((r) => {
  fs.writeFileSync(out, r.buffer);
  console.log('PPTX écrit :', out, entries.length, 'diapositives :', entries.map((e) => e.title + (e.slide.part ? ' ' + e.slide.part : '')).join(' | '));
  entries.forEach((e) => { const w = e.slide.warnings.filter((x) => x.level !== 'info').map((x) => x.msg); if (w.length) console.log('  ⚠ ' + e.title + ' : ' + w.join(' / ')); });
}).catch((e) => { console.error(e); process.exit(1); });
