/* Génère le PPTX du MEL de démonstration avec le module d'export de l'application.
 * Usage : node tests/export-demo-pptx.js sortie.pptx [AAAA-MM-JJ] [chemin/vers/@napi-rs/canvas]
 * Sans canvas Node, la photo de voyage locale reste embarquée. */
'use strict';
const fs = require('fs'), path = require('path');
const { loadExport } = require('./lib/env');
const out = process.argv[2] || 'demo.pptx', ref = process.argv[3] || '2026-11-09', canvasPath = process.argv[4] || '';
const CSE = loadExport(canvasPath || null);
// Par défaut, garder une vraie photo de démonstration locale dans les slides
// de voyage, même sans bibliothèque canvas installée sur l'ordinateur.
let photo = (theme) => theme === 'travel' ? 'assets/sri-lanka.jpg' : '';
if (canvasPath) {
  require(path.join(__dirname, '..', 'js/core/demo-art.js'));
  photo = (t) => { const id = 'img:demo-' + t; CSE.images.put(id, globalThis.CSE.demoArt.paint(t, 900, 600)); return id; };
}
const p = CSE.demo.build(ref, photo);
const issue = p.issues[0];
issue.numbering = true;
const entries = [];
CSE.templates.renderIssue(p, issue).forEach((r) => r.slides.forEach((s) => entries.push({ slide: s, title: r.page.kind, notes: 'Page ' + r.page.kind + ' · modèle ' + s.templateId })));
const layouts = entries.map((e) => e.slide);
CSE.pptx.toBlob(entries, { title: 'MEL démo' }).then((r) => {
  fs.writeFileSync(out, r.buffer);
  fs.writeFileSync(out.replace(/\.pptx$/i, '') + '.layouts.json', JSON.stringify(layouts));
  console.log('PPTX écrit :', out, r.buffer.length, 'octets,', entries.length, 'diapositives', r.warnings.length ? '· avertissements : ' + r.warnings.join(' | ') : '');
}).catch((e) => { console.error(e); process.exit(1); });
