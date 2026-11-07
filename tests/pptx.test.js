/* Export PowerPoint : fichier ouvrable, textes modifiables (Arial), liens cliquables, bandeau unique et net. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { loadExport } = require('./lib/env');
const C = loadExport(null);
const JSZip = globalThis.JSZip;

(async () => {
  const p = C.demo.build('2026-11-09');
  const issue = p.issues[0];
  issue.numbering = true;
  const entries = [];
  C.templates.renderIssue(p, issue).forEach((r) => r.slides.forEach((s) => entries.push({ slide: s, title: r.page.kind, notes: 'Note ' + s.templateId })));
  const res = await C.pptx.toBlob(entries, { title: 'MEL test' });
  const zip = await JSZip.loadAsync(res.buffer);
  const files = Object.keys(zip.files).filter((f) => !zip.files[f].dir);
  const slides = files.filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  test('fichier PPTX valide, une diapositive par page rendue', () => {
    assert.ok(files.includes('[Content_Types].xml') && files.includes('ppt/presentation.xml'));
    assert.equal(slides.length, entries.length);
    assert.equal(res.warnings.length, 0);
  });
  const pres = await zip.file('ppt/presentation.xml').async('string');
  test('format 16:9 (13,333 × 7,5 pouces)', () => {
    assert.ok(/<p:sldSz cx="12192000" cy="6858000"/.test(pres), 'taille de diapositive');
  });
  const layoutFiles = files.filter((f) => /slide(Masters|Layouts)\/slide(Master|Layout)\d+\.xml$/.test(f));
  const layoutXml = (await Promise.all(layoutFiles.map((f) => zip.file(f).async('string')))).join('');
  const original = require('fs').readFileSync(require('path').join(__dirname, '../assets/bandeau-cse.jpg'));
  const mediaBufs = await Promise.all(files.filter((f) => /^ppt\/media\//.test(f)).map((f) => zip.file(f).async('nodebuffer')));
  test('bandeau officiel dans le masque, JPEG d’origine non recompressé', () => {
    assert.ok(/<p:pic>/.test(layoutXml), 'image du bandeau dans la disposition maître');
    assert.ok(mediaBufs.some((b) => b.equals(original)), 'octets identiques au fichier bandeau-cse.jpg (1920 × 282)');
    assert.equal(mediaBufs.filter((b) => b.equals(original)).length, 1, 'une seule copie du bandeau');
  });
  let xml = '';
  for (const f of slides) xml += await zip.file(f).async('string');
  test('textes modifiables en Arial, sans image de diapositive entière', () => {
    assert.ok((xml.match(/<a:t>/g) || []).length > 300, 'nombreuses zones de texte');
    assert.ok(/typeface="Arial"/.test(xml));
    assert.ok(/MEL DU CSE – SEMAINE 46/.test(xml));
    assert.ok(/Circuit Sri Lanka authenticité/.test(xml));
    assert.ok(/<a:lnSpc><a:spcPts val="\d+"\/><\/a:lnSpc>/.test(xml), 'interligne exact identique à l’aperçu');
  });
  const rels = (await Promise.all(files.filter((f) => /^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(f)).map((f) => zip.file(f).async('string')))).join('');
  test('liens cliquables (portail, liens personnalisés)', () => {
    assert.ok((xml.match(/<a:hlinkClick /g) || []).length >= 10);
    assert.ok(/cethaleslasmassy\.portailce\.com/.test(rels));
    assert.ok(/www\.exemple\.org\/offre-cse/.test(rels));
  });
  test('numérotation des pages et notes', () => {
    assert.ok(/<a:t>17<\/a:t>/.test(xml) || /<a:t>18<\/a:t>/.test(xml), 'numéro de page présent');
    assert.ok(files.some((f) => /notesSlide/.test(f)));
  });
  test('formes natives et pictogrammes vectoriels (forme libre), sans pastille inclinée', () => {
    assert.ok(/prstGeom prst="roundRect"/.test(xml));
    assert.ok(/<a:custGeom>/.test(xml) && /<a:quadBezTo>/.test(xml), 'pictogrammes en forme libre');
    assert.ok(!/rot="-720000"/.test(xml), 'plus de pastille « NEW ! » inclinée');
  });
  done('export PowerPoint (' + slides.length + ' diapositives, ' + Math.round(res.buffer.length / 1024) + ' Ko)');
})().catch((e) => { console.error(e); process.exit(1); });
