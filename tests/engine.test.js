/* Moteur de mise en page : 13 modèles, auto-layout, mosaïques 1/3/6, débordements, blocs facultatifs. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load();
const M = C.model, T = C.templates;
const REF = '2026-11-09';

function inBounds(slide, label) {
  for (const it of slide.items) {
    assert.ok([it.x, it.y, it.w, it.h].every(Number.isFinite), label + ' : coordonnées invalides');
    if (it.rot) continue; // pastilles inclinées volontairement débordantes
    assert.ok(it.x >= -0.5 && it.y >= -0.5 && it.x + it.w <= 1200.5 && it.y + it.h <= 675.5, label + ' : élément hors diapositive ' + JSON.stringify(it).slice(0, 140));
  }
}
function texts(slide) { return slide.items.filter((i) => i.t === 'text').map((i) => C.metrics.plain(i.paras)).join('\n'); }
function textItem(slide, field) { return slide.items.find((i) => i.t === 'text' && i.field === field); }
function project(items) { const p = M.blankProject(); p.items = items.map((o) => M.normalizeItem(Object.assign({ createdAt: '2026-09-01T00:00:00.000Z' }, o))); return p; }

test('les 13 modèles existent et la démo se rend sans élément hors cadre', () => {
  assert.equal(T.TEMPLATES.length, 13);
  const p = C.demo.build(REF);
  const out = T.renderIssue(p, p.issues[0]);
  let n = 0;
  const used = new Set();
  out.forEach((r) => r.slides.forEach((s) => { n++; used.add(s.templateId); inBounds(s, s.templateId); assert.ok(!s.overflow, s.templateId + ' déborde'); assert.ok(!s.minBody || s.minBody >= 12.5, s.templateId + ' police trop petite ' + s.minBody); }));
  assert.ok(n >= 15);
  for (const id of ['cover', 'calendar', 'info', 'classic', 'news', 'last', 'partner', 'upcoming-list', 'upcoming-table', 'rules', 'animation']) assert.ok(used.has(id), 'modèle ' + id + ' utilisé dans la démo');
  // Modèle « affiche » forcé
  const it = p.items.find((x) => /Karting/.test(x.title));
  const poster = T.renderPage(M.blankPage('item', { itemId: it.id, template: 'poster' }), p, p.issues[0]);
  assert.equal(poster[0].templateId, 'poster'); inBounds(poster[0], 'poster');
  const imm = T.renderPage(M.blankPage('item', { itemId: it.id, template: 'immersive' }), p, p.issues[0]);
  assert.equal(imm[0].templateId, 'immersive'); inBounds(imm[0], 'immersive');
});
test('sans tarifs, le texte récupère la place ; avec T1–T10, tarifs lisibles', () => {
  const base = { type: 'activity', title: 'Voyage Sri Lanka', dateStart: '2027-04-04', dateEnd: '2027-04-15', description: 'Un circuit découverte très varié. '.repeat(14), photos: ['assets/sri-lanka.jpg'] };
  const p = project([Object.assign({ id: 'a' }, base, { pricing: { enabled: true, mode: 'tranches', outside: '2400' } }), Object.assign({ id: 'b' }, base, { pricing: { enabled: false } })]);
  const issue = M.blankIssue(REF);
  const withP = T.renderPage(M.blankPage('item', { itemId: 'a', template: 'classic' }), p, issue)[0];
  const noP = T.renderPage(M.blankPage('item', { itemId: 'b', template: 'classic' }), p, issue)[0];
  const area = (s) => { const t = textItem(s, 'description'); return t.w * t.h; };
  assert.ok(area(noP) > area(withP) * 1.07, 'sans tarifs, la zone de texte récupère la place');
  assert.ok(withP.items.some((i) => i.t === 'rect' && i.fill === '#F8F6FE' && i.h <= 55), 'tarifs très compacts (≤ 55 px)');
  assert.ok(/T1 720 €/.test(texts(withP)) && /T10 1 800 €/.test(texts(withP)), 'T1 et T10 affichés');
  assert.ok(!/Tarifs CSE/i.test(texts(noP)), 'aucun bloc tarif');
  const priceTexts = withP.items.filter((i) => i.t === 'text' && i.field === 'tarifs');
  assert.ok(priceTexts.every((i) => i.size >= 11), 'tarifs ≥ 11 px (8,8 pt)');
});
test('description longue : avertissement explicite, puis scission sans perte', () => {
  const long = ('Paragraphe détaillé du programme avec de nombreuses informations pratiques. '.repeat(8) + '\n\n').repeat(4);
  const p = project([{ id: 'l', type: 'activity', title: 'Fiche très longue', dateStart: '2027-01-10', description: long, highlights: 'Un\nDeux\nTrois', pricing: { enabled: true, mode: 'tranches', outside: '500' }, photos: ['assets/sri-lanka.jpg'], contacts: [{ name: 'Référent' }] }]);
  const issue = M.blankIssue(REF);
  const words = (s) => s.replace(/[•…]/g, ' ').split(/\s+/).filter(Boolean).length;
  // Mode automatique (V9.1) : suite générée sur une autre diapositive, sans troncature ni police < 12 pt.
  const auto = T.renderPage(M.blankPage('item', { itemId: 'l' }), p, issue);
  assert.ok(auto.length >= 2, 'diapositive de suite générée automatiquement');
  assert.ok(auto[0].warnings.some((w) => w.code === 'auto-split'), 'message « Contenu trop long »');
  auto.forEach((s) => { assert.ok(!s.overflow, 'aucune troncature'); assert.ok(!s.minBody || s.minBody >= 15, 'corps ≥ 12 pt'); });
  assert.ok(/\(suite\)/.test(texts(auto[1])));
  const allText = auto.map(texts).join(' ');
  assert.ok(!/…/.test(allText), 'pas de points de suspension dans la description');
  assert.ok(words(allText) >= words(long), 'aucun mot perdu');
  // Scission forcée : toujours deux diapositives.
  const two = T.renderPage(M.blankPage('item', { itemId: 'l', split: true }), p, issue);
  assert.ok(two.length >= 2);
  two.forEach((s) => { assert.ok(!s.minBody || s.minBody >= 15); assert.ok(!s.overflow); });
  // Scission désactivée explicitement : débordement visible et signalé (jamais silencieux).
  const off = T.renderPage(M.blankPage('item', { itemId: 'l', split: 'off' }), p, issue);
  assert.equal(off.length, 1);
  assert.ok(off[0].overflow && /…/.test(texts(off[0])), 'troncature visible');
  assert.ok(off[0].warnings.some((w) => w.code === 'suggest-split'));
  // Texte démesuré : plusieurs diapositives de suite, toujours lisibles.
  p.items[0].description = long + long + long;
  const many = T.renderPage(M.blankPage('item', { itemId: 'l' }), p, issue);
  assert.ok(many.length >= 3);
  many.forEach((s) => assert.ok(!s.overflow));
});
function mosaicCase(kind, n) {
  const items = [];
  for (let i = 0; i < n; i++) items.push({ id: 'm' + i, type: 'activity', title: 'Activité numéro ' + (i + 1) + ' avec un titre assez long', editorial: kind === 'news' ? 'new' : 'auto', regEnd: kind === 'last' ? '2026-11-1' + (i % 7) : '', dateStart: '2026-12-0' + (i + 1), photos: i % 2 ? ['assets/sri-lanka.jpg'] : [] });
  const p = project(items);
  const issue = M.blankIssue(REF);
  return T.renderPage(M.blankPage(kind), p, issue);
}
test('nouveautés et dernières chances : 1, 3 et 6 activités sans chevauchement', () => {
  for (const kind of ['news', 'last']) for (const n of [1, 3, 6]) {
    const slides = mosaicCase(kind, n);
    assert.equal(slides.length, 1, kind + ' ' + n + ' : une seule diapositive');
    const s = slides[0];
    inBounds(s, kind + n);
    const titles = s.items.filter((i) => i.t === 'text' && i.field === 'titre de carte');
    assert.equal(titles.length, n, kind + ' ' + n + ' cartes');
    const cards = s.items.filter((i) => i.t === 'rect' && i.fill === '#FFFFFF' && i.r === 14 && i.y > 240);
    assert.equal(cards.length, n);
    for (let a = 0; a < cards.length; a++) for (let b = a + 1; b < cards.length; b++) {
      const A = cards[a], B = cards[b];
      const overlap = A.x < B.x + B.w - 0.5 && B.x < A.x + A.w - 0.5 && A.y < B.y + B.h - 0.5 && B.y < A.y + A.h - 0.5;
      assert.ok(!overlap, kind + ' ' + n + ' : cartes superposées');
    }
    assert.ok(!s.overflow, kind + ' ' + n + ' : texte tronqué');
    if (kind === 'last') assert.ok(/J−\d|Dernier jour/.test(texts(s)), 'compteur J−x');
  }
  assert.equal(mosaicCase('news', 9).length, 2, 'au-delà de 6 : diapositive supplémentaire');
});
test('contacts multiples et points : affichés seulement s’ils sont saisis', () => {
  const p = project([
    { id: 'x', type: 'activity', title: 'Avec infos', dateStart: '2026-12-01', contacts: [{ name: 'Alice', email: 'a@exemple.org' }, { name: 'Bruno' }], points: { value: '24', counter: 'long' } },
    { id: 'y', type: 'activity', title: 'Sans infos', dateStart: '2026-12-01' },
    { id: 'z', type: 'activity', title: 'Points courts', dateStart: '2026-12-01', points: { value: '9', counter: 'short' } },
    { id: 'w', type: 'activity', title: 'Points France', dateStart: '2026-12-01', points: { value: '3', counter: 'france' } }
  ]);
  const issue = M.blankIssue(REF);
  const a = texts(T.renderPage(M.blankPage('item', { itemId: 'x', template: 'classic' }), p, issue)[0]);
  const b = texts(T.renderPage(M.blankPage('item', { itemId: 'y', template: 'classic' }), p, issue)[0]);
  assert.ok(/Alice/.test(a) && /Bruno/.test(a), 'noms affichés');
  assert.ok(!/a@exemple\.org/.test(a), 'e-mail non imprimé (V9.1 : lien mailto sur le nom)');
  assert.ok(/24 points · Séjour long/.test(a));
  assert.ok(!/Contact/.test(b) && !/POINTS|points/.test(b), 'aucun bloc vide');
  assert.ok(/Séjour court/.test(texts(T.renderPage(M.blankPage('item', { itemId: 'z', template: 'classic' }), p, issue)[0])));
  assert.ok(/Séjour FRANCE/.test(texts(T.renderPage(M.blankPage('item', { itemId: 'w', template: 'classic' }), p, issue)[0])));
});
test('calendrier : jours colorés, cases cliquables, légende', () => {
  const p = project([{ id: 'c', type: 'calendar', title: 'Permanences', calendar: { month: '2026-11', days: { '2026-11-02': 'open', '2026-11-04': 'closed' } } }]);
  const s = T.renderPage(M.blankPage('item', { itemId: 'c' }), p, M.blankIssue(REF))[0];
  inBounds(s, 'calendar');
  const cells = s.items.filter((i) => i.t === 'rect' && i.act && i.act.type === 'calendar-day');
  assert.equal(cells.length, 21, '21 jours ouvrés en novembre 2026');
  assert.equal(cells.find((c) => c.act.date === '2026-11-02').fill, '#8BC34A');
  assert.equal(cells.find((c) => c.act.date === '2026-11-04').fill, '#E5484D');
  assert.ok(/Novembre 2026/.test(texts(s)) && /Fermé/.test(texts(s)));
});
test('règlement : pagination automatique et numérotation continue', () => {
  const body = Array.from({ length: 40 }, (_, i) => (i % 5 === 0 ? '# Section ' + i + '\n' : '') + 'Article ' + i + ' : règle détaillée sur les inscriptions, paiements et désistements applicables.').join('\n\n');
  const p = project([{ id: 'r', type: 'rules', title: 'Règlement', description: body, notes: 'Paiement obligatoire' }, { id: 'a', type: 'activity', title: 'A', dateStart: '2026-12-01' }]);
  const issue = M.blankIssue(REF);
  issue.numbering = true;
  issue.pages = [M.blankPage('item', { itemId: 'r' }), M.blankPage('cover'), M.blankPage('item', { itemId: 'a' })];
  const out = T.renderIssue(p, issue);
  assert.equal(out[0].page.kind, 'cover'); assert.equal(out[out.length - 1].page.itemId, 'r', 'règlement en fin');
  const rules = out[out.length - 1].slides;
  assert.ok(rules.length >= 2, 'plusieurs diapositives');
  rules.forEach((s) => { inBounds(s, 'rules'); assert.ok(!s.overflow); assert.ok(s.minBody >= 13); });
  const numbers = [].concat(...out.map((r) => r.slides.map((s) => s.pageNumber)));
  assert.deepEqual(numbers, numbers.map((_, i) => i + 1), 'numérotation 1..n');
  // Le numéro réellement dessiné sur chaque diapositive suit la même séquence.
  const drawn = [].concat(...out.map((r) => r.slides.map((s) => { const t = s.items.find((i) => i.t === 'text' && i.x === 1100 && i.y === 649); return t ? Number(C.metrics.plain(t.paras)) : null; })));
  assert.deepEqual(drawn, numbers, 'numéros affichés');
});
test('modèle Information sans date ni tarif', () => {
  const p = project([{ id: 'i', type: 'info', title: 'Dépôt des avis d’imposition', summary: 'Le dépôt évolue cette année.', description: 'Aucune démarche à effectuer pour le moment.', notes: 'Merci de ne pas envoyer de mail au CSE.' }]);
  const s = T.renderPage(M.blankPage('item', { itemId: 'i' }), p, M.blankIssue(REF))[0];
  assert.equal(s.templateId, 'info'); inBounds(s, 'info');
  assert.ok(!/TARIFS/.test(texts(s))); assert.ok(/ne pas envoyer/.test(texts(s)));
  assert.equal(s.warnings.filter((w) => w.level !== 'info').length, 0);
});
test('offre partenaire', () => {
  const p = project([{ id: 'o', type: 'partner', title: 'Parfumerie', partner: { offer: 'Remise supplémentaire', amount: '−20 %', code: 'BF2026', validUntil: '2026-11-30' }, link: { type: 'custom', url: 'https://www.exemple.org', label: 'Voir' } }]);
  const s = T.renderPage(M.blankPage('item', { itemId: 'o' }), p, M.blankIssue(REF))[0];
  const t = texts(s);
  assert.ok(/CODE : BF2026/.test(t) && /−20 %/.test(t) && /30 novembre 2026/.test(t));
  assert.ok(s.items.some((i) => i.t === 'text' && i.link === 'https://www.exemple.org/' || i.link === 'https://www.exemple.org'), 'lien cliquable');
});
test('mesure du texte : même découpage que la police Arial', () => {
  const Mx = C.metrics;
  assert.equal(Math.round(Mx.width('Hello World', 20, false)), 103);
  assert.ok(Mx.width('ÉÈÀ', 20, true) === Mx.width('EEA', 20, true));
  const f = Mx.fit('mot '.repeat(400), 300, 100, { max: 20, min: 12 });
  assert.equal(f.overflow, true); assert.equal(f.size, 12); assert.ok(f.hidden > 0);
});
done('moteur de mise en page');
