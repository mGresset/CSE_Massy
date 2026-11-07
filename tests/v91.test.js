/* Critères d'acceptation V9.1 : tarifs compacts, texte adaptatif, lisibilité ≥ 12 pt, titres, contacts mailto,
 * pictogrammes, statuts pastel, permanences à horaires, mosaïques, document complet. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { loadExport } = require('./lib/env');
const C = loadExport(null);
const M = C.model, T = C.templates, Mx = C.metrics;
const REF = '2026-11-09';
const JSZip = globalThis.JSZip;

function project(items) { const p = M.blankProject(); p.items = items.map((o) => M.normalizeItem(Object.assign({ createdAt: '2026-09-01T00:00:00.000Z' }, o))); return p; }
function render(p, id, extra) { return T.renderPage(M.blankPage('item', Object.assign({ itemId: id }, extra || {})), p, M.blankIssue(REF)); }
function texts(s) { return s.items.filter((i) => i.t === 'text').map((i) => Mx.plain(i.paras)).join('\n'); }
function body(s) { return s.items.filter((i) => i.t === 'text' && /description|suite/.test(i.field)); }
function area(list) { return list.reduce((a, i) => a + i.w * Math.min(i.h, Mx.textHeight(i.paras, i.w, i.size) + 1), 0); }
function inter(a, b) { return a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1; }
function noCollision(s, label) {
  const tb = body(s).map((t) => ({ x: t.x, y: t.y, w: t.w, h: Math.min(t.h, Mx.textHeight(t.paras, t.w, t.size)) }));
  const obstacles = s.items.filter((i) => (i.t === 'image' && i.role !== 'banner') || (i.t === 'rect' && i.r >= 6 && i.w > 60 && i.h > 20 && i.y > 180 && i.y < 640));
  tb.forEach((t) => obstacles.forEach((o) => assert.ok(!inter(t, o), label + ' : texte superposé à un bloc ' + JSON.stringify(o).slice(0, 90))));
  for (let i = 0; i < tb.length; i++) for (let j = i + 1; j < tb.length; j++) assert.ok(!inter(tb[i], tb[j]), label + ' : colonnes superposées');
}
const SENT = 'Le circuit permet de découvrir la vieille ville avec un guide et de profiter du marché local en fin de journée'.split(' ');
const PARA = String.fromCharCode(10, 10);
const words = (n) => Array.from({ length: n }, (_, i) => SENT[i % SENT.length] + (i % 21 === 20 ? '.' + (i % 63 === 62 ? PARA : '') : '')).join(' ');
const base = { type: 'activity', title: 'Voyage test', dateStart: '2027-04-04', dateEnd: '2027-04-10', regEnd: '2026-12-01', minPart: '10', maxPart: '30', points: { value: '12', counter: 'long' }, photos: ['assets/sri-lanka.jpg'] };

test('1. Tarifs : bandeau compact, absent ou prix unique ; le texte reprend la place libérée', () => {
  const desc = words(150);
  const p = project([Object.assign({ id: 'g' }, base, { description: desc, pricing: { enabled: true, mode: 'tranches', outside: '2400' } }),
    Object.assign({ id: 'n' }, base, { description: desc, pricing: { enabled: false } }),
    Object.assign({ id: 'u' }, base, { description: desc, pricing: { enabled: true, mode: 'single', fixed: '45' } })]);
  const g = render(p, 'g')[0], n = render(p, 'n')[0], u = render(p, 'u')[0];
  const band = g.items.find((i) => i.t === 'rect' && i.fill === '#F8F6FE');
  assert.ok(band && band.h <= 100, 'bandeau tarifs ≤ 100 px (' + (band && band.h) + ')');
  assert.ok(band.w * band.h < 1200 * 675 * 0.12, 'bandeau tarifs < 12 % de la diapositive');
  ['T1', 'T10'].forEach((t) => assert.ok(new RegExp(t + '\\u00a0').test(texts(g))));
  assert.ok(/Extérieur : 2 400 €/.test(texts(g)));
  assert.ok(!n.items.some((i) => i.fill === '#F8F6FE'), 'aucune zone tarifs réservée');
  const boxArea = (s) => body(s).reduce((a, t) => a + t.w * t.h, 0);
  assert.ok(boxArea(n) > boxArea(g) * 1.035, 'sans tarifs, la zone de texte récupère la place même avec bandeau réduit');
  assert.ok(g.items.some((i) => i.t === 'rect' && i.fill === '#F8F6FE' && i.h <= 67), 'nouvelle grille réduite à 67 px maximum hors notes');
  assert.ok(!u.items.some((i) => i.fill === '#F8F6FE') && /45 €/.test(texts(u)), 'prix unique : petit bloc, pas de grille');
});
test('2–3. Texte de 120, 400 et 900 mots : colonnes adaptées, sans recouvrement, corps ≥ 12 pt, jamais tronqué', () => {
  [120, 400, 900].forEach((n) => {
    const p = project([Object.assign({ id: 'x' }, base, { description: words(n), pricing: { enabled: true, mode: 'tranches', outside: '900' } })]);
    const slides = render(p, 'x');
    slides.forEach((s, i) => {
      noCollision(s, n + ' mots, diapo ' + (i + 1));
      assert.ok(!s.overflow, n + ' mots : aucun texte tronqué');
      body(s).forEach((t) => assert.ok(t.size >= 15, n + ' mots : corps ' + t.size + ' px < 15 px (12 pt)'));
      assert.ok(!/…/.test(body(s).map((t) => Mx.plain(t.paras)).join(' ')), 'pas d’ellipse dans la description');
    });
    if (n === 120) assert.equal(slides.length, 1, '120 mots, tarifs, photo et infos : une seule diapositive');
    if (n === 900) { assert.ok(slides.length >= 2, '900 mots : diapositives supplémentaires'); assert.ok(slides[0].warnings.some((w) => /Contenu trop long/.test(w.msg))); }
    const all = slides.map((s) => body(s).map((t) => Mx.plain(t.paras)).join(' ')).join(' ');
    assert.ok(all.split(/\s+/).filter((w) => /[a-zé]/.test(w)).length >= n, n + ' mots : tout le texte est publié');
  });
  // Texte court sans tarifs : corps confortable (≥ 14 pt).
  const pc = project([Object.assign({ id: 'c' }, base, { description: words(120), pricing: { enabled: false } })]);
  assert.ok(body(render(pc, 'c')[0])[0].size >= 17.5, '120 mots sans tarifs : corps ≥ 14 pt');
  // Texte long sans photo ni infos : deux colonnes plutôt que des lignes trop longues.
  const p2 = project([{ id: 'w', type: 'activity', title: 'Texte seul', dateStart: '2027-01-10', description: words(300) }]);
  const s2 = render(p2, 'w')[0];
  assert.equal(body(s2).length, 2, 'deux colonnes');
  noCollision(s2, 'deux colonnes');
});
test('4. Titres courts, longs, sur deux lignes, avec ou sans statut : pas de grand vide', () => {
  [['Rando', false], ['Un titre beaucoup plus long qui occupe presque toute la largeur disponible de la diapositive', false], ['Titre long sur deux lignes avec la dernière chance et la nouveauté affichées ensemble à droite', true]].forEach(([title, st]) => {
    const p = project([Object.assign({ id: 't' }, base, { title, description: words(80), editorial: st ? 'new' : 'auto', regEnd: st ? '2026-11-12' : '2026-12-20' })]);
    const s = render(p, 't')[0];
    const tt = s.items.find((i) => i.field === 'titre'), dl = s.items.find((i) => i.field === 'date');
    assert.ok(tt.y <= 224, 'titre juste sous le bandeau');
    const titleBottom = tt.y + Mx.textHeight(tt.paras, tt.w, tt.size, tt.lh);
    assert.ok(dl.y - titleBottom <= 6, 'date collée au titre');
    const bodyTop = Math.min.apply(null, body(s).map((t) => t.y));
    assert.ok(bodyTop - (dl.y + Mx.textHeight(dl.paras, dl.w, dl.size)) <= 16, 'corps juste sous la date (' + title.length + ' car.)');
    s.items.filter((i) => i.field === 'statut' || i.field === 'dernière chance').forEach((lb) => assert.ok(!inter({ x: tt.x, y: tt.y, w: tt.w, h: titleBottom - tt.y }, lb), 'statut sans chevauchement du titre'));
  });
});
test('5. Contacts : 0, 1 ou 3 ; noms seuls ; un lien mailto par nom valide ; données anciennes conservées', () => {
  const contacts = [{ name: 'Alice Martin', email: 'alice.martin@exemple.org', phone: '01 02 03 04 05', role: 'Référente' }, { name: 'Bruno Petit', email: 'pas-un-email' }, { name: 'Chloé Durand', email: 'chloe@exemple.org' }];
  const p = project([Object.assign({ id: 'c0' }, base, { contacts: [] }), Object.assign({ id: 'c1' }, base, { contacts: contacts.slice(0, 1) }), Object.assign({ id: 'c3' }, base, { contacts })]);
  const footer = (s) => s.items.find((i) => i.field === 'contacts');
  assert.ok(!footer(render(p, 'c0')[0]), 'aucune ligne contact sans contact');
  const f1 = footer(render(p, 'c1')[0]), f3 = footer(render(p, 'c3')[0]);
  assert.ok(/^Contact : Alice Martin$/.test(Mx.plain(f1.paras)));
  assert.ok(/^Contacts : Alice Martin · Bruno Petit · Chloé Durand$/.test(Mx.plain(f3.paras)), Mx.plain(f3.paras));
  const links = f3.paras[0].runs.filter((r) => r.link).map((r) => r.text + '→' + r.link);
  assert.deepEqual(links, ['Alice Martin→mailto:alice.martin@exemple.org', 'Chloé Durand→mailto:chloe@exemple.org'], 'mailto distincts, e-mail invalide non cliquable');
  assert.ok(!/@|01 02/.test(texts(render(p, 'c3')[0])), 'ni e-mail ni téléphone imprimés');
  const it = M.normalizeItem(JSON.parse(JSON.stringify(p.items[2])));
  assert.equal(it.contacts[0].phone, '01 02 03 04 05'); assert.equal(it.contacts[0].role, 'Référente');
  const issues = C.compose.checkItem(p.items[2], p, REF);
  assert.ok(issues.some((x) => /Bruno Petit/.test(x[1]) && x[0] === 'info'), 'avertissement discret dans l’éditeur');
});
test('6. Pictogrammes : catégories natives, pluriels/accents, catégorie personnalisée', () => {
  const I = C.icons;
  const expect = { Informations: 'info', Voyages: 'plane', 'Week-ends': 'bag', 'Sorties culturelles': 'museum', Animations: 'confetti', Musique: 'notes', Musiques: 'notes', 'Œnologie': 'glass',
    Randonnées: 'mountain', Sport: 'trophy', 'Sports mécaniques': 'flag', Parapente: 'paraglider', Parapentes: 'paraglider', Couture: 'needle', Dessin: 'pencil', Dessins: 'pencil', 'La Ruche': 'bee', Permanences: 'calendar' };
  Object.keys(expect).forEach((n) => assert.equal(I.iconFor({ name: n }), expect[n], n));
  assert.equal(I.iconFor({ name: 'Bien-être' }), 'star', 'icône générique par défaut');
  assert.equal(I.iconFor({ name: 'Bien-être', icon: 'confetti' }), 'confetti', 'icône personnalisable');
  I.keys.forEach((k) => I.ICONS[k].paths.forEach((path) => path.forEach((c) => c.slice(1).forEach((v) => assert.ok(v >= 0 && v <= 24, k + ' hors grille')))));
  const p = project(M.defaultCategories().map((c, i) => ({ id: 'i' + i, type: 'activity', title: c.name, categoryId: c.id, dateStart: '2027-01-01' })));
  p.items.forEach((it) => { const s = render(p, it.id)[0]; assert.ok(s.items.some((x) => x.t === 'path'), it.title + ' : pictogramme vectoriel'); });
});
test('7. Statuts : nouveauté, dernière chance, les deux, aucun — encarts pastel, dates exactes', () => {
  const cases = [['none', {}], ['new', { editorial: 'new' }], ['last', { regEnd: '2026-11-11' }], ['both', { editorial: 'new', regEnd: '2026-11-11' }]];
  cases.forEach(([k, o]) => {
    const p = project([Object.assign({ id: 's' }, base, { description: words(60), regEnd: '2026-12-20' }, o)]);
    const s = render(p, 's')[0], t = texts(s);
    const hasNew = /Nouveauté/.test(t), hasLast = /Dernière chance/.test(t);
    assert.equal(hasNew, k === 'new' || k === 'both', k + ' nouveauté');
    assert.equal(hasLast, k === 'last' || k === 'both', k + ' dernière chance');
    if (hasLast) assert.ok(/Inscriptions jusqu’au 11 novembre 2026/.test(t), 'date limite exacte');
    if (hasLast) assert.ok(s.items.some((i) => i.t === 'rect' && i.fill === '#FFF1E5' && i.stroke === '#F1C9A8'), 'encart orange pastel');
    if (hasNew) assert.ok(s.items.some((i) => i.t === 'rect' && i.fill === '#EAF5ED' && i.stroke === '#C6E0CE'), 'étiquette verte pastel');
    assert.ok(!s.items.some((i) => i.rot), 'aucun élément incliné');
    assert.ok(!s.items.some((i) => i.t === 'ellipse'), 'aucun gros badge rond');
    const labels = s.items.filter((i) => i.t === 'rect' && (i.fill === '#FFF1E5' || i.fill === '#EAF5ED'));
    for (let a = 0; a < labels.length; a++) for (let b = a + 1; b < labels.length; b++) assert.ok(!inter(labels[a], labels[b]), k + ' : statuts superposés');
  });
  const p = project([Object.assign({ id: 'f' }, base, { forceLast: true, regEnd: '' })]);
  assert.ok(/Inscriptions bientôt closes/.test(texts(render(p, 'f')[0])), 'sans date : aucune date inventée');
  assert.ok(C.compose.checkItem(p.items[0], p, REF).some((x) => /date limite/i.test(x[1])), 'avertissement éditeur');
});
test('8. Permanences : ouvert, fermé, deux horaires particuliers dont un répété ; légende dynamique', () => {
  const days = { '2026-11-02': 'open', '2026-11-03': 'open', '2026-11-04': 'closed', '2026-11-05': 'special', '2026-11-12': 'special', '2026-11-19': 'special' };
  const dayHours = { '2026-11-05': '9h–12h', '2026-11-12': '14h–17h', '2026-11-19': '9h–12h' };
  const p = project([{ id: 'k', type: 'calendar', title: 'Permanences', calendar: { month: '2026-11', days, dayHours, openHours: '13h–16h' } }]);
  const s = render(p, 'k')[0];
  const legend = s.items.filter((i) => i.field === 'légende').map((i) => Mx.plain(i.paras));
  assert.deepEqual(legend, ['Ouvert : 13h–16h', 'Horaires spécifiques\n05/11, 19/11 : 9h–12h\n12/11 : 14h–17h', 'Fermé']);
  const only = project([{ id: 'o', type: 'calendar', title: 'P', calendar: { month: '2026-11', days: { '2026-11-02': 'open' }, openHours: '' } }]);
  assert.deepEqual(render(only, 'o')[0].items.filter((i) => i.field === 'légende').map((i) => Mx.plain(i.paras)), ['Ouvert'], 'seuls les états utilisés');
  const one = project([{ id: 'u', type: 'calendar', title: 'P', calendar: { month: '2026-11', days: { '2026-11-05': 'special', '2026-11-06': 'special' }, dayHours: { '2026-11-05': '9h–12h', '2026-11-06': '9h–12h' } } }]);
  assert.deepEqual(render(one, 'u')[0].items.filter((i) => i.field === 'légende').map((i) => Mx.plain(i.paras)), ['Horaires spécifiques : 9h–12h'], 'horaire répété dédoublonné');
  const cell = s.items.find((i) => i.t === 'rect' && i.act && i.act.date === '2026-11-12');
  assert.equal(cell.fill, M.CAL_STATES.special.color);
  assert.ok(s.items.some((i) => i.field === 'horaire du jour' && Mx.plain(i.paras) === '14h–17h'), 'horaire dans la case');
  const saved = M.normalizeItem(JSON.parse(JSON.stringify(p.items[0])));
  assert.deepEqual(saved.calendar.dayHours, dayHours, 'horaires conservés à la sauvegarde');
});
test('9. Mosaïques 1, 3, 6 : étiquettes miniatures, pas de badge sur les photos', () => {
  [1, 3, 6].forEach((n) => ['news', 'last'].forEach((kind) => {
    const items = Array.from({ length: n }, (_, i) => ({ id: 'm' + i, type: 'activity', title: 'Activité ' + (i + 1), editorial: kind === 'news' ? 'new' : 'auto', regEnd: kind === 'last' ? '2026-11-1' + (i % 6) : '', dateStart: '2026-12-0' + (i + 1), photos: ['assets/sri-lanka.jpg'] }));
    const s = T.renderPage(M.blankPage(kind), project(items), M.blankIssue(REF))[0];
    assert.ok(!s.overflow);
    assert.ok(!s.items.some((i) => i.t === 'ellipse' || i.rot), kind + ' ' + n + ' : aucun badge incliné');
    const imgs = s.items.filter((i) => i.t === 'image' && i.role !== 'banner');
    const tags = s.items.filter((i) => i.field === 'statut');
    assert.equal(tags.length, n, kind + ' ' + n + ' : une étiquette par carte');
    tags.forEach((t) => imgs.forEach((im) => assert.ok(!inter(t, im), 'étiquette hors photo')));
  }));
});
(async () => {
  test('10. Non-régression : démonstration complète sans débordement ni police < 12 pt', () => {
    const p = C.demo.build(REF);
    C.templates.renderIssue(p, p.issues[0]).forEach((r) => r.slides.forEach((s) => {
      assert.ok(!s.overflow, s.templateId + ' déborde');
      body(s).forEach((t) => assert.ok(t.size >= 15, s.templateId + ' corps ' + t.size));
    }));
  });
  // 11. Document complet : plusieurs dizaines de pages exportées sans exception.
  const p = C.demo.build(REF);
  const is = p.issues[0];
  const base2 = is.pages.filter((pg) => pg.kind === 'item');
  while (is.pages.length < 60) is.pages.splice(is.pages.length - 1, 0, Object.assign({}, base2[is.pages.length % base2.length], { id: 'x' + is.pages.length }));
  const entries = [];
  C.templates.renderIssue(p, is).forEach((r) => r.slides.forEach((s) => entries.push({ slide: s, title: 't' })));
  const r = await C.pptx.toBlob(entries, {});
  const zip = await JSZip.loadAsync(r.buffer);
  const slideFiles = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
  let xml = '';
  for (const f of slideFiles) xml += await zip.file(f).async('string');
  const rels = (await Promise.all(Object.keys(zip.files).filter((f) => /slides\/_rels\/.*\.rels$/.test(f)).map((f) => zip.file(f).async('string')))).join('');
  test('11. MEL de 60 pages : export complet, polices et liens intacts', () => {
    assert.equal(slideFiles.length, entries.length);
    assert.ok(entries.length >= 60);
    assert.ok(!/typeface="(?!Arial)[^"]+"/.test(xml.replace(/typeface="\+m[jn]-[a-z]+"/g, '')), 'seulement Arial');
    assert.ok(/mailto:voyages@exemple\.org/.test(rels), 'liens mailto dans le PPTX');
    assert.ok(/<a:custGeom>/.test(xml), 'pictogrammes vectoriels');
  });
  done('critères d’acceptation V9.1 (' + entries.length + ' diapositives exportées)');
})().catch((e) => { console.error(e); process.exit(1); });
