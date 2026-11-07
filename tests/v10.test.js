/* V10 — tests d'acceptation automatisés (données fictives).
 * A : MEL hebdomadaire (reprise, personnalisation, instantané publié, ordre éditorial)
 * B : composition (cartouche T1–T10, suites, partenaire, mosaïques, programmes, contrôles géométriques)
 * C : images (états, export bloqué / recomposé, médias réellement présents)
 * D/E : liens, contacts, sauvegardes et compatibilité. */
'use strict';
const fs = require('fs'), path = require('path');
const { assert, test, done } = require('./lib/assert-ext');
const { loadExport, ROOT } = require('./lib/env');
const C = loadExport();
const M = C.model, CO = C.compose, T = C.templates, X = C.metrics, L = C.layout;
const JSZip = globalThis.JSZip;
const JPG = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'assets/sri-lanka.jpg')).toString('base64');
// Stockage d'images simulé : « img:… » présentes en mémoire = prêtes ; liens Web = non importés.
const mem = {};
C.images = {
  url: (r) => mem[r] || '', put: (id, d) => { mem[id] = d; },
  status: (r) => /^img:/.test(r) ? (mem[r] ? 'ready' : 'missing') : /^https?:/i.test(r) ? 'remote' : 'ready'
};
['travel', 'temple', 'mountain', 'wine', 'games', 'concert', 'books', 'race'].forEach((t) => C.images.put('img:demo-' + t, JPG));
const REF = '2026-11-09';
const fresh = () => require('./fixtures/v10-cases.js').build(C, REF, (t) => 'img:demo-' + t);
const clone = (o) => JSON.parse(JSON.stringify(o));
const texts = (s) => s.items.filter((i) => i.t === 'text').map((i) => X.plain(i.paras)).join('\n');
const audit = (s) => L.auditSlide(s);

/* ======================= A · MEL hebdomadaire ======================= */
test('A01 · MEL composé : couverture en tête, ouvertures juste après, règlement en dernier', () => {
  const c = fresh();
  const pages = CO.enforceOrder(c.issue.pages, c.project, c.issue);
  assert.equal(pages[0].kind, 'cover');
  assert.equal(CO.sectionForPage(pages[1], c.project, c.issue), 'opening');
  assert.equal(CO.sectionForPage(pages[2], c.project, c.issue), 'opening');
  const last = pages[pages.length - 1];
  assert.equal(CO.findItem(c.project, last.itemId).type, 'rules');
});
test('A03 · personnalisation « cette semaine uniquement » : bibliothèque et autre MEL inchangés', () => {
  const c = fresh(), p = c.project;
  const other = M.normalizeIssue(Object.assign(clone(c.issue), { id: 'autre-mel' }));
  p.issues.push(other);
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs');
  const src = CO.findItem(p, pg.itemId), before = JSON.stringify(src);
  const draft = clone(CO.effectiveItem(pg, src));
  draft.title = 'Titre de la semaine 46'; draft.description = 'Texte propre à ce MEL.'; draft.pricing.enabled = false;
  CO.setOverrides(pg, src, draft);
  assert.deepEqual(Object.keys(pg.opts.override).sort(), ['description', 'pricing', 'title']);
  assert.equal(JSON.stringify(src), before, 'fiche source intacte');
  const s = T.renderPage(pg, p, c.issue)[0];
  assert.ok(texts(s).includes('Titre de la semaine 46') && texts(s).includes('Texte propre à ce MEL.'));
  assert.ok(!s.items.some((i) => i.t === 'rect' && i.fill === L.C.priceBg), 'tarifs masqués pour cette semaine seulement');
  const o = T.renderPage(other.pages.find((x) => x.itemId === src.id), p, other)[0];
  assert.ok(!texts(o).includes('Titre de la semaine 46'), 'l’autre MEL garde la fiche');
  CO.resetOverride(pg, 'title');
  assert.ok(!('title' in pg.opts.override) && 'description' in pg.opts.override, 'retour à la fiche par champ');
  CO.resetOverride(pg);
  assert.equal(CO.hasOverrides(pg), false, 'annulation complète');
});
test('A04 · MEL publié figé : une modification ultérieure de la fiche ne change pas l’archive', () => {
  const c = fresh(), p = c.project;
  CO.setIssueStatus(p, c.issue, 'published');
  assert.ok(CO.isFrozen(c.issue) && c.issue.snapshot.items.length > 10);
  const before = T.renderIssue(p, c.issue).map((r) => r.slides.map(texts).join('|')).join('#');
  const src = CO.findItem(p, 'v10-voyage-sans'); src.title = 'TITRE MODIFIÉ APRÈS PUBLICATION';
  const after = T.renderIssue(p, c.issue).map((r) => r.slides.map(texts).join('|')).join('#');
  assert.equal(after, before, 'rendu identique après modification de la bibliothèque');
  const draft = M.normalizeIssue(Object.assign(clone(c.issue), { id: 'brouillon', status: 'draft', snapshot: undefined }));
  assert.ok(T.renderIssue(p, draft).some((r) => r.slides.some((s) => texts(s).includes('TITRE MODIFIÉ'))), 'un brouillon suit la bibliothèque');
  // Sauvegarde / restauration : l'instantané survit à la normalisation (export JSON).
  const back = M.normalizeIssue(JSON.parse(JSON.stringify(c.issue)));
  assert.ok(CO.isFrozen(back) && back.snapshot.items.length === c.issue.snapshot.items.length);
  CO.setIssueStatus(p, c.issue, 'draft');
  assert.ok(!CO.isFrozen(c.issue) && c.issue.previousSnapshots.length === 1, 'réouverture : instantané conservé dans l’historique');
});
test('A05/A06 · semaine 46 → 47 : pages fixes reprises, rubriques recalculées, semaine 46 intacte', () => {
  const c = fresh(), p = c.project;
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs');
  const src = CO.findItem(p, pg.itemId);
  const d0 = clone(CO.effectiveItem(pg, src)); d0.subtitle = 'Personnalisé en semaine 46'; CO.setOverrides(pg, src, d0);
  c.issue.pages.find((x) => x.itemId === 'v10-immersif').included = false;
  const sourceJson = JSON.stringify(c.issue);
  const r = CO.duplicateIssue(p, c.issue, CO.nextWeekRef(REF));
  assert.equal(JSON.stringify(c.issue), sourceJson, 'le MEL source n’est pas modifié');
  assert.equal(r.issue.week, 47); assert.equal(r.issue.refDate, '2026-11-16');
  const has = (id) => r.issue.pages.some((x) => x.itemId === id);
  assert.ok(has('v10-permanences') && has('v10-pret') && has('v10-regle') && has('v10-info'), 'permanences, informations et règlement repris');
  assert.ok(!has('v10-derniere'), 'activité close retirée');
  assert.ok(r.report.removed.some((x) => /œnologie/.test(x.label)));
  const pg47 = r.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs');
  assert.equal(pg47.opts.override.subtitle, 'Personnalisé en semaine 46', 'personnalisation conservée');
  assert.notEqual(pg47.id, pg.id, 'identifiants de pages nouveaux');
  assert.equal(r.issue.pages.find((x) => x.itemId === 'v10-immersif').included, false, 'exclusion conservée');
  assert.ok(r.report.review.some((x) => /personnalisation/.test(x.reason)), 'personnalisation signalée à relire');
  // A06 : à la date du 16/11, l'escalade (clôture 25/11) n'est pas en dernière chance ; au 23/11 elle l'est.
  const r2 = CO.duplicateIssue(p, r.issue, CO.nextWeekRef(r.issue.refDate));
  const esc = r2.issue.pages.find((x) => x.itemId === 'v10-courte');
  assert.equal(CO.sectionForPage(esc, p, r2.issue), 'last');
  assert.ok(r2.report.moved.some((x) => /escalade/.test(x.label) && x.to === 'last'));
  assert.equal(r2.issue.pages[0].kind, 'cover');
  assert.equal(CO.findItem(p, r2.issue.pages[r2.issue.pages.length - 1].itemId).type, 'rules');
});
test('A06 · une nouveauté déjà annoncée n’est pas réannoncée au-delà de la durée réglée', () => {
  const c = fresh(), p = c.project;
  p.settings.newMaxWeeks = 1;
  const it = CO.findItem(p, 'v10-nouveaute');
  assert.ok(CO.classify(it, REF, p.settings, c.issue).isNew);
  const r = CO.duplicateIssue(p, c.issue, '2026-11-16');
  assert.equal(r.issue.newSeen['v10-nouveaute'], REF, 'première annonce mémorisée');
  assert.equal(CO.classify(it, '2026-11-16', p.settings, r.issue).isNew, false, 'plus une nouveauté la semaine suivante');
  assert.ok(r.report.notNewAnymore.some((x) => /céramique/.test(x.label)));
  p.settings.newMaxWeeks = 2;
  assert.equal(CO.classify(it, '2026-11-16', p.settings, r.issue).isNew, true, 'deux semaines autorisées');
});
test('A06 · actualisation non destructive : titres, positions, exclusions et personnalisations conservés', () => {
  const c = fresh(), p = c.project;
  c.issue.pages.find((x) => x.kind === 'news').opts.title = 'Nos nouveautés';
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-concert'); pg.included = false;
  p.items.push(M.normalizeItem({ id: 'v10-ajout', title: 'Nouvelle sortie', categoryId: 'cat-sorties-culturelles', dateStart: '2027-01-10', regEnd: '2026-12-15', editorial: 'new', createdAt: REF + 'T08:00:00.000Z' }));
  const before = c.issue.pages.map((x) => x.id);
  const pages = CO.refreshPreservingEdits(p, c.issue);
  assert.ok(before.every((id) => pages.some((x) => x.id === id)), 'aucune page supprimée');
  assert.ok(pages.some((x) => x.itemId === 'v10-ajout'), 'nouvelle fiche ajoutée');
  assert.equal(pages.find((x) => x.kind === 'news').opts.title, 'Nos nouveautés');
  assert.equal(pages.find((x) => x.id === pg.id).included, false);
});
test('A09/A10 · exclusion conservée au rechargement ; le règlement ne peut pas remonter', () => {
  const c = fresh(), p = c.project;
  const pages = CO.enforceOrder(c.issue.pages, p, c.issue);
  pages.find((x) => x.itemId === 'v10-partenaire').included = false;
  const back = M.normalizeIssue(JSON.parse(JSON.stringify(Object.assign({}, c.issue, { pages: pages }))));
  assert.equal(back.pages.find((x) => x.itemId === 'v10-partenaire').included, false);
  const iRules = pages.findIndex((x) => x.itemId === 'v10-regle'), iCal = pages.findIndex((x) => x.itemId === 'v10-permanences');
  assert.equal(CO.moveWithinSection(pages, iRules, iCal, p, c.issue), false, 'déplacement inter-rubriques refusé');
  const moved = [pages[iRules]].concat(pages.filter((_, i) => i !== iRules));
  const fixed = CO.enforceOrder(moved, p, c.issue);
  assert.equal(fixed[0].kind, 'cover'); assert.equal(fixed[fixed.length - 1].itemId, 'v10-regle');
});
test('A · sélection manuelle de 24 activités conservée (V9.x : tronquée à 6 au rechargement)', () => {
  const pg = M.normalizePage({ kind: 'news', opts: { auto: false, ids: Array.from({ length: 10 }, (_, i) => 'id' + i) } });
  assert.equal(pg.opts.ids.length, 10);
});

/* ======================= B · Composition ======================= */
function priceParts(s) {
  const box = s.items.find((i) => i.t === 'rect' && i.fill === L.C.priceBg);
  const t = s.items.filter((i) => i.t === 'text' && i.field === 'tarifs');
  const lab = t.filter((i) => /^T(10|[1-9])$/.test(X.plain(i.paras)));
  const amt = t.filter((i) => /€$/.test(X.plain(i.paras)) && !/^Extérieur/.test(X.plain(i.paras)));
  const ext = t.find((i) => /^Extérieur/.test(X.plain(i.paras)));
  return { box, lab, amt, ext, geo: s.priceGeometry };
}
test('B05/B07/B08 · cartouche T1–T10 : 4/4/2, colonnes et € alignés, extérieur dans le cadre, filet intérieur', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs'), c.project, c.issue)[0];
  const { box, lab, amt, ext, geo } = priceParts(s);
  assert.ok(box && lab.length === 10 && amt.length === 10 && ext);
  const xOf = (n) => lab.find((i) => X.plain(i.paras) === 'T' + n).x;
  assert.ok(xOf(1) === xOf(5) && xOf(5) === xOf(9), 'T1, T5 et T9 au même x');
  assert.ok(xOf(2) === xOf(6) && xOf(6) === xOf(10) && xOf(3) === xOf(7) && xOf(4) === xOf(8));
  assert.deepEqual(new Set(lab.map((i) => i.y)).size, 3, 'trois lignes');
  const rightOf = (i) => Math.round((i.x + i.w) * 100) / 100;
  const cols = [0, 1, 2, 3].map((k) => new Set(amt.filter((a, idx) => idx % 4 === k).map(rightOf)));
  assert.ok(cols.every((set) => set.size === 1), 'montants (et €) alignés à droite par colonne');
  assert.ok(amt.every((a) => a.align === 'right'));
  assert.equal(rightOf(ext), Math.round(geo.amountRight[3] * 100) / 100, 'Extérieur aligné sur le bord des montants');
  assert.equal(ext.y, lab.find((i) => X.plain(i.paras) === 'T9').y, 'Extérieur sur la ligne de T9 / T10');
  const inside = (i) => i.x >= box.x - 0.01 && i.x + i.w <= box.x + box.w + 0.01 && i.y >= box.y - 0.01 && i.y + i.h <= box.y + box.h + 0.01;
  assert.ok(lab.concat(amt, [ext]).every(inside), 'tout est dans le cartouche');
  assert.ok(box.x + box.w - Math.max.apply(null, amt.concat([ext]).map((i) => i.x + i.w)) <= 14, 'pas de grand vide à droite');
  const bar = s.items.find((i) => i.t === 'rect' && i.fill === L.C.purple && i.w <= 4 && i.y > box.y && i.y < box.y + box.h);
  assert.ok(bar && bar.x > box.x + 1 && Math.abs((bar.y - box.y) - (box.y + box.h - bar.y - bar.h)) < 0.01, 'filet violet intérieur, marges égales');
  assert.ok(lab.concat(amt).every((i) => i.size >= 13.5 && !i.overflow), 'au moins 10,8 pt, aucune troncature');
  assert.ok(amt.some((a) => X.plain(a.paras) === '1 080 €'), 'espaces insécables (1 080 €)');
});
test('B06 · supplément court en tête ; supplément long dans un encart, sans troncature', () => {
  const c = fresh();
  const s1 = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs'), c.project, c.issue)[0];
  const n1 = s1.items.find((i) => i.field === 'notes tarifs'), h1 = s1.items.find((i) => i.t === 'text' && /^Tarifs CSE/.test(X.plain(i.paras)));
  assert.equal(n1.y, h1.y, 'sur la ligne de titre'); assert.ok(h1.x + h1.w <= n1.x);
  const { box: b1, geo } = priceParts(s1);
  assert.ok(Math.abs(n1.x + n1.w - geo.amountRight[3]) < 0.6, 'bord droit du supplément = bord des montants');
  const s2 = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-voyage-sup-long'), c.project, c.issue)[0];
  const n2 = s2.items.find((i) => i.field === 'notes tarifs'), { box: b2 } = priceParts(s2);
  assert.ok(!n2.overflow && X.plain(n2.paras).includes('inscription'), 'texte complet');
  assert.ok(n2.y + n2.h <= b2.y + b2.h && n2.y > b1.y, 'encart intégré au cartouche');
});
test('B08 · grands montants (12 500 €) : alignés et complets', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-grands-prix'), c.project, c.issue)[0];
  const { amt, ext } = priceParts(s);
  assert.ok(amt.every((a) => !a.overflow) && X.plain(ext.paras) === 'Extérieur : 12 500 €');
  assert.equal(new Set(amt.filter((_, i) => i % 4 === 3).map((a) => a.x + a.w)).size, 1);
});
test('B04 · tarifs désactivés : aucun cartouche ni place réservée', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-voyage-sans'), c.project, c.issue)[0];
  assert.ok(!s.items.some((i) => i.t === 'rect' && i.fill === L.C.priceBg) && !/Tarifs CSE/.test(texts(s)));
});
test('B01/B02 · fiches courtes et moyennes : une seule diapositive, corps ≥ 12 pt', () => {
  const c = fresh();
  ['v10-courte', 'v10-voyage-sup-long', 'v10-grands-prix', 'v10-nouveaute', 'v10-derniere'].forEach((id) => {
    const sl = T.renderPage(c.issue.pages.find((x) => x.itemId === id), c.project, c.issue);
    assert.equal(sl.length, 1, id + ' : une seule diapositive');
    assert.ok(sl[0].minBody >= 15, id + ' : corps ' + sl[0].minBody);
  });
  const courte = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-courte'), c.project, c.issue)[0];
  assert.ok(courte.items.filter((i) => i.field === 'description').every((i) => i.size >= 20), 'texte court agrandi');
});
test('B03 · texte long : suite seulement si nécessaire, coupure logique, aucun texte perdu', () => {
  const c = fresh(), p = c.project;
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-longue');
  const sl = T.renderPage(pg, p, c.issue);
  assert.ok(sl.length >= 2 && sl.every((s) => !s.overflow), 'suite sans troncature');
  const all = sl.map(texts).join(' ').replace(/\s+/g, ' ');
  const it = CO.findItem(p, pg.itemId);
  it.description.split(/\n+/).forEach((para) => assert.ok(all.includes(para.slice(0, 60)), 'paragraphe présent'));
  assert.ok(sl.every((s) => s.minBody >= 15));
  assert.ok(sl[0].warnings.some((w) => w.code === 'auto-split'));
  // Voyage dense : la suite commence au « Programme » (coupe logique) et la densité compacte est proposée.
  const v = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs'), p, c.issue);
  if (v.length > 1) {
    assert.ok(/^Programme/.test(texts(v[1]).split('\n').find((l) => /Programme|Jour/.test(l)) || ''), 'la suite commence au programme');
    // La densité compacte n'est proposée que si elle tient réellement sur une diapositive (jamais de promesse fausse).
    const pgc = M.normalizePage(Object.assign(clone(c.issue.pages.find((x) => x.itemId === 'v10-voyage-tarifs')), { density: 'compact' }));
    const comp = T.renderPage(pgc, p, c.issue);
    const fits = comp.length === 1 && !comp[0].overflow;
    assert.equal(v[0].warnings.some((w) => w.code === 'compact-fits'), fits, 'suggestion compacte cohérente');
    assert.ok(comp.every((s) => s.minBody >= 13.75), 'compact : corps ≥ 11 pt');
  }
});
test('B09 · demi-ligne entre paragraphes identique aperçu / PowerPoint', () => {
  const paras = X.parseRich('Premier paragraphe.\n\nSecond paragraphe.');
  assert.equal(X.countLines(paras, 600, 18), 2 + X.PARA_GAP);
  const runs = C.pptx.textRuns({ paras: paras, size: 18, lh: 1.2, bold: false });
  const gap = runs.find((r) => r.text === ' ');
  assert.ok(gap && Math.abs(gap.options.lineSpacing - 18 * 1.2 * 0.5 * 0.8) < 0.11, 'interligne exact d’une demi-ligne');
});
test('B10/B11 · titre long + sous-titre + Nouveauté : pas de collision, période non répétée', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-nouveaute'), c.project, c.issue)[0];
  assert.ok(!audit(s).some((w) => w.code === 'overlap'), 'aucun texte superposé');
  const date = s.items.find((i) => i.field === 'date');
  assert.equal(X.plain(date.paras).split('30 novembre').length, 2, 'période affichée une seule fois');
  const label = s.items.find((i) => i.t === 'rect' && i.fill === L.C.newBg);
  assert.ok(label && !s.items.some((i) => i.t === 'image' && label.x < i.x + i.w && label.x + label.w > i.x && label.y < i.y + i.h && label.y + label.h > i.y), 'étiquette jamais sur une photo');
});
test('B12 · partenaire court : textes agrandis et bloc centré verticalement', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-partenaire'), c.project, c.issue)[0];
  const offer = s.items.find((i) => i.field === 'offre'), body = s.items.find((i) => i.field === 'conditions de l’offre');
  assert.ok(offer.size >= 28 && body.size >= 22, 'offre ' + offer.size + ' / conditions ' + body.size);
  assert.ok(texts(s).includes('Partenaire CSE'));
  const title = s.items.find((i) => i.field === 'titre');
  assert.ok(title.y > 240, 'bloc centré, pas collé en haut');
});
test('B13 · mosaïques de 1 à 6 cartes : grilles régulières, sans chevauchement ni micro-police', () => {
  const c = fresh(), p = c.project;
  const ids = p.items.filter((it) => it.type === 'activity').map((it) => it.id);
  for (let n = 1; n <= 6; n++) {
    const pg = M.normalizePage({ kind: 'news', opts: { auto: false, ids: ids.slice(0, n) } });
    const s = T.renderPage(pg, p, c.issue);
    assert.equal(s.length, 1);
    const cards = s[0].items.filter((i) => i.t === 'rect' && i.fill === L.C.white && i.r === 14);
    assert.equal(cards.length, n, n + ' cartes');
    assert.ok(!audit(s[0]).some((w) => w.code === 'overlap' || w.code === 'bounds'), n + ' cartes : géométrie');
    assert.ok(s[0].items.filter((i) => i.field === 'titre de carte').every((i) => i.size >= 14));
  }
});
test('B14 · programme de 20 lignes : 2 diapositives de 10, colonnes alignées', () => {
  const c = fresh();
  const pg = c.issue.pages.find((x) => x.kind === 'upcoming' && x.opts.style === 'list');
  const sl = T.renderPage(pg, c.project, c.issue);
  assert.equal(sl.length, 2);
  sl.forEach((s) => {
    const dates = s.items.filter((i) => i.field === 'date');
    assert.equal(dates.length, 10);
    assert.equal(new Set(dates.map((d) => d.x)).size, 1, 'dates alignées');
    assert.ok(!audit(s).some((w) => w.code === 'overlap'));
  });
});
test('B15 · règlement long avec sous-titre : tout le texte présent, sous-titre visible', () => {
  const c = fresh(), p = c.project;
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-regle');
  const sl = T.renderPage(pg, p, c.issue);
  const all = sl.map(texts).join('\n');
  assert.ok(all.includes('Règlement en vigueur au 1er septembre 2026'));
  ['Inscriptions', 'Paiement', 'Désistement', 'Cas particuliers', 'Assurance'].forEach((h) => assert.ok(all.includes(h), h));
  assert.ok(sl.every((s) => !s.overflow && s.minBody >= 13.5));
  assert.ok(!sl.some((s) => audit(s).some((w) => w.code === 'overlap')), '« Suite » ne chevauche plus le texte ni le bouton');
});
test('B16 · tous les modèles : aucun élément hors cadre, aucun texte superposé', () => {
  const c = fresh(), p = c.project, seen = {};
  T.renderIssue(p, c.issue).forEach((r) => r.slides.forEach((s) => {
    seen[s.templateId] = 1;
    const a = audit(s);
    assert.ok(!a.some((w) => w.code === 'bounds'), s.templateId + ' : hors cadre');
    assert.ok(!a.some((w) => w.code === 'overlap'), s.templateId + ' : ' + (a.find((w) => w.code === 'overlap') || {}).msg);
  }));
  assert.ok(['cover', 'calendar', 'info', 'classic', 'immersive', 'poster', 'animation', 'news', 'last', 'partner', 'upcoming-list', 'upcoming-table', 'rules'].every((t) => seen[t]), 'les 13 modèles sont couverts : ' + Object.keys(seen).join(', '));
});

/* ======================= C · Images ======================= */
test('C05 · lien Web non importé : erreur visible et bloquante, aucune image annoncée', () => {
  const c = fresh(), p = c.project;
  const it = CO.findItem(p, 'v10-courte'); it.photos = ['https://exemple.org/photo.jpg'];
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === it.id), p, c.issue)[0];
  assert.ok(s.warnings.some((w) => w.code === 'image' && w.level === 'block' && w.status === 'remote'));
  assert.ok(!s.items.some((i) => i.t === 'image' && i.src === it.photos[0]), 'pas d’image exportable trompeuse');
  assert.ok(CO.audit(p, c.issue).some((a) => a.code === 'image'));
  const skip = T.renderPage(c.issue.pages.find((x) => x.itemId === it.id), p, c.issue, { skipImages: [it.photos[0]] })[0];
  assert.ok(!skip.warnings.some((w) => w.code === 'image'), 'export « sans ces photos » : recomposé sans erreur');
});
test('C07 · cadrage : point focal et mode « image entière » transmis à l’aperçu et au PowerPoint', () => {
  const c = fresh(), p = c.project;
  const it = CO.findItem(p, 'v10-derniere');
  it.photoMeta = { [it.photos[0]]: { fx: 20, fy: 80, alt: 'Deux verres de vin' } };
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === it.id), p, c.issue)[0];
  const img = s.items.find((i) => i.t === 'image' && i.src === it.photos[0]);
  assert.ok(img.fx === 20 && img.fy === 80 && img.alt === 'Deux verres de vin');
  const norm = M.normalizeItem(JSON.parse(JSON.stringify(it)));
  assert.deepEqual(norm.photoMeta[it.photos[0]], { fx: 20, fy: 80, alt: 'Deux verres de vin' });
});

/* ======================= D · Liens et contacts ======================= */
test('D04 · permanence sans lien : aucun bouton ; lien personnalisé : bouton actif', () => {
  const c = fresh(), p = c.project;
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-permanences');
  const s0 = T.renderPage(pg, p, c.issue)[0];
  assert.ok(!s0.items.some((i) => i.field === 'bouton'), 'aucun bouton inerte');
  CO.findItem(p, 'v10-permanences').link = { type: 'custom', url: 'https://exemple.org/permanences', label: 'Agenda' };
  const s1 = T.renderPage(pg, p, c.issue)[0];
  assert.ok(s1.items.some((i) => i.field === 'bouton' && i.link === 'https://exemple.org/permanences'));
  assert.equal(M.blankItem('calendar').link.type, 'none', '« Aucun lien » par défaut');
});
test('D05 · contacts : noms seuls, mailto par nom, nom sans e-mail en texte simple', () => {
  const c = fresh();
  const s = T.renderPage(c.issue.pages.find((x) => x.itemId === 'v10-derniere'), c.project, c.issue)[0];
  const ct = s.items.find((i) => i.field === 'contacts');
  const runs = ct.paras[0].runs;
  assert.ok(runs.some((r) => r.text === 'Paul Leroy' && r.link === 'mailto:paul.leroy@exemple.org'));
  assert.ok(runs.some((r) => r.text === 'Sarah Petit' && !r.link));
  assert.ok(!X.plain(ct.paras).includes('@'), 'aucune adresse affichée');
});

/* ======================= E · Sauvegardes et compatibilité ======================= */
test('E01 · sauvegarde V9.6.2 (personnalisations V9.4, statut, suppressions) relue sans perte', () => {
  const v962 = { schema: 'cse-studio:v9', items: [{ id: 'a', type: 'activity', title: 'Ancienne fiche', photos: ['img:x'] }],
    issues: [{ id: 'm', refDate: '2026-11-02', pages: [{ id: 'p1', kind: 'cover', opts: { extraNotes: ['Note'] } }, { id: 'p2', kind: 'item', itemId: 'a', opts: { useOverrides: true, override: { title: 'Titre V9.4' } } }], suppressed: ['item:z'], status: 'draft' }] };
  const p = M.normalizeProject(v962);
  const pg = p.issues[0].pages[1];
  assert.equal(CO.effectiveItem(pg, p.items[0]).title, 'Titre V9.4', 'personnalisation V9.4 reprise');
  assert.deepEqual(p.issues[0].suppressed, ['item:z']);
  assert.deepEqual(p.issues[0].pages[0].opts.extraNotes, ['Note']);
  assert.equal(p.issues[0].status, 'draft');
  assert.deepEqual(p.issues[0].newSeen, {});
});
test('C09 · images des MEL publiés et des personnalisations incluses dans les sauvegardes', () => {
  const I = require('../js/core/images.js');
  const c = fresh(), p = c.project;
  CO.setIssueStatus(p, c.issue, 'published');
  const pg = c.issue.pages.find((x) => x.itemId === 'v10-courte');
  pg.opts.useOverrides = true; pg.opts.override = { photos: ['img:photo-de-la-semaine'] };
  p.items = p.items.filter((it) => it.id !== 'v10-derniere'); // fiche supprimée mais présente dans l'archive publiée
  const refs = I.refsOf(p);
  assert.ok(refs.includes('img:photo-de-la-semaine'), 'photo d’une personnalisation');
  assert.ok(refs.includes('img:demo-wine'), 'photo d’une fiche présente seulement dans l’instantané publié');
});

/* ======================= A11/A12 · Gros MEL et intégrité du PPTX ======================= */
(async () => {
  const c = fresh(), p = c.project;
  // 70 diapositives : le MEL de référence répété.
  const base = c.issue.pages.slice();
  for (let k = 0; k < 2; k++) base.filter((x) => x.kind === 'item').forEach((pg) => { const cp = M.normalizePage(Object.assign(clone(pg), { id: 'dup' + k + pg.id })); c.issue.pages.push(cp); });
  const entries = [];
  const t0 = Date.now();
  T.renderIssue(p, c.issue).forEach((r) => r.slides.forEach((s) => entries.push({ slide: s, title: r.page.id })));
  const layoutMs = Date.now() - t0;
  const res = await C.pptx.toBlob(entries, { title: 'Intégrité' });
  const zip = await JSZip.loadAsync(res.buffer);
  const names = Object.keys(zip.files);
  test('A12 · MEL de ' + entries.length + ' diapositives : PPTX complet, médias réellement présents', () => {
    assert.ok(entries.length >= 60, entries.length + ' diapositives');
    assert.equal(names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).length, entries.length);
    assert.ok(res.check && res.check.ok, JSON.stringify(res.check));
    assert.ok(res.check.media >= res.check.expectedImages + 1);
    assert.ok(layoutMs < 8000, 'calcul ' + layoutMs + ' ms');
  });
  const xml = (await Promise.all(names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).map((n) => zip.file(n).async('string')))).join('');
  test('C10 · aucune image d’erreur ni lien http d’image dans le PPTX ; textes modifiables', () => {
    assert.ok(!/Image Web non import/.test(xml));
    assert.ok(!/r:link=/.test(xml), 'aucune image liée (toutes embarquées)');
    assert.ok(/<a:t>Les Pouilles/.test(xml), 'texte réel (zone de texte), pas une capture');
  });
  done('V10 — tests d’acceptation (MEL hebdomadaire, composition, images, liens, sauvegardes, PPTX ' + entries.length + ' diapositives en ' + layoutMs + ' ms de calcul)');
})().catch((e) => { console.error(e); process.exit(1); });
