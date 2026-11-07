/* CSE Studio V9 · Modèles de diapositives et moteur d'auto-layout.
 * Chaque modèle compose des blocs (layout.js) en redistribuant l'espace selon les contenus présents :
 * pas de photo → la colonne disparaît ; pas de tarifs → le texte récupère la place ; etc.
 * Un modèle renvoie une LISTE de diapositives (pagination automatique : mosaïques > 6, programmes,
 * règlement long, fiche scindée en deux). */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.templates = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var L = function () { return CSE.layout; };
  var D = function () { return CSE.dates; };
  var Mx = function () { return CSE.metrics; };
  var P = function () { return CSE.pricing; };
  var CO = function () { return CSE.compose; };
  var M = function () { return CSE.model; };

  var TEMPLATES = [
    { id: 'cover', name: 'Couverture du MEL', family: 'Numéro', for: ['cover'], desc: 'Semaine, message important, dernières chances et nouveautés, alimentés automatiquement.' },
    { id: 'calendar', name: 'Calendrier de permanences', family: 'Pages fixes', for: ['calendar'], desc: 'Ouvert / horaire particulier / fermé, horaires par jour et légende générée automatiquement.' },
    { id: 'info', name: 'Information', family: 'Informations', for: ['info', 'page', 'activity'], desc: 'Message administratif hiérarchisé, pictogramme et encadré d’alerte.' },
    { id: 'classic', name: 'Activité classique', family: 'Activités', for: ['activity', 'info', 'page'], desc: 'Composition adaptative (1 ou 2 colonnes), bandeau tarifs compact facultatif, infos pratiques ; suite automatique si le texte est long.' },
    { id: 'immersive', name: 'Immersif', family: 'Activités', for: ['activity', 'partner', 'page'], desc: 'Grande photo, message court et informations synthétiques.' },
    { id: 'poster', name: 'Essentiel / affiche', family: 'Activités', for: ['activity', 'info', 'partner', 'page'], desc: 'Titre, date, lieu, visuel et appel à l’action très visibles.' },
    { id: 'animation', name: 'Animation', family: 'Activités', for: ['activity'], desc: 'Affiche attractive, temps forts, programme horaire et infos pratiques.' },
    { id: 'news', name: 'Nouveautés (mosaïque)', family: 'Numéro', for: ['news'], desc: 'Mosaïque photographique de 1 à 6 activités, étiquette « Nouveauté » discrète et dates.' },
    { id: 'last', name: 'Dernières chances', family: 'Numéro', for: ['last'], desc: 'Cartes sobres à l’accent orange pastel : date limite et compteur J−x.' },
    { id: 'partner', name: 'Offre partenaire', family: 'Partenaires', for: ['partner'], desc: 'Logo, offre, remise, code, conditions, échéance et lien.' },
    { id: 'upcoming-list', name: 'Programme à venir · liste', family: 'Programmes', for: ['upcoming'], desc: 'Liste chronologique, regroupée par catégorie.' },
    { id: 'upcoming-table', name: 'Programme à venir · tableau', family: 'Programmes', for: ['upcoming'], desc: 'Tableau : activité, lieu, type, date.' },
    { id: 'rules', name: 'Règlement / modalités', family: 'Pages fixes', for: ['rules'], desc: 'Texte structuré sur une ou plusieurs diapositives, toujours en fin de MEL.' }
  ];
  var ITEM_TEMPLATES = { activity: ['classic', 'immersive', 'poster', 'animation', 'info'], info: ['info', 'classic', 'poster'], partner: ['partner', 'immersive', 'poster'],
    calendar: ['calendar'], page: ['info', 'classic', 'immersive', 'poster'], rules: ['rules'] };

  /* ---------- Utilitaires de contenu ---------- */
  function heading(text, color) { return { runs: [{ text: text, bold: true, color: color || L().C.navy }], heading: true }; }
  function blank() { return { runs: [{ text: '' }] }; }
  function rich(text, o) { return Mx().parseRich(text, o); }
  function hasText(v) { return String(v || '').trim().length > 0; }
  function labelled(label, text) { return { runs: [{ text: label + ' : ', bold: true, color: L().C.navy }].concat(Mx().parseRich(String(text).replace(/\n+/g, ' '))[0].runs) }; }
  function programParas(text) {
    // « 14h00 - Accueil » : l'horaire passe en gras ; sinon puce.
    return String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = /^(\d{1,2}\s?[h:]\s?\d{0,2}(?:\s?[-–à]\s?\d{1,2}\s?[h:]\s?\d{0,2})?)\s*[-–:]?\s+(.*)$/i.exec(l);
      if (m) return { runs: [{ text: m[1].replace(/\s/g, '') + '  ', bold: true, color: L().C.purple }].concat(Mx().parseRich(m[2])[0].runs) };
      var p = Mx().parseRich(l.replace(/^[-•*]\s*/, ''))[0];
      p.bullet = true;
      return p;
    });
  }
  function joinParas(groups) {
    var out = [];
    groups.forEach(function (g) { if (!g || !g.length) return; if (out.length) out.push(blank()); out.push.apply(out, g); });
    return out;
  }
  function dateLine(it) {
    var d = D(), parts = [];
    var range = d.fmtRange(it.dateStart, it.dateEnd);
    if (range) parts.push(range);
    var times = [it.timeStart, it.timeEnd].filter(hasText).map(d.fmtTime);
    if (times.length) parts.push(times.length === 2 ? times[0] + ' – ' + times[1] : 'à ' + times[0]);
    if (hasText(it.location)) parts.push(it.location.trim());
    var line = parts.join(' · ');
    if (hasText(it.subtitle)) {
      var subtitle = it.subtitle.trim();
      // Éviter « Du 15 au 20 février — Du 15 au 20 février » lorsque le sous-titre
      // répète déjà exactement la période remplie dans les champs de date.
      var normalized = function (v) { return String(v || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr'); };
      if (range) {
        var subNorm = normalized(subtitle), rangeNorm = normalized(range);
        if (subNorm === rangeNorm) subtitle = '';
        else if (subNorm.indexOf(rangeNorm) === 0 && /^[\s\-–—·:]+/.test(subtitle.slice(range.length))) {
          // Exemple : « Du 15 au 28 février 2027 — Excursions » : la date
          // est déjà produite par les champs structurés, garder seulement le complément.
          subtitle = subtitle.slice(range.length).replace(/^[\s\-–—·:]+/, '').trim();
        }
      }
      if (subtitle) line = line ? line + ' — ' + subtitle : subtitle;
    }
    return line;
  }
  var EMAIL_RE = /^[^\s@<>"'(),;:\\]+@[^\s@<>"'(),;:\\]+\.[A-Za-z]{2,}$/;
  function validEmail(e) { return EMAIL_RE.test(String(e || '').trim()); }
  function mailto(e) { e = String(e || '').trim(); return validEmail(e) ? 'mailto:' + e : ''; }
  function shownContacts(it) { return (it.contacts || []).filter(function (c) { return hasText(c.name) || validEmail(c.email); }); }
  /** Contacts : seuls les noms sont affichés ; chaque nom ayant un e-mail valide est un lien mailto distinct. */
  function contactRuns(it) {
    var runs = [];
    shownContacts(it).forEach(function (c, i) {
      if (i) runs.push({ text: ' · ', bold: false });
      var name = hasText(c.name) ? c.name.trim() : String(c.email).trim().split('@')[0];
      var link = mailto(c.email);
      runs.push(link ? { text: name, bold: true, link: link } : { text: name, bold: true });
    });
    return runs;
  }
  function contactText(it) { return contactRuns(it).map(function (r) { return r.text; }).join(''); }
  function counterLabel(c) { return { long: 'Séjour long', short: 'Séjour court', france: 'Séjour FRANCE' }[c] || ''; }
  function ageText(v) { v = String(v || '').trim(); return /^\d+$/.test(v) ? 'Dès ' + v + ' ans' : v; }
  function showLastBox(ctx) { return !!(ctx.cls && ctx.cls.isLast); }

  /** Informations pratiques : seules les données saisies produisent une ligne (ordre logique conservé). */
  function practicalRows(ctx, opts) {
    opts = opts || {};
    var it = ctx.item, cls = ctx.cls || {}, pr = ctx.prices, C = L().C, d = D(), rows = [];
    if (it.regEnd && it.type !== 'partner' && !showLastBox(ctx)) rows.push({ label: 'Inscriptions jusqu’au', value: d.capital(d.fmtDay(it.regEnd)), short: d.fmtLong(it.regEnd) });
    if (cls.regLabel && it.regStatus !== 'auto' && it.regStatus !== 'open') rows.push({ label: 'Inscriptions', value: cls.regLabel, color: C.lastText });
    if (!opts.noPrice && pr && pr.kind === 'single') rows.push({ label: pr.rows[0].label + (pr.outside !== null ? ' · ext. ' + P().money(pr.outside) : ''), value: P().money(pr.rows[0].price), color: C.purple });
    if (it.minPart || it.maxPart) rows.push({ label: 'Participants', value: [it.minPart ? 'Min. ' + it.minPart : '', it.maxPart ? 'Max. ' + it.maxPart : ''].filter(Boolean).join(' · ') });
    if (it.points && it.points.value) rows.push({ label: 'Points', value: it.points.value + ' point' + (parseFloat(String(it.points.value).replace(',', '.')) > 1 ? 's' : '') + (it.points.counter ? ' · ' + counterLabel(it.points.counter) : ''), color: C.purple });
    if (hasText(it.audience) || hasText(it.minAge)) rows.push({ label: 'Public', value: [it.audience, ageText(it.minAge)].filter(hasText).join(' · ') });
    if (hasText(it.address)) rows.push({ label: 'Adresse', value: it.address });
    if (hasText(it.carbon)) rows.push({ label: 'Bilan carbone', value: it.carbon, color: C.green });
    return rows;
  }
  /** Paragraphes du corps de fiche, par ordre d'importance. */
  function bodyParas(ctx, o) {
    o = o || {};
    var it = ctx.item, C = L().C, groups = [];
    if (hasText(it.summary)) groups.push(rich(it.summary, { bold: true }).map(function (p) { p.runs.forEach(function (r) { r.color = r.color || C.navy; }); return p; }));
    if (hasText(it.description)) groups.push(rich(it.description));
    if (!o.noHighlights && hasText(it.highlights)) groups.push([heading('Temps forts')].concat(programParas(it.highlights).map(function (p) { p.bullet = true; return p; })));
    if (!o.noProgram && hasText(it.program)) groups.push([heading('Programme')].concat(programParas(it.program)));
    var prac = [];
    if (hasText(it.transport)) prac.push(labelled('Transport', it.transport));
    if (hasText(it.lodging)) prac.push(labelled('Hébergement', it.lodging));
    if (hasText(it.conditions)) prac.push(labelled('Conditions', it.conditions));
    if (hasText(it.regInfo)) prac.push(labelled('Inscription', it.regInfo));
    if (hasText(it.notes) && !o.notesElsewhere) prac.push(labelled('À noter', it.notes));
    if (!o.noPractical && prac.length) groups.push(prac);
    return joinParas(groups);
  }

  /** Contexte d'une diapositive supplémentaire : numéro de page décalé. */
  function nth(ctx, i, extra) { return Object.assign({}, ctx, { pageNumber: ctx.pageNumber ? ctx.pageNumber + i : 0 }, extra || {}); }

  /* ---------- Coulée du texte dans plusieurs zones ---------- */
  function flow(paras, boxes, size, lh) {
    var M = Mx(), chunks = boxes.map(function () { return []; }), q = paras.slice(), bi = 0, used = 0;
    lh = lh || M.LINE_HEIGHT;
    while (q.length && bi < boxes.length) {
      var p = q.shift(), box = boxes[bi], cap = (box.h + 0.5) / (size * lh);
      var empty = M.isEmpty(p);
      if (empty && used === 0) continue;
      var n = empty ? M.PARA_GAP : M.lineCount(p, box.w, size);
      // Un intertitre ne reste jamais seul en bas de colonne : il part avec au moins 2 lignes.
      if (p.heading && used + n + 2 > cap + 1e-6 && q.length && used > 0) { bi++; used = 0; q.unshift(p); continue; }
      if (used + n <= cap + 1e-6) { chunks[bi].push(p); used += n; continue; }
      var room = Math.floor(cap - used + 1e-6);
      // Pas de ligne isolée : au moins 2 lignes de chaque côté d'une coupure.
      var minPart = 2;
      if (!empty && room >= minPart && n - room >= minPart) {
        var parts = M.splitPara(p, box.w, size, room);
        if (parts) { chunks[bi].push(parts[0]); q.unshift(parts[1]); }
        else q.unshift(p);
      } else if (!empty) q.unshift(p);
      bi++; used = 0;
    }
    return { chunks: chunks, rest: q };
  }
  /** Place des paragraphes dans 1..n zones avec une taille commune, la plus grande possible. */
  function placeFlow(b, paras, boxes, o) {
    o = o || {};
    if (!paras.length) return { size: 0, rest: [] };
    var max = (o.size || 19) * b.scale, min = o.min || (b.density === 'compact' ? L().MIN.compactBody : L().MIN.body);
    var size = max, f;
    for (; size >= min - 0.001; size -= 0.5) { f = flow(paras, boxes, size); if (!f.rest.length) break; }
    if (size < min) size = min;
    f = flow(paras, boxes, size);
    if (f.rest.length && o.allowRest) {
      f.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: size, min: size, color: o.color, field: o.field, noScale: true }); });
      return { size: size, rest: f.rest };
    }
    if (f.rest.length) {
      // Ne tient pas : la dernière zone reçoit le reste et signale le débordement.
      var lastIdx = boxes.length - 1;
      f.chunks[lastIdx] = f.chunks[lastIdx].concat(f.rest);
    }
    f.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: size, min: size, color: o.color, field: o.field, noScale: true }); });
    return { size: size, rest: [] };
  }
  /** Hauteur naturelle d'un texte à une taille donnée. */
  function natural(paras, w, size) { return Mx().textHeight(paras, w, size); }

  /* ---------- En-tête commun des fiches ---------- */
  /** Catégorie + pictogramme à gauche, statuts sobres à droite (urgence prioritaire), titre et date sur toute la largeur. */
  function itemHeader(b, ctx, o) {
    o = o || {};
    var it = ctx.item, C = L().C, cat = ctx.cat, cls = ctx.cls || {}, d = D();
    b.banner();
    var x = 40, right = 1160, boxW = 0;
    if (!o.noStatus && showLastBox(ctx)) { var lb = b.lastChanceBox(it.regEnd ? d.fmtLong(it.regEnd) : '', right, 186, { align: 'right' }); right = lb.x - 12; boxW = lb.w + 12; }
    if (!o.noStatus && cls.isNew) { var nl = b.statusLabel('new', 'Nouveauté', right, 188, { align: 'right' }); right = nl.x - 10; }
    if (cat) b.catTag(cat, x, 188, { maxW: Math.max(120, right - x - 50) });
    else if (o.tag) b.tag(o.tag, x, 188, C.blue, { size: 13 });
    var y = 222;
    var suffix = ctx.part >= 2 ? ' (suite)' : '';
    var titleW = 1120 - boxW;
    var tr = b.text((it.title || 'Titre à renseigner') + suffix, x, y, titleW, 88, { size: o.titleSize || 34, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.12 });
    y += tr.height + 2;
    var dl = o.dateLine !== undefined ? o.dateLine : dateLine(it);
    if (dl) { var dr = b.text(dl, x, y, y < 238 ? titleW : 1120, 50, { size: 19, min: 14, bold: true, color: C.purple, maxLines: 2, field: 'date', noScale: true }); y += dr.height; }
    return Math.max(y + 10, boxW ? 246 : 0);
  }
  function itemFooter(b, ctx, o) {
    o = o || {};
    var it = ctx.item, s = ctx.settings;
    b.footer({ contactRuns: o.noContact ? [] : contactRuns(it), contactCount: shownContacts(it).length, link: CO().linkOf(it, s), ctaLabel: it.link && it.link.label, note: s.footerNote });
  }
  /** Colonne de photos (1, 2 ou 3+ photos) ou rien. */
  function photoStack(b, photos, x, y, w, h, color) {
    photos = (photos || []).filter(Boolean);
    if (!photos.length) return;
    if (photos.length === 1 || h < 200) { b.photo(photos[0], x, y, w, h); }
    else if (photos.length === 2) { var h1 = (h - 10) * 0.56; b.photo(photos[0], x, y, w, h1); b.photo(photos[1], x, y + h1 + 10, w, h - h1 - 10); }
    else { var hb = (h - 10) * 0.6, hs = h - hb - 10, ws = (w - 10) / 2; b.photo(photos[0], x, y, w, hb); b.photo(photos[1], x, y + hb + 10, ws, hs); b.photo(photos[2], x + ws + 10, y + hb + 10, ws, hs); }
    b.rect(x, y + h - 4, w, 4, { fill: color || L().C.blue });
  }
  function decoPanel(b, ctx, x, y, w, h) {
    var C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue;
    b.rect(x, y, w, h, { fill: L().tint(color, 0.14), r: 10 });
    var s = Math.min(96, w * 0.42, h * 0.5);
    b.glyph(CSE.icons ? CSE.icons.iconFor(cat) : 'star', x + (w - s) / 2, y + h / 2 - s / 2 - (cat ? 16 : 0), s, L().shade(color, 0.05));
    if (cat) b.text(cat.name, x + 12, y + h / 2 + s / 2 - 6, w - 24, 30, { size: 17, min: 11, bold: true, color: L().shade(color, 0.2), align: 'center', upper: true, maxLines: 1, role: 'deco', noScale: true });
    b.rect(x, y + h - 4, w, 4, { fill: color });
  }

  /* ---------- Moteur de composition adaptatif ---------- */
  /** Plus grande taille (≥ minimum lisible) pour laquelle tout le texte tient dans les zones ; null sinon. */
  function bestSize(paras, boxes, max, min) {
    // Recherche dichotomique sur une grille de 0,5 px (la capacité décroît avec la taille).
    var fits = function (s) { return !flow(paras, boxes, s).rest.length; };
    var n = Math.floor((max - min) / 0.5 + 1e-6);
    if (fits(max)) return Math.round(max * 10) / 10;
    if (!fits(min)) return null;
    var val = function (k) { return k > n ? max : min + k * 0.5; };
    var lo = 0, hi = n + 1; // val(lo) tient, val(hi) ne tient pas
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (fits(val(mid))) lo = mid; else hi = mid; }
    return Math.round(val(lo) * 10) / 10;
  }
  function usedHeight(paras, boxes, s) {
    var f = flow(paras, boxes, s);
    return f.chunks.reduce(function (h, ch, i) { return h + Mx().textHeight(ch, boxes[i].w, s); }, 0);
  }
  /** Colonnes équilibrées : plus petite hauteur commune pour laquelle tout le texte tient encore. */
  function balance(paras, boxes, s) {
    if (boxes.length < 2) return boxes;
    if (flow(paras, boxes, s).rest.length) return boxes;
    var lo = s * 1.2, hi = Math.min.apply(null, boxes.map(function (bx) { return bx.h; }));
    if (flow(paras, boxes.map(function (bx) { return Object.assign({}, bx, { h: hi }); }), s).rest.length) return boxes;
    for (var i = 0; i < 12; i++) {
      var mid = (lo + hi) / 2;
      var test = boxes.map(function (bx) { return Object.assign({}, bx, { h: mid }); });
      if (flow(paras, test, s).rest.length) lo = mid; else hi = mid;
    }
    return boxes.map(function (bx) { return Object.assign({}, bx, { h: Math.ceil(hi) + 2 }); });
  }
  function drawFlow(b, paras, boxes, s, field) {
    if (boxes.length > 1) boxes = balance(paras, boxes, s);
    var f = flow(paras, boxes, s);
    f.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: s, min: s, noScale: true, field: field || 'description' }); });
    return f.rest;
  }
  function columns(x, y, w, h, n, gutter) {
    if (n === 1) return [{ x: x, y: y, w: w, h: h }];
    var cw = (w - gutter) / 2;
    return [{ x: x, y: y, w: cw, h: h }, { x: x + cw + gutter, y: y, w: cw, h: h }];
  }
  /** Plage de tailles du corps selon la densité (px de diapositive, 1 px = 0,8 pt).
   *  Aéré : 16–22 px · Automatique : 15–20 px (12–16 pt) · Compact : 13,75–17,5 px (11–14 pt, choix explicite). */
  function sizeRange(b) {
    var L_ = L();
    if (b.density === 'compact') return { max: 17.5, min: L_.MIN.compactBody };
    if (b.density === 'airy') return { max: 22, min: 16 };
    return { max: 20, min: L_.MIN.body };
  }

  /** Diapositives de suite : en-tête allégé, composition choisie selon la quantité de texte restante
   *  (visuel + 1 colonne, ou 2 colonnes), taille de corps la plus grande possible, sans grand vide. */
  function continuation(ctx, rest, size, firstIndex) {
    var out = [], guard = 0, C = L().C;
    var photos = (ctx.item.photos || []).filter(Boolean);
    var visual = photos.length > 1 ? photos[photos.length - 1] : null;
    // Plusieurs suites nécessaires : texte réparti à parts égales (même taille, même hauteur de colonnes),
    // au lieu d'une dernière diapositive presque vide.
    var probe = new (L().Builder)(nth(ctx, firstIndex, { part: firstIndex + 1 }));
    var ctop = itemHeader(probe, nth(ctx, firstIndex, { part: firstIndex + 1 }), { dateLine: '', noStatus: true }), cbottom = L().T.bodyBottom;
    var RR = sizeRange(probe);
    var full = columns(40, ctop, 1120, cbottom - ctop - 22, 2, 28);
    var pagesAt = function (sz, hgt) { var n = 0, r = rest, bx = full.map(function (x) { return Object.assign({}, x, { h: hgt }); }); while (r.length && n < 9) { r = flow(r, bx, sz).rest; n++; } return r.length ? 99 : n; };
    var need = pagesAt(RR.min, full[0].h), balanced = null;
    if (need >= 2 && need < 9) {
      var bs = RR.min;
      for (var sz = Math.max(RR.max, 20); sz >= RR.min; sz -= 0.5) if (pagesAt(sz, full[0].h) === need) { bs = sz; break; }
      var lo = bs * 1.2 * 3, hi = full[0].h;
      for (var it2 = 0; it2 < 12; it2++) { var mid = (lo + hi) / 2; if (pagesAt(bs, mid) <= need) hi = mid; else lo = mid; }
      balanced = { s: bs, h: Math.ceil(hi) + 2 };
    }
    while (rest.length && guard++ < 8) {
      var cctx = nth(ctx, firstIndex + out.length, { part: firstIndex + out.length + 1 });
      var b = new (L().Builder)(cctx);
      var top = itemHeader(b, cctx, { dateLine: '', noStatus: true }), bottom = L().T.bodyBottom;
      var R = sizeRange(b), best = null;
      if (balanced) {
        // Pages équilibrées : 2 colonnes, même taille et même hauteur utile sur chaque suite.
        var bb = full.map(function (x) { return Object.assign({}, x, { y: top, h: balanced.h }); });
        rest = drawFlow(b, rest, bb, balanced.s, 'suite de la description');
        if (rest.length) b.text('Suite page suivante →', 760, bottom - 18, 400, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
        itemFooter(b, cctx);
        out.push(b.result({ part: firstIndex + out.length + 1 }));
        continue;
      }
      [[0, 2], [0, 1], [300, 1], [300, 2]].forEach(function (o) {
        var pw = o[0], cols = o[1], tx = 40 + (pw ? pw + 20 : 0), tw = 1160 - tx;
        if (cols === 2 && tw < 600) return;
        var boxes = columns(tx, top, tw, bottom - top, cols, 28);
        var s = bestSize(rest, boxes, Math.max(R.max, 22), R.min);
        if (s === null) return;
        var area = boxes.reduce(function (a, x) { return a + x.w * x.h; }, 0);
        var fill = usedHeight(rest, boxes, s) * boxes[0].w / area;
        var cpl = boxes[0].w / (s * 0.5);
        var sc = s * 10 + fill * 14 + (pw ? 5 : 0) - (cols === 1 && cpl > 88 ? (cpl - 88) * 0.5 : 0) - (cols === 2 && fill < 0.5 ? 12 : 0);
        if (!best || sc > best.sc) best = { sc: sc, s: s, pw: pw, boxes: boxes, fill: fill };
      });
      var boxes, s;
      if (best) {
        boxes = best.boxes.map(function (x) { return Object.assign({}, x); }); s = best.s;
        if (best.pw) {
          if (visual) photoStack(b, [visual], 40, top, best.pw, bottom - top, ctx.cat ? ctx.cat.color : C.blue);
          else decoPanel(b, cctx, 40, top, best.pw, bottom - top);
        }
        if (best.fill < 0.62) {
          var bx0 = boxes[0], bxN = boxes[boxes.length - 1];
          b.rect(bx0.x - 14, top - 4, bxN.x + bxN.w - bx0.x + 28, bottom - top + 8, { fill: '#F7F9FD', stroke: '#E3E9F5', r: 10 });
          var shift = Math.max(0, Math.min(80, (boxes[0].h - usedHeight(rest, boxes, s) / boxes.length) / 2 - 6));
          boxes = boxes.map(function (x) { return Object.assign({}, x, { y: x.y + shift, h: x.h - shift }); });
        }
      } else {
        boxes = columns(40, top, 1120, bottom - top - 22, 2, 28); s = R.min;
      }
      rest = drawFlow(b, rest, boxes, s, 'suite de la description');
      if (rest.length) b.text('Suite page suivante →', 760, bottom - 18, 400, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
      itemFooter(b, cctx);
      out.push(b.result({ part: firstIndex + out.length + 1 }));
    }
    if (rest.length) out[out.length - 1].warnings.push({ level: 'block', code: 'overflow', field: 'description', msg: 'Texte beaucoup trop long : plus de 8 diapositives de suite. Raccourcir la fiche.' });
    return out;
  }
  /** Coupe de préférence avant un intertitre (Programme, Temps forts) : la suite forme un bloc logique. */
  function splitAtHeading(paras, boxes, s) {
    var idx = -1;
    for (var i = 1; i < paras.length; i++) if (paras[i].heading) { idx = i; break; }
    if (idx < 0) return null;
    var head = paras.slice(0, idx);
    while (head.length && Mx().isEmpty(head[head.length - 1])) head.pop();
    if (!head.length || flow(head, boxes, s).rest.length) return null;
    var cap = boxes.reduce(function (a, x) { return a + x.h; }, 0), used = usedHeight(head, boxes, s);
    if (used / cap < 0.55) return null; // première diapositive trop vide : coupe classique
    return { first: head, rest: paras.slice(idx) };
  }
  function splitMode(ctx) { var s = ctx.page && ctx.page.split; return s === true || s === 'force' ? 'force' : s === 'off' ? 'off' : 'auto'; }

  /* ================= MODÈLES DE FICHE ================= */

  /** Activité classique (V10) : le contenu dicte la composition.
   * 1. Les blocs vides (photo, tarifs, infos) disparaissent AVANT tout calcul d'espace.
   * 2. Deux familles de compositions sont comparées :
   *    - « bande basse » : photos à gauche, texte en 1–2 colonnes, puis une bande basse avec le
   *      cartouche tarifs (bas-gauche) et les cartes d'informations à sa droite ;
   *    - « colonne gauche » : photos au-dessus du cartouche, texte et informations à droite.
   *    Les informations peuvent aussi former une colonne à droite. Largeurs de photo de 240 à 480.
   * 3. Chaque composition reçoit la plus grande taille de corps qui tient (≥ 12 pt) et un score :
   *    lisibilité, remplissage (peu de blanc), longueur de ligne, taille de photo.
   * 4. Diapositive de suite uniquement si aucune composition ne tient à 12 pt. */
  function classic(ctx) {
    var it = ctx.item, C = L().C, T = L().T, cat = ctx.cat, color = cat ? cat.color : C.blue;
    var probe = new (L().Builder)(ctx);
    var top = itemHeader(probe, ctx), bottom = T.bodyBottom, x0 = T.margin, right = T.right;
    var paras = bodyParas(ctx), rows = practicalRows(ctx), pr = ctx.prices, photos = (it.photos || []).filter(Boolean);
    var R = sizeRange(probe), gap = 20;
    var plainLen = Mx().plain(paras).length;
    var sparse = paras.length > 0 && plainLen < 520;
    if (sparse && probe.density !== 'compact') R.max = Math.max(R.max, probe.density === 'airy' ? 26 : 24);
    var g = probe.priceGridSize(pr, 640);
    var hasPrice = !!g.h;
    var photoWs = photos.length ? [240, 300, 360, 420, 480] : (plainLen < 700 && !hasPrice ? [-280, -340, 0] : [0]);
    var cands = [];
    function addBand(pw, infoMode) {
      var panelW = infoMode === 'panel' ? 250 : 0;
      var bandRight = right - (panelW ? panelW + gap : 0);
      var ig = null, bandH = 0;
      if (infoMode === 'band' && rows.length) {
        var iw = hasPrice ? bandRight - x0 - g.w - 14 : bandRight - x0;
        if (iw < 170) return;
        ig = probe.infoGridSize(rows, iw, hasPrice ? 4 : 5);
        if (!ig.fits && ig.cols > 1) return;
        bandH = Math.max(g.h, ig.h);
      } else bandH = g.h;
      var bodyBottom = bottom - (bandH ? bandH + 12 : 0);
      var tx = x0 + (pw ? Math.abs(pw) + gap : 0), tRight = panelW ? right - panelW - gap : right;
      if (bodyBottom - top < 110) return;
      var panelH = panelW ? probe.infoPanelSize(rows, panelW) : 0;
      if (panelW && panelH > bottom - top) return;
      [1, 2].forEach(function (cols) {
        if (cols === 2 && tRight - tx < 600) return;
        var iwUsed = ig ? ig.cols * ig.cw + (ig.cols - 1) * 10 : 0, iwAvail = ig ? (hasPrice ? bandRight - x0 - g.w - 14 : bandRight - x0) : 0;
        var waste = hasPrice && !ig ? (bandRight - x0 - g.w) * g.h : ig ? (iwAvail - iwUsed) * bandH + (hasPrice ? Math.abs(ig.h - g.h) * 200 : 0) : 0;
        cands.push({ kind: 'band', pw: pw, cols: cols, infoMode: infoMode, top: top, bodyBottom: bodyBottom, waste: waste,
          photo: pw ? { x: x0, y: top, w: Math.abs(pw), h: bodyBottom - top } : null,
          boxes: columns(tx, top, tRight - tx, bodyBottom - top, cols, 28),
          price: hasPrice ? { x: x0, y: bottom - g.h } : null,
          info: ig ? { mode: 'grid', x: hasPrice ? x0 + g.w + 14 : x0, y: bottom - bandH, w: (hasPrice ? bandRight - x0 - g.w - 14 : bandRight - x0), h: bandH, cols: hasPrice ? 4 : 5 }
            : panelW ? { mode: 'panel', x: right - panelW, y: top, w: panelW, h: bottom - top } : null });
      });
    }
    function addLeft(lw, infoMode) {
      if (!photos.length) return; // colonne gauche = photos (+ cartouche dessous) : jamais une colonne vide
      if (hasPrice) lw = Math.max(lw, g.w);
      var photoBottom = bottom - (hasPrice ? g.h + 12 : 0);
      if (photos.length && photoBottom - top < 130) return;
      var rx = x0 + lw + gap, panelW = infoMode === 'panel' ? 250 : 0, tRight = right - (panelW ? panelW + gap : 0);
      var ig = infoMode === 'band' && rows.length ? probe.infoGridSize(rows, tRight - rx, 3) : null;
      if (ig && !ig.fits && ig.cols > 1) return;
      var textBottom = bottom - (ig ? ig.h + 12 : 0);
      if (textBottom - top < 110) return;
      [1, 2].forEach(function (cols) {
        if (cols === 2 && tRight - rx < 600) return;
        cands.push({ kind: 'left', pw: photos.length ? lw : 0, cols: cols, infoMode: infoMode, top: top, bodyBottom: textBottom, waste: hasPrice ? (lw - g.w) * g.h : 0,
          photo: photos.length ? { x: x0, y: top, w: lw, h: photoBottom - top } : null,
          boxes: columns(rx, top, tRight - rx, textBottom - top, cols, 28),
          price: hasPrice ? { x: x0, y: bottom - g.h } : null,
          info: ig ? { mode: 'grid', x: rx, y: textBottom + 12, w: tRight - rx, h: ig.h, cols: 3 } : panelW ? { mode: 'panel', x: right - panelW, y: top, w: panelW, h: bottom - top } : null });
      });
    }
    var infoModes = rows.length ? (rows.length >= 3 ? ['band', 'panel'] : ['band']) : ['none'];
    photoWs.forEach(function (pw) { infoModes.forEach(function (im) { addBand(pw, im); }); });
    if (photos.length) [hasPrice ? g.w : 300, 380, 460].forEach(function (lw) { infoModes.forEach(function (im) { addLeft(lw, im); }); });
    function score(c) {
      var s = paras.length ? bestSize(paras, c.boxes, R.max, R.min) : R.max;
      if (s === null) return null;
      var area = c.boxes.reduce(function (a, b) { return a + b.w * b.h; }, 0);
      var used = paras.length ? usedHeight(paras, c.boxes, s) * c.boxes[0].w : 0;
      var fill = area ? Math.min(1, used / area) : 0;
      var cpl = c.boxes[0].w / (s * 0.5);
      var sc = s * 10 + fill * 14;
      if (c.cols === 1 && cpl > 88) sc -= (cpl - 88) * 0.5;
      if (c.cols === 2 && cpl < 38) sc -= (38 - cpl) * 1.5;
      if (c.cols === 2 && fill < 0.5) sc -= 12;
      if (c.photo) {
        var ph = c.photo.h, pw = c.photo.w, ratio = ph / pw;
        if (c.pw > 0) sc += Math.min(8, pw * ph / 22000) - (ratio < 0.45 ? 8 : 0) - (ratio > 1.9 ? (ratio - 1.9) * 10 : 0) - (ph < 150 ? 8 : 0);
        else sc += 2;
      }
      if (c.info && c.info.mode === 'panel' && rows.length < 4) sc -= 4;
      sc -= (c.waste || 0) / 8000;
      if (!paras.length) sc = (c.photo ? c.photo.w * c.photo.h / 4000 : 0) - c.cols * 5;
      return { s: s, fill: fill, score: sc };
    }
    var best = null;
    cands.forEach(function (c) { var r = score(c); if (r && (!best || r.score > best.r.score)) best = { c: c, r: r }; });
    if (CSE.debugLayout) CSE.debugLayout.push({ top: top, cands: cands.map(function (c) { var r = score(c); return [c.kind, c.pw, c.cols, c.infoMode, Math.round(c.bodyBottom - c.top), c.boxes.map(function (x) { return Math.round(x.w) + 'x' + Math.round(x.h); }).join('+'), r ? r.s + '/' + Math.round(r.score) : '—'].join(' '); }) });
    var mode = splitMode(ctx);
    var b = new (L().Builder)(ctx);
    itemHeader(b, ctx);
    var gm, s, rest = [];
    if (best && mode !== 'force') { gm = best.c; s = best.r.s; }
    else {
      // Contenu trop long (ou suite demandée) : page 1 = composition qui y place le plus de texte à 17 px.
      // De préférence, coupe logique : tout le texte avant le premier intertitre (description)
      // sur la 1re diapositive, à une taille confortable ; le programme / les temps forts passent à la suite.
      s = Math.max(R.min, Math.min(R.max, 17));
      var hIdx = -1;
      for (var hi = 1; hi < paras.length; hi++) if (paras[hi].heading) { hIdx = hi; break; }
      var firstPart = hIdx > 0 ? paras.slice(0, hIdx) : null;
      while (firstPart && firstPart.length && Mx().isEmpty(firstPart[firstPart.length - 1])) firstPart.pop();
      var bestSplit = null;
      cands.forEach(function (c) {
        var bx = c.boxes.map(function (x) { return Object.assign({}, x); });
        bx[bx.length - 1].h -= 22;
        var sc, s1 = null;
        if (firstPart && firstPart.length) s1 = bestSize(firstPart, bx, Math.min(R.max, 20), Math.max(R.min, 16));
        if (s1 !== null) {
          var area = bx.reduce(function (a, x) { return a + x.w * x.h; }, 0), fill = usedHeight(firstPart, bx, s1) * bx[0].w / area;
          if (fill < 0.45) s1 = null;
          else sc = 1e6 + s1 * 10 + fill * 14 + (c.photo && c.pw > 0 ? Math.min(8, c.photo.w * c.photo.h / 22000) : 0) - (c.waste || 0) / 8000 - (c.cols === 2 && bx[0].w / (s1 * 0.5) < 38 ? 10 : 0);
        }
        if (s1 === null) sc = flow(paras, bx, s).chunks.reduce(function (n, ch) { return n + Mx().plain(ch).length; }, 0) + (c.photo && c.pw > 0 ? 40 : 0);
        if (!bestSplit || sc > bestSplit.sc) bestSplit = { c: c, sc: sc, s1: s1 };
      });
      gm = bestSplit ? bestSplit.c : { boxes: columns(x0, top, 1120, bottom - top, 2, 28), top: top, bodyBottom: bottom, cols: 2, pw: 0 };
      // Nombre total de diapositives minimal : estimation des suites (2 colonnes pleine page au corps minimal).
      var contPages = function (restParas) {
        var n = 0, r = restParas, cb = columns(40, 262, 1120, 590 - 262 - 22, 2, 28);
        while (r.length && n < 9) { r = flow(r, cb, R.min).rest; n++; }
        return n;
      };
      var firstBoxes = gm.boxes.map(function (x) { return Object.assign({}, x); });
      firstBoxes[firstBoxes.length - 1].h -= 22;
      var plan = null;
      if (bestSplit && bestSplit.s1 !== null) plan = { pages: 1 + contPages(paras.slice(hIdx)), s: bestSplit.s1, heading: true };
      // Coupe classique : taille de la 1re diapositive entre 17 et le minimum, au nombre de diapositives le plus faible.
      for (var sz = Math.min(R.max, 17); sz >= R.min - 0.001; sz -= 0.5) {
        var pages = 1 + contPages(flow(paras, firstBoxes, sz).rest);
        if (!plan || pages < plan.pages) plan = { pages: pages, s: sz, heading: false };
      }
      s = plan.s;
      if (plan.heading) gm.headingSplit = { first: firstPart, rest: paras.slice(hIdx) };
    }
    if (gm.photo && gm.pw > 0) photoStack(b, photos, gm.photo.x, gm.photo.y, gm.photo.w, gm.photo.h, color);
    else if (gm.photo && gm.pw < 0) decoPanel(b, ctx, gm.photo.x, gm.photo.y, gm.photo.w, gm.photo.h);
    if (paras.length) {
      var boxes = gm.boxes.map(function (x) { return Object.assign({}, x); });
      if (best && mode !== 'force') {
        var fill = best.r.fill;
        if (fill < 0.62) {
          // Texte court : encart teinté et texte centré verticalement, plutôt qu'une bande blanche.
          var bx0 = boxes[0], bxN = boxes[boxes.length - 1];
          b.rect(bx0.x - 14, gm.top - 4, bxN.x + bxN.w - bx0.x + 28, gm.bodyBottom - gm.top + 8, { fill: '#F7F9FD', stroke: '#E3E9F5', r: 10 });
          var naturalH = usedHeight(paras, boxes, s) / boxes.length;
          var shift = Math.max(0, Math.min(60, (boxes[0].h - naturalH) / 2 - 6));
          boxes = boxes.map(function (x) { return Object.assign({}, x, { y: x.y + shift, h: x.h - shift }); });
        }
        rest = drawFlow(b, paras, boxes, s, 'description');
      } else if (mode === 'off') {
        var f0 = flow(paras, boxes, R.min);
        f0.chunks[f0.chunks.length - 1] = f0.chunks[f0.chunks.length - 1].concat(f0.rest);
        f0.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: R.min, min: R.min, noScale: true, field: 'description' }); });
        b.warn('Contenu trop long pour une seule diapositive : choisir « Texte long : automatique » pour publier tout le texte lisiblement.', 'warn', 'suggest-split');
      } else {
        var lastBox = boxes[boxes.length - 1];
        lastBox.h -= 22;
        // Coupe logique : description sur la 1re diapositive, programme / temps forts sur la suite.
        var sp = gm.headingSplit || splitAtHeading(paras, boxes, s);
        if (sp) { drawFlow(b, sp.first, boxes, s, 'description'); rest = sp.rest; }
        else rest = drawFlow(b, paras, boxes, s, 'description');
        if (rest.length) b.text('Suite page suivante →', lastBox.x, lastBox.y + lastBox.h + 3, lastBox.w, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
      }
    } else if (!photos.length && !rows.length && !hasPrice) {
      b.text('Renseigner une description, un programme ou des informations pratiques.', gm.boxes[0].x, gm.top, gm.boxes[0].w, 60, { size: 18, color: C.muted, field: 'description', important: false });
    }
    if (hasPrice && gm.price) b.priceGrid(pr, gm.price.x, gm.price.y, 640);
    if (gm.info && gm.info.mode === 'grid') b.infoGrid(rows, gm.info.x, gm.info.y, gm.info.w, gm.info.cols, gm.info.h);
    else if (gm.info && gm.info.mode === 'panel') b.infoPanel(rows, gm.info.x, gm.info.y, gm.info.w, gm.info.h);
    else if (rows.length && !gm.info) b.infoGrid(rows, x0, bottom - probe.infoGridSize(rows, 1120, 5).h, 1120, 5);
    itemFooter(b, ctx);
    var slides = [b.result()];
    if (rest.length) {
      slides = slides.concat(continuation(ctx, rest, s, 1));
      slides[0].warnings.push({ level: 'info', code: 'auto-split', msg: 'Contenu trop long pour une diapositive lisible : ' + slides.length + ' diapositives générées (corps de texte ≥ 12 pt).' });
    }
    return slides;
  }
  /** Immersif : grande photo à gauche, message court et informations synthétiques ; la suite éventuelle passe sur une autre diapositive. */
  function immersive(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue, cls = ctx.cls || {}, d = D();
    b.banner();
    var photo = (it.photos || [])[0];
    var pw = 560, y0 = L().BANNER_H + 2.5, h = 645 - y0;
    if (photo) b.photo(photo, 0, y0, pw, h); else decoPanel(b, ctx, 0, y0, pw, h);
    b.rect(pw, y0, 6, h, { fill: color });
    var x = pw + 36, w = 1160 - x, y = y0 + 14, rx = 1160;
    if (showLastBox(ctx)) { var lb = b.lastChanceBox(it.regEnd ? d.fmtLong(it.regEnd) : '', rx, y, { align: 'right' }); rx = lb.x - 10; }
    if (cls.isNew) { var nl = b.statusLabel('new', 'Nouveauté', rx, y + 2, { align: 'right' }); rx = nl.x - 10; }
    if (cat) b.catTag(cat, x, y + 2, { maxW: Math.max(100, rx - x - 40) });
    y += showLastBox(ctx) ? 60 : 40;
    var tr = b.text(it.title || 'Titre à renseigner', x, y, w, 110, { size: 36, min: L().MIN.title, bold: true, color: C.navy, maxLines: 3, field: 'titre', noScale: true, lh: 1.1 });
    y += tr.height + 4;
    var dl = dateLine(it);
    if (dl) { var dr = b.text(dl, x, y, w, 52, { size: 19, min: 14, bold: true, color: C.purple, maxLines: 2, field: 'date', noScale: true }); y += dr.height + 8; }
    var rows = practicalRows(ctx);
    var pl = ctx.prices.kind === 'grid' ? b.priceLine(ctx.prices) : '';
    var shown = rows.slice(0, 4), gridRows = Math.ceil(shown.length / 2);
    var infoH = gridRows ? gridRows * 54 + 4 : 0, plH = pl ? 28 : 0;
    var textBottom = 590 - infoH - plH - (infoH || plH ? 6 : 0);
    var paras = joinParas([hasText(it.summary) ? rich(it.summary, { bold: true }) : [], hasText(it.description) ? rich(it.description) : [], hasText(it.highlights) ? programParas(it.highlights).map(function (p) { p.bullet = true; return p; }) : []]);
    var rest = [], R = sizeRange(b), s = R.min;
    // Message court : corps agrandi plutôt qu'une grande zone vide sous le texte.
    if (Mx().plain(paras).length < 320 && b.density !== 'compact') R.max = 26;
    if (paras.length) {
      var box = [{ x: x, y: y, w: w, h: textBottom - y }];
      var fit = bestSize(paras, box, R.max, R.min);
      s = fit || 17;
      if (!fit) box[0].h -= 22;
      rest = drawFlow(b, paras, box, s, 'description');
      if (rest.length) b.text('Suite page suivante →', x, box[0].y + box[0].h + 2, w, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
    }
    var cy = textBottom + 6;
    if (pl) { b.text(pl, x, cy, w, 24, { size: 15, min: 12, bold: true, color: C.purple, maxLines: 1, field: 'tarifs', noScale: true }); cy += plH; }
    if (shown.length) {
      var cw = (w - 12) / 2;
      shown.forEach(function (r, i) { b.infoStrip([r], x + (i % 2) * (cw + 12), cy + Math.floor(i / 2) * 54, cw); });
      if (rows.length > 4) b.warn('Immersif : ' + (rows.length - 4) + ' information(s) secondaire(s) masquée(s) ; le modèle classique les affiche toutes.', 'info');
    }
    b.footer({ link: CO().linkOf(it, ctx.settings), ctaLabel: it.link && it.link.label, note: ctx.settings.footerNote });
    var runs = contactRuns(it);
    if (runs.length) b.text([{ runs: [{ text: shownContacts(it).length > 1 ? 'Contacts : ' : 'Contact : ', bold: true }].concat(runs) }], x, 604, 1160 - x - 280, 34, { size: 14, min: 12, color: C.purple, valign: 'middle', maxLines: 2, role: 'label', noScale: true, field: 'contacts', important: false });
    var slides = [b.result()];
    if (rest.length) {
      slides = slides.concat(continuation(ctx, rest, s, 1));
      slides[0].warnings.push({ level: 'info', code: 'auto-split', msg: 'Texte trop long pour le modèle immersif : suite générée sur une autre diapositive (ou choisir le modèle classique).' });
    }
    return slides;
  }

  /** Essentiel / affiche : titre, date, lieu, visuel, appel à l'action. */
  function poster(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue, cls = ctx.cls || {}, d = D();
    b.banner();
    var rx = 1160;
    if (showLastBox(ctx)) { var lb = b.lastChanceBox(it.regEnd ? d.fmtLong(it.regEnd) : '', rx, 186, { align: 'right' }); rx = lb.x - 12; }
    if (cls.isNew) { var nl = b.statusLabel('new', 'Nouveauté', rx, 188, { align: 'right' }); rx = nl.x - 10; }
    if (cat) b.catTag(cat, 40, 188, { maxW: Math.max(100, rx - 90) });
    var y = showLastBox(ctx) ? 244 : 222;
    var tr = b.text(String(it.title || 'Titre à renseigner').toLocaleUpperCase('fr'), 80, y, 1040, 100, { size: 42, min: 26, bold: true, color: C.navy, align: 'center', maxLines: 2, field: 'titre', noScale: true, lh: 1.08 });
    y += tr.height + 4;
    var dr = d.fmtRange(it.dateStart, it.dateEnd, { day: true });
    var times = [it.timeStart, it.timeEnd].filter(hasText).map(d.fmtTime);
    var dline = [dr, times.length === 2 ? times[0] + ' – ' + times[1] : times[0] ? 'à ' + times[0] : ''].filter(Boolean).join(' · ') || it.subtitle;
    if (dline) { var r1 = b.text(dline, 60, y, 1080, 38, { size: 26, min: 18, bold: true, color: C.purple, align: 'center', maxLines: 1, field: 'date', noScale: true }); y += r1.height + 2; }
    if (hasText(it.location)) { var r2 = b.text(it.location + (hasText(it.address) ? ' — ' + it.address : ''), 60, y, 1080, 28, { size: 19, min: 14, bold: true, color: C.muted, align: 'center', maxLines: 1, field: 'lieu', noScale: true }); y += r2.height + 4; }
    y += 6;
    var pills = [];
    if (it.regEnd && !showLastBox(ctx)) pills.push({ t: 'Inscriptions jusqu’au ' + d.fmtShort(it.regEnd, true), fill: C.navy });
    if (ctx.prices.rows.length) pills.push({ t: ctx.prices.kind === 'single' ? ctx.prices.rows[0].label + ' : ' + P().money(ctx.prices.rows[0].price) : 'Dès ' + P().money(ctx.prices.rows[0].price) + ' (T1)', fill: C.purple });
    if (it.maxPart) pills.push({ t: it.maxPart + ' places', fill: C.blue });
    if (ageText(it.minAge)) pills.push({ t: ageText(it.minAge), fill: L().shade(color, 0.1) });
    var pillsH = pills.length ? 40 : 0;
    var summaryH = hasText(it.summary) ? 54 : 0;
    var visualH = 590 - y - pillsH - summaryH - (pillsH ? 12 : 0) - (summaryH ? 8 : 0);
    var photo = (it.photos || [])[0];
    if (visualH >= 90) {
      if (photo) b.photo(photo, 40, y, 1120, visualH);
      else if (!summaryH && hasText(it.description)) { b.rect(40, y, 1120, visualH, { fill: L().tint(color, 0.14), r: 14 }); b.text(it.description, 80, y + 14, 1040, visualH - 28, { size: 22, color: C.dark, align: 'center', valign: 'middle', field: 'description' }); }
      else decoPanel(b, ctx, 40, y, 1120, visualH);
      y += visualH + 8;
    }
    if (summaryH) { b.text(it.summary, 60, y, 1080, 48, { size: 19, min: 15, bold: true, color: C.dark, align: 'center', maxLines: 2, field: 'résumé', noScale: true }); y += summaryH; }
    if (pills.length) {
      var sizes = pills.map(function (p) { return Math.min(420, Mx().width(p.t, 16, true) * 1.06 + 30); });
      var total = sizes.reduce(function (a, c) { return a + c; }, 0) + 12 * (pills.length - 1);
      var sc = total > 1120 ? 1120 / total : 1;
      var px = 600 - total * sc / 2;
      pills.forEach(function (p, i) { b.pill(p.t, px, 590 - 36, { size: 16, h: 36, w: sizes[i] * sc, fill: p.fill }); px += sizes[i] * sc + 12; });
    }
    itemFooter(b, ctx);
    return [b.result()];
  }

  /** Animation : visuel, temps forts, programme horaire, infos pratiques. */
  function animation(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.purple;
    var top = itemHeader(b, ctx, { titleSize: 36 }), bottom = 590;
    var photos = it.photos || [];
    var hasHl = hasText(it.highlights), hasPg = hasText(it.program);
    var rows = practicalRows(ctx);
    var pr = ctx.prices, pl = pr.kind === 'grid' ? b.priceLine(pr) : '';
    var photoW = photos.length ? 320 : 0, x = 40 + (photoW ? photoW + 22 : 0), w = 1160 - x;
    var shown = rows.slice(0, w > 700 ? 4 : 3);
    var rowH = shown.length ? 58 : 0, plH = pl ? 28 : 0;
    var bodyBottom = bottom - rowH - plH;
    if (photoW) photoStack(b, photos, 40, top, photoW, bottom - top, color);
    var y = top;
    var lead = joinParas([hasText(it.summary) ? rich(it.summary, { bold: true }) : [], hasText(it.description) ? rich(it.description) : []]);
    var boxesH = (hasHl || hasPg) ? Math.max(150, (bodyBottom - y) * (lead.length ? 0.62 : 1)) : 0;
    if (lead.length) {
      var leadH = bodyBottom - y - boxesH - (boxesH ? 12 : 0);
      var lr = b.text(lead, x, y, w, leadH, { size: 20, min: L().MIN.body, field: 'description' });
      y += (boxesH ? Math.min(leadH, lr.height) + 12 : leadH);
      boxesH = bodyBottom - y;
    }
    if (hasHl || hasPg) {
      var both = hasHl && hasPg, bw = both ? (w - 16) / 2 : w;
      if (hasHl) {
        b.rect(x, y, bw, boxesH, { fill: L().tint(color, 0.08), stroke: L().tint(color, 0.3), r: 12 });
        b.text('Temps forts', x + 16, y + 10, bw - 32, 24, { size: 16, bold: true, color: L().shade(color, 0.1), maxLines: 1, role: 'label', noScale: true, upper: true });
        b.text(programParas(it.highlights).map(function (p) { p.bullet = true; return p; }), x + 16, y + 40, bw - 32, boxesH - 50, { size: 21, min: L().MIN.body, field: 'temps forts', color: C.dark });
      }
      if (hasPg) {
        var px = hasHl ? x + bw + 16 : x;
        b.rect(px, y, bw, boxesH, { fill: C.lighter, stroke: C.border, r: 12 });
        b.text('Programme', px + 16, y + 10, bw - 32, 24, { size: 16, bold: true, color: C.navy, maxLines: 1, role: 'label', noScale: true, upper: true });
        b.text(programParas(it.program), px + 16, y + 40, bw - 32, boxesH - 50, { size: 20, min: L().MIN.body, field: 'programme', color: C.dark });
      }
    }
    var cy = bodyBottom + 6;
    if (pl) { b.text(pl, x, cy, w, 22, { size: 15, min: 12, bold: true, color: C.purple, maxLines: 1, noScale: true, field: 'tarifs' }); cy += plH; }
    if (shown.length) b.infoStrip(shown, x, cy + 4, w);
    if (rows.length > shown.length) b.warn('Animation : ' + (rows.length - shown.length) + ' information(s) secondaire(s) non affichée(s).', 'info');
    itemFooter(b, ctx);
    return [b.result()];
  }

  /** Information : pictogramme, message hiérarchisé, encadré d'alerte ; texte long → diapositive de suite. */
  function info(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cls = ctx.cls || {};
    b.banner();
    var rx = 1160;
    if (cls.isNew) { var nl = b.statusLabel('new', 'Nouveauté', rx, 192, { align: 'right' }); rx = nl.x - 10; }
    var cat = ctx.cat;
    b.rect(40, 192, 52, 52, { fill: cat && cat.name !== 'Informations' ? cat.color : C.blue, r: 12 });
    b.glyph(CSE.icons ? CSE.icons.iconFor(cat || { name: 'Informations' }) : 'info', 50, 202, 32, C.white);
    var x = 108, y = 188;
    b.text((cat && cat.name !== 'Informations' ? cat.name : 'Information CSE'), x, y, rx - x, 20, { size: 13, bold: true, color: C.blue, upper: true, maxLines: 1, role: 'label', noScale: true });
    y += 22;
    var tr = b.text(it.title || 'Titre de l’information', x, y, 1160 - x - (cls.isNew ? 1160 - rx : 0), 80, { size: 32, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.12 });
    y += tr.height + 2;
    var dl = [it.subtitle, it.dateStart && !it.dateEnd ? D().fmtLong(it.dateStart) : ''].filter(hasText).join(' · ');
    if (dl) { var sr = b.text(dl, x, y, 1160 - x, 28, { size: 19, min: 14, bold: true, color: C.purple, maxLines: 1, field: 'sous-titre', noScale: true }); y += sr.height; }
    y = Math.max(y + 12, 262);
    var photo = (it.photos || [])[0];
    var bottom = 592, alertH = 0, textX = 40, textW = 1120;
    if (photo) { var pw = 340; b.photo(photo, 1160 - pw, y, pw, bottom - y); b.rect(1160 - pw, bottom - 4, pw, 4, { fill: C.blue }); textW = 1120 - pw - 24; }
    if (hasText(it.notes)) {
      var ap = rich(it.notes, { bold: true });
      var ah = Math.min(130, Math.max(56, b.measure(ap, textW - 90, 17) + 24));
      alertH = ah;
      b.rect(textX, bottom - ah, textW, ah, { fill: '#FFF4F2', stroke: '#F3C9C4', r: 12 });
      b.icon('alert', textX + 16, bottom - ah / 2 - 17, 34, '#C2453B');
      b.text(ap, textX + 64, bottom - ah + 12, textW - 82, ah - 24, { size: 17, min: L().MIN.body, bold: true, color: '#8F2A22', valign: 'middle', field: 'encadré d’alerte' });
    }
    var bodyBottom = bottom - (alertH ? alertH + 14 : 0);
    var paras = bodyParas(ctx, { notesElsewhere: true });
    b.rect(textX, y, textW, bodyBottom - y, { fill: C.lighter, r: 14 });
    b.rect(textX, y, 5, bodyBottom - y, { fill: C.blue });
    var rest = [], s = 18;
    if (paras.length) {
      var R = sizeRange(b), inner = { x: textX + 24, y: y + 16, w: textW - 48, h: bodyBottom - y - 30 };
      var one = [inner], two = textW > 900 ? columns(inner.x, inner.y, inner.w, inner.h, 2, 30) : null;
      var s1 = bestSize(paras, one, Math.max(R.max, 23), R.min), s2 = two ? bestSize(paras, two, Math.max(R.max, 23), R.min) : null;
      var useTwo = s2 !== null && (s1 === null || (s2 > s1 + 1.5 && inner.w / (s1 * 0.5) > 95));
      var boxes = useTwo ? two : one;
      s = useTwo ? s2 : s1;
      if (s === null) { s = 17; boxes = two || one; boxes[boxes.length - 1].h -= 22; }
      rest = drawFlow(b, paras, boxes, s, 'texte de l’information');
      if (rest.length) { var lbx = boxes[boxes.length - 1]; b.text('Suite page suivante →', lbx.x, lbx.y + lbx.h + 2, lbx.w, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true }); }
    }
    itemFooter(b, ctx);
    var slides = [b.result()];
    if (rest.length) slides = slides.concat(continuation(ctx, rest, s, 1));
    return slides;
  }

  /** Offre partenaire (V10) : encart « Partenaire CSE » en tête, logo à gauche, puis titre, offre,
   *  code / échéance et conditions. Quand le contenu est court, les tailles augmentent ensemble
   *  (hiérarchie conservée) et le bloc est centré verticalement : pas de demi-diapositive vide. */
  function partner(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cls = ctx.cls || {}, pa = it.partner || {}, d = D();
    b.banner();
    var photos = (it.photos || []).filter(Boolean);
    // En-tête : encart « Partenaire CSE » (pictogramme vectoriel) et éventuelle nouveauté.
    b.rect(40, 188, 26, 26, { fill: C.purple, r: 6 });
    b.glyph('bag', 44, 192, 18, C.white);
    b.text('Partenaire CSE', 74, 188, 300, 26, { size: 14, min: 11, bold: true, color: C.purple, valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'catégorie' });
    var rx = 1160;
    if (cls.isNew) { var nl = b.statusLabel('new', 'Nouveauté', rx, 188, { align: 'right' }); rx = nl.x - 10; }
    var top = 226, bottom = 592, lx = 40, lw = 380;
    // Visuel : logo (contain) ou pictogramme ; second visuel éventuel en dessous.
    var logoH = photos[1] ? 200 : bottom - top;
    b.rect(lx, top, lw, logoH, { fill: C.white, stroke: C.border, r: 14 });
    if (photos[0]) b.photo(photos[0], lx + 14, top + 14, lw - 28, logoH - 28, { fit: 'contain' });
    else {
      b.rect(lx + 14, top + 14, lw - 28, logoH - 28, { fill: C.lilac, r: 12 });
      var iconY = top + 14 + (logoH - 28 - 120) / 2;
      b.glyph(CSE.icons ? CSE.icons.iconFor(ctx.cat || { name: 'Partenaire' }) : 'star', lx + (lw - 84) / 2, iconY, 84, C.purple);
      b.text('Avantage partenaire', lx + 30, iconY + 92, lw - 60, 26, { size: 15, min: 12, bold: true, color: C.purple, upper: true, align: 'center', valign: 'middle', role: 'label', noScale: true, maxLines: 1 });
    }
    if (photos[1]) b.photo(photos[1], lx, top + logoH + 12, lw, bottom - top - logoH - 12);
    var x = lx + lw + 32, w = 1160 - x;
    var hasAmount = hasText(pa.amount), hasOffer = hasText(pa.offer);
    var offerParas = hasOffer ? rich(pa.offer, { bold: true }) : [];
    var paras = bodyParas(ctx);
    var until = pa.validUntil || it.regEnd;
    var hasPills = hasText(pa.code) || !!until;
    // Recherche de l'échelle k (1 → 1,45) la plus grande pour laquelle tout tient ; hauteurs mesurées.
    function plan(k) {
      var titleS = Math.min(46, 36 * k), subS = Math.min(26, 19 * k), offerS = Math.min(36, 25 * k), bodyS = Math.min(28, 19 * k);
      var h = 0, parts = {};
      parts.title = Math.min(2, Mx().countLines(Mx().toParas(it.title || 'Nom du partenaire', { bold: true }), rx - x, titleS)) * titleS * 1.1; h += parts.title + 6;
      if (hasText(it.subtitle)) { parts.sub = Mx().countLines(Mx().toParas(it.subtitle, { bold: true }), w, subS) * subS * 1.2; h += parts.sub + 10; }
      if (hasOffer || hasAmount) {
        var ow = w - (hasAmount ? 150 : 0) - 36;
        parts.offer = Math.max(hasAmount ? 124 : 70, (hasOffer ? Mx().textHeight(offerParas, ow, offerS) : 0) + 30);
        h += parts.offer + 14;
      }
      if (hasPills) { parts.pills = 40; h += 54; }
      if (paras.length) { parts.body = Mx().textHeight(paras, w, bodyS); h += parts.body; }
      return { k: k, h: h, parts: parts, titleS: titleS, subS: subS, offerS: offerS, bodyS: bodyS };
    }
    var p = plan(1);
    for (var k = 1.45; k >= 1; k -= 0.05) { var q = plan(k); if (q.h <= bottom - top - 8 && q.parts.offer <= 190) { p = q; break; } }
    var y = top + Math.max(0, (bottom - top - p.h) * 0.42);
    var tr = b.text(it.title || 'Nom du partenaire', x, y, rx - x, p.parts.title + 4, { size: p.titleS, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.1 });
    y += tr.height + 6;
    if (p.parts.sub) { var sr = b.text(it.subtitle, x, y, w, p.parts.sub + 2, { size: p.subS, min: 14, bold: true, color: C.muted, field: 'sous-titre', noScale: true }); y += sr.height + 10; }
    if (p.parts.offer) {
      var oh = p.parts.offer, ow2 = w - (hasAmount ? 150 : 0) - 36;
      b.rect(x, y, w, oh, { fill: C.lilac, stroke: '#DCCFF8', r: 14 });
      if (hasAmount) {
        b.ellipse(x + 16, y + oh / 2 - 56, 112, 112, { fill: C.purple });
        b.text(pa.amount, x + 22, y + oh / 2 - 56, 100, 112, { size: 32, min: 14, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 2, role: 'deco', noScale: true, field: 'remise' });
      }
      if (offerParas.length) b.text(offerParas, x + (hasAmount ? 150 : 18), y + 12, ow2, oh - 24, { size: p.offerS, min: 15, bold: true, color: C.purple, valign: 'middle', field: 'offre', noScale: true });
      y += oh + 14;
    }
    if (hasPills) {
      var rx2 = x;
      if (hasText(pa.code)) { var cw2 = b.pill('CODE : ' + pa.code, rx2, y, { size: 18, h: 40, fill: C.navy }); rx2 += cw2 + 12; }
      if (until) {
        var dl = d.diffDays(until, ctx.ref), soon = dl !== null && dl >= 0 && dl <= 7;
        b.pill('Jusqu’au ' + d.fmtLong(until), rx2, y, { size: 17, h: 40, fill: soon ? C.lastBg : C.light, color: soon ? C.lastText : C.navy, stroke: soon ? C.lastBorder : C.border });
      }
      y += 54;
    }
    if (paras.length) b.text(paras, x, y, w, Math.max(40, bottom - y), { size: p.bodyS, min: L().MIN.body, field: 'conditions de l’offre', noScale: true });
    itemFooter(b, ctx);
    return [b.result()];
  }
  /** Calendrier mensuel de permanences (jours ouvrés) : Ouvert (vert, horaire standard), Horaire particulier
   * (orange, horaire saisi jour par jour), Fermé (rouge). Légende générée à partir des jours réellement utilisés.
   * Les cases sont cliquables dans l'aperçu. */
  function calendar(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, d = D(), cal = it.calendar || {}, M_ = CSE.model;
    b.banner();
    var month = cal.month || (ctx.ref || d.todayParis()).slice(0, 7);
    var title = it.title || 'Permanences du mois';
    b.text(title, 300, 186, 860, 44, { size: 32, min: 22, bold: true, color: C.navy, align: 'center', maxLines: 1, field: 'titre', noScale: true });
    if (hasText(it.subtitle)) b.text(it.subtitle, 300, 228, 860, 26, { size: 18, min: 13, bold: true, color: C.purple, align: 'center', maxLines: 1, field: 'sous-titre', noScale: true });
    // Colonne gauche : service, photo, contacts (noms cliquables), catalogue.
    var lx = 40, lw = 230, ly = 194;
    var service = cal.service || 'Permanences';
    b.rect(lx, ly, lw, 54, { fill: C.blue, r: 27 });
    b.glyph('calendar', lx + 16, ly + 14, 26, C.white);
    b.text(service, lx + 50, ly, lw - 64, 54, { size: 21, min: 12, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 2, field: 'service', noScale: true });
    ly += 66;
    var photo = (it.photos || [])[0];
    if (photo) { b.photo(photo, lx, ly, lw, 150); ly += 162; }
    else {
      // Sans photo : panneau pictogramme sobre, pour équilibrer la colonne gauche.
      b.rect(lx, ly, lw, 132, { fill: L().tint(C.blue, 0.1), r: 12 });
      b.glyph('calendar', lx + (lw - 70) / 2, ly + 18, 70, L().tint(C.blue, 0.75));
      b.text(cal.service || 'Permanences', lx + 10, ly + 94, lw - 20, 26, { size: 14, min: 12, bold: true, color: C.blue, upper: true, align: 'center', valign: 'middle', maxLines: 1, role: 'deco', noScale: true });
      ly += 144;
    }
    var cParas = [];
    var shown = shownContacts(it);
    if (shown.length) {
      cParas.push({ runs: [{ text: shown.length > 1 ? 'Contacts :' : 'Contact :', bold: true, color: C.navy }] });
      shown.forEach(function (c) { var link = mailto(c.email); var name = hasText(c.name) ? c.name.trim() : String(c.email).split('@')[0]; cParas.push({ runs: [link ? { text: name, bold: true, color: C.purple, link: link } : { text: name, bold: true, color: C.purple }] }); });
    }
    var catH = cal.catalogUrl ? 44 : 0;
    if (cParas.length) b.text(cParas, lx, ly, lw, 590 - ly - catH, { size: 17, min: 12, align: 'center', field: 'contacts' });
    if (cal.catalogUrl && CO().validUrl(cal.catalogUrl)) {
      b.rect(lx, 590 - 38, lw, 38, { fill: C.light, stroke: C.border, r: 10 });
      b.text((cal.catalogLabel || 'Catalogue') + ' →', lx + 8, 590 - 38, lw - 16, 38, { size: 15, min: 11, bold: true, color: C.blue, align: 'center', valign: 'middle', maxLines: 1, link: cal.catalogUrl, role: 'label', noScale: true });
    }
    // Grille.
    var p = /^(\d{4})-(\d{2})$/.exec(month), year = +p[1], mo = +p[2];
    var first = month + '-01', mon = d.monday(first);
    var lastIso = month + '-' + d.pad(new Date(Date.UTC(year, mo, 0)).getUTCDate());
    var weeks = [];
    for (var wk = mon; wk <= lastIso; wk = d.addDays(wk, 7)) {
      var anyIn = false;
      for (var k = 0; k < 5; k++) if (d.addDays(wk, k).slice(0, 7) === month) anyIn = true;
      if (anyIn) weeks.push(wk);
    }
    var gx = 300, gy = 262, gw = 560, colW = 58, cellW = (gw - colW) / 5;
    var headH = 40, dayH = 30;
    var rowH = Math.min(54, (590 - 24 - gy - headH - dayH) / weeks.length);
    b.rect(gx, gy, gw, headH, { fill: C.navy, r: 10 });
    b.text(d.monthLabel(month), gx, gy, gw, headH, { size: 23, min: 14, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    var hy = gy + headH;
    ['Sem.', 'LUN', 'MAR', 'MER', 'JEU', 'VEN'].forEach(function (h, i) {
      var hx = i === 0 ? gx : gx + colW + (i - 1) * cellW, hw = i === 0 ? colW : cellW;
      b.rect(hx, hy, hw, dayH, { fill: '#DCE6F7', stroke: '#B8C8E4' });
      b.text(h, hx, hy, hw, dayH, { size: 14, min: 10, bold: true, color: C.navy, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    });
    var used = { open: [], special: [], closed: [] };
    weeks.forEach(function (wkStart, r) {
      var ry = hy + dayH + r * rowH;
      b.rect(gx, ry, colW, rowH, { fill: '#F2F5FB', stroke: '#B8C8E4' });
      b.text(String(d.isoWeek(wkStart).week), gx, ry, colW, rowH, { size: 16, min: 10, color: C.muted, bold: true, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
      for (var c = 0; c < 5; c++) {
        var day = d.addDays(wkStart, c), inMonth = day.slice(0, 7) === month;
        var st = inMonth ? M_.calendarDay(cal, day) : null;
        var def = st ? M_.CAL_STATES[st.state] : null;
        var cx = gx + colW + c * cellW;
        b.rect(cx, ry, cellW, rowH, { fill: inMonth ? (def ? def.color : C.white) : '#EEF0F3', stroke: '#B8C8E4', act: inMonth ? { type: 'calendar-day', date: day } : null });
        if (!inMonth) continue;
        if (st) used[st.state].push({ date: day, hours: st.hours });
        var hrs = st && st.state === 'special' ? st.hours : '';
        if (hrs && rowH >= 40 && Mx().countLines(Mx().toParas(hrs), cellW - 8, 12) <= 2) {
          b.text(String(+day.slice(8)), cx, ry + 2, cellW, 17, { size: 15, min: 10, bold: true, color: C.ink, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, act: { type: 'calendar-day', date: day } });
          b.text(hrs, cx + 3, ry + 18, cellW - 6, rowH - 19, { size: 12, min: 11, bold: true, color: '#5A3A12', align: 'center', valign: 'top', maxLines: 2, role: 'label', noScale: true, field: 'horaire du jour', act: { type: 'calendar-day', date: day } });
        } else {
          b.text(String(+day.slice(8)) + (hrs ? '*' : ''), cx, ry, cellW, rowH, { size: 18, min: 10, bold: true, color: def && isDark(def.color) ? C.white : C.ink, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, act: { type: 'calendar-day', date: day } });
        }
      }
    });
    var gridBottom = hy + dayH + weeks.length * rowH;
    // Légende générée : seulement les états utilisés ce mois-ci, horaires dédoublonnés.
    var legend = calendarLegend(cal, used);
    var rx = 890, rw = 270, ry2 = 262;
    if (legend.length) b.text('Légende', rx, ry2, rw, 26, { size: 17, bold: true, color: C.navy, upper: true, maxLines: 1, role: 'label', noScale: true });
    ry2 += 34;
    var hoursH = hasText(cal.hours) ? Math.min(90, b.measure(cal.hours, rw, 15, { bold: true }) + 12) : 0;
    var room = 590 - ry2 - hoursH;
    legend.forEach(function (e, i) {
      var remaining = legend.length - i;
      var maxH = Math.max(32, room - 36 * (remaining - 1));
      b.rect(rx, ry2 + 2, 30, 24, { fill: M_.CAL_STATES[e.state].color, stroke: '#9AA8BF', r: 4 });
      var lr = b.text(e.paras, rx + 40, ry2, rw - 40, maxH, { size: 16, min: 12, color: C.ink, valign: 'top', field: 'légende', noScale: true });
      var hgt = Math.max(30, lr.height + 10);
      ry2 += hgt; room -= hgt;
    });
    if (hoursH) b.text(cal.hours, rx, Math.max(ry2 + 4, 590 - hoursH), rw, hoursH, { size: 15, min: 12, color: C.blue, bold: true, field: 'horaires' });
    var note = cal.note || (ctx.settings.mentions && ctx.settings.mentions.calendar) || '';
    if (note) b.text(note, gx, Math.min(gridBottom + 8, 590), gw, 20, { size: 12.5, min: 10, color: C.muted, maxLines: 1, field: 'mention', role: 'label', noScale: true, important: false });
    if (!used.open.length && !used.special.length && !used.closed.length) b.warn('Calendrier vide : cliquer sur les jours pour indiquer Ouvert, Horaire particulier ou Fermé.', 'warn');
    if (used.special.some(function (x) { return !hasText(x.hours); })) b.warn('Des jours « Horaire particulier » n’ont pas d’horaire saisi.', 'warn');
    b.footer({ link: CO().linkOf(it, ctx.settings), ctaLabel: it.link && it.link.label, note: ctx.settings.footerNote });
    return [b.result()];
  }
  /** Légende du calendrier : [{state, paras}] uniquement pour les états présents. */
  function calendarLegend(cal, used) {
    var C = L().C, out = [];
    if (used.open.length) out.push({ state: 'open', paras: [{ runs: [{ text: 'Ouvert', bold: true }].concat(hasText(cal.openHours) ? [{ text: ' : ' + cal.openHours.trim() }] : []) }] });
    if (used.special.length) {
      var groups = [], byHours = {};
      used.special.forEach(function (x) {
        var k = hasText(x.hours) ? x.hours.trim() : 'horaire à préciser';
        if (!byHours[k]) { byHours[k] = []; groups.push(k); }
        byHours[k].push(x.date);
      });
      var paras = [{ runs: [{ text: 'Horaires spécifiques', bold: true }].concat(groups.length === 1 ? [{ text: ' : ' + groups[0] }] : []) }];
      if (groups.length > 1) groups.forEach(function (g) {
        var dates = byHours[g].map(function (dt) { return dt.slice(8) + '/' + dt.slice(5, 7); }).join(', ');
        paras.push({ runs: [{ text: dates + ' : ', bold: true, color: C.lastText }, { text: g }] });
      });
      out.push({ state: 'special', paras: paras });
    }
    if (used.closed.length) out.push({ state: 'closed', paras: [{ runs: [{ text: 'Fermé', bold: true }] }] });
    return out;
  }
  function isDark(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return false; var n = parseInt(m[1], 16); return ((n >> 16 & 255) * 299 + (n >> 8 & 255) * 587 + (n & 255) * 114) / 1000 < 140; }

  /** Règlement / modalités : texte structuré, colonnes, pagination automatique. */
  function rules(ctx) {
    var it = ctx.item, C = L().C;
    var paras = rich(it.description || 'Texte du règlement à renseigner et à faire valider par le CSE.').map(function (p) {
      var t = p.runs.map(function (r) { return r.text; }).join('');
      var m = /^#{1,3}\s+(.*)$/.exec(t);
      if (m) return heading(m[1], C.navy);
      return p;
    });
    var slides = [], rest = paras, guard = 0;
    var alert = hasText(it.notes) ? rich(it.notes, { bold: true }) : null;
    var probe = new (L().Builder)(ctx);
    // Taille unique : la plus grande qui tient sur une page ; sinon 15 px avec pagination.
    var maxS = 18 * probe.scale, minS = probe.density === 'compact' ? 12.5 : 13.5;
    var titleSub = hasText(it.subtitle);
    var top0 = (titleSub ? 302 : 268) + (alert ? 84 : 0), colH = 590 - top0, cw = (1120 - 36) / 2;
    var chosen = null;
    for (var s = maxS; s >= minS; s -= 0.5) { if (!flow(paras, [{ w: cw, h: colH }, { w: cw, h: colH }], s).rest.length) { chosen = s; break; } }
    var size = chosen || Math.max(minS, 15 * probe.scale);
    while (rest.length && guard++ < 60) {
      var part = slides.length;
      var b = new (L().Builder)(nth(ctx, part));
      b.banner();
      var y = 190;
      b.icon('info', 40, 192, 50, C.blue);
      b.text((it.title || 'Modalités d’inscription') + (part ? ' (suite)' : ''), 104, y, 1056, 70, { size: 30, min: 20, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.1 });
      y = 262;
      if (titleSub && part === 0) {
        b.text(it.subtitle, 104, 257, 1040, 32, { size: 20, min: 14, bold: true, color: C.purple, maxLines: 1, field: 'sous-titre', noScale: true });
        y += 34;
      }
      if (alert && part === 0) {
        b.rect(40, y, 1120, 74, { fill: '#FFF1F0', stroke: '#F3C1BE', r: 12 });
        b.icon('alert', 56, y + 18, 38, C.red);
        b.text(alert, 110, y + 8, 1030, 58, { size: 20, min: 13, bold: true, color: '#A1142A', valign: 'middle', field: 'encadré du règlement' });
        y += 84;
      }
      var hcol = 590 - y;
      var boxes = [{ x: 40, y: y, w: cw, h: hcol }, { x: 40 + cw + 36, y: y, w: cw, h: hcol }];
      b.rect(40 + cw + 17, y + 6, 2, hcol - 12, { fill: C.border });
      var f = flow(rest, boxes, size);
      if (f.rest.length) {
        // Place réservée à la mention « Suite » en bas de la 2e colonne (jamais sur le bouton du pied).
        boxes[1].h -= 22;
        f = flow(rest, boxes, size);
      }
      f.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: size, min: size, noScale: true, field: 'règlement' }); });
      rest = f.rest;
      if (rest.length) b.text('Suite page suivante →', boxes[1].x, boxes[1].y + boxes[1].h + 4, boxes[1].w, 18, { size: 13, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
      b.footer({ link: CO().linkOf(it, ctx.settings), ctaLabel: it.link && it.link.label, note: ctx.settings.footerNote || 'Modalités à vérifier avant chaque diffusion' });
      slides.push(b.result({ part: part + 1 }));
      if (!f.chunks.some(function (c) { return c.length; })) break;
    }
    if (rest.length) slides[slides.length - 1].warnings.push({ level: 'block', msg: 'Règlement très long : la limite de sécurité des 60 diapositives est atteinte. Vérifier le contenu.' });
    if (slides.length > 1) slides[0].warnings.push({ level: 'info', msg: 'Règlement réparti automatiquement sur ' + slides.length + ' diapositives.' });
    return slides;
  }

  /* ================= PAGES DE NUMÉRO ================= */

  function cover(ctx) {
    var b = new (L().Builder)(ctx), C = L().C, d = D(), s = ctx.settings, issue = ctx.issue, o = ctx.page.opts || {};
    var data = CO().coverData(ctx.page, ctx.project, issue);
    b.banner();
    var title = (issue.title || s.melTitle || 'MEL DU CSE').toLocaleUpperCase('fr') + ' – SEMAINE ' + issue.week;
    var tw = Math.min(900, Mx().width(title, 30, true) * 1.05);
    b.text(title, 600 - tw / 2 - 10, 186, tw + 20, 40, { size: 30, min: 20, bold: true, color: C.navy, align: 'center', valign: 'middle', maxLines: 1, field: 'titre', noScale: true });
    b.rect(40, 205, Math.max(10, 600 - tw / 2 - 64), 3, { fill: C.navy });
    b.rect(600 + tw / 2 + 24, 205, Math.max(10, 1160 - (600 + tw / 2 + 24)), 3, { fill: C.navy });
    var mondayIso = d.isoWeekMonday(issue.week, issue.year);
    b.text('Semaine du ' + d.fmtRange(mondayIso, d.addDays(mondayIso, 4)).replace(/^Du /, '').replace(/^Le /, ''), 300, 226, 600, 20, { size: 14, min: 11, color: C.muted, align: 'center', maxLines: 1, role: 'label', noScale: true });
    var blocks = [];
    var imp = o.important || {};
    if (hasText(imp.title) || hasText(imp.text)) blocks.push('important');
    var mustText = '';
    var mustRuns = null;
    if (o.mustSee && o.mustSee.auto === false && hasText(o.mustSee.text)) mustText = o.mustSee.text;
    else if (data.last.length) {
      mustRuns = [{ text: data.last.length > 1 ? 'Dernière semaine pour vous inscrire : ' : 'Dernière semaine pour vous inscrire à ', bold: true, color: C.navy }];
      data.last.slice(0, 5).forEach(function (it, i) {
        if (i) mustRuns.push({ text: ' · ', color: C.navy });
        mustRuns.push({ text: it.title, bold: true, color: C.lastText });
        if (it.regEnd) mustRuns.push({ text: ' (jusqu’au ' + d.fmtShort(it.regEnd) + ')', color: C.lastText });
      });
      if (data.last.length > 5) mustRuns.push({ text: ' et ' + (data.last.length - 5) + ' autre(s)', color: C.navy });
    }
    if (mustText || mustRuns) blocks.push('must');
    var news = data.news;
    if (news.length) blocks.push('news');
    var editorial = String(o.editorial || '').trim();
    var extraNotes = (Array.isArray(o.extraNotes) ? o.extraNotes : []).map(function (s) { return String(s || '').trim(); }).filter(Boolean).slice(0, 4);
    if (extraNotes.length) blocks.push('extra');
    var link = s.planningUrl && CO().validUrl(s.planningUrl) ? s.planningUrl : (CO().validUrl(s.portalUrl) ? s.portalUrl : M().PORTAL);
    var showLink = o.showPlanning !== false && !!link;
    var top = 256, bottom = 636 - (showLink ? 40 : 0) - (editorial ? 30 : 0), gap = 12;
    // Conserver des tailles minimales pour les messages importants. Quand la couverture est
    // chargée, les nouveautés passent en bandeau compact et le surplus de notes sur une page dédiée.
    var fullAvail = bottom - top;
    var baseMin = (blocks.indexOf('important') >= 0 ? 66 + gap : 0) + (blocks.indexOf('must') >= 0 ? 62 + gap : 0) + (news.length ? 150 : 0);
    var compactNews = !!news.length && !!extraNotes.length && (baseMin + 8 + 10 + extraNotes.length * 27 > fullAvail);
    if (compactNews) baseMin -= 150 - 70;
    var slots = Math.max(0, Math.floor((fullAvail - baseMin - 18) / 27));
    var visibleNotes = extraNotes.filter(function (s) { return s.length <= 110; }).slice(0, Math.min(extraNotes.length, slots));
    var remainingNotes = extraNotes.filter(function (s) { return visibleNotes.indexOf(s) < 0; });
    var extraH = visibleNotes.length ? 10 + visibleNotes.length * 27 : 0;
    var avail = fullAvail - extraH - (extraH ? 8 : 0);
    // Hauteurs naturelles puis répartition de l'espace restant au bloc nouveautés.
    var impParas = hasText(imp.title) ? [{ runs: [{ text: imp.title.trim(), bold: true }] }].concat(hasText(imp.text) ? rich(imp.text) : []) : rich(imp.text);
    var mustParas = mustRuns ? [{ runs: mustRuns }] : rich(mustText, { bold: true });
    var hasImp = blocks.indexOf('important') >= 0, hasMust = blocks.indexOf('must') >= 0;
    var newsMin = news.length ? (compactNews ? 70 : 150) : 0, hImp = 0, hMust = 0;
    // Hauteurs naturelles à une taille commune, réduite si nécessaire pour laisser place aux nouveautés.
    for (var fs = 21; fs >= 14; fs -= 1) {
      hImp = hasImp ? Math.max(66, b.measure(impParas, 836, fs) + 22) : 0;
      hMust = hasMust ? Math.max(62, b.measure(mustParas, 836, fs) + 22) : 0;
      if (hImp + hMust + (hImp ? gap : 0) + (hMust ? gap : 0) + newsMin <= avail) break;
    }
    var used = hImp + hMust + (hImp ? gap : 0) + (hMust ? gap : 0);
    if (used + newsMin > avail) { var k = (avail - newsMin - (hImp ? gap : 0) - (hMust ? gap : 0)) / Math.max(1, hImp + hMust); hImp *= k; hMust *= k; used = avail - newsMin; }
    var hNews = news.length ? Math.min(compactNews ? 74 : 260, Math.max(newsMin, avail - used)) : 0;
    var spare = avail - used - hNews;
    if (spare > 0) { var share = (hImp ? 1 : 0) + (hMust ? 1 : 0); if (share) { if (hImp) hImp += Math.min(90, spare / share); if (hMust) hMust += Math.min(90, spare / share); } }
    var totalH = hImp + hMust + hNews + (hImp ? gap : 0) + (hMust ? gap : 0);
    top += Math.max(0, (avail - totalH) / 2);
    var y = top;
    function row(kind, h, fill, stroke, accent, label, paras, icon) {
      b.rect(40, y, 1120, h, { fill: fill, stroke: stroke, r: 14 });
      b.icon(icon, 62, y + h / 2 - 22, 44, accent);
      b.pill(label, 124, y + h / 2 - 16, { size: 15, h: 32, w: 160, fill: accent });
      b.text(paras, 304, y + 10, 1160 - 304 - 20, h - 20, { size: 21, min: 14, color: C.navy, valign: 'middle', field: kind });
      y += h + gap;
    }
    if (hImp) row('message important', hImp, '#EAF2FE', '#C9DBF6', C.blue, imp.label || 'Important', impParas, 'mail');
    if (hMust) row('à ne pas manquer', hMust, C.lastBg, C.lastBorder, C.lastText, 'À ne pas manquer', mustParas, 'calendar');
    if (hNews && compactNews) {
      var ny = y, nh = hNews - 8;
      b.rect(40, ny, 1120, nh, { fill: '#EDF7F0', stroke: C.newBorder, r: 10 });
      b.pill('Nouveautés', 56, ny + 14, { size: 14, h: 26, fill: C.newText });
      var compactList = news.slice(0, 4).map(function (it) { return it.title; }).join('  ·  ');
      b.text(compactList, 210, ny + 8, 920, nh - 12, { size: 18, min: 13, color: C.navy, bold: true, valign: 'middle', maxLines: 2, field: 'nouveautés', noScale: true });
      y += hNews + gap;
    } else if (hNews) {
      var ny = y + 14, nh = hNews - 14;
      b.rect(40, ny, 1120, nh, { fill: C.white, stroke: C.newBorder, sw: 2, r: 14 });
      var lab = data.newsTotal > 1 ? 'Les nouveautés de la semaine' : 'La nouveauté de la semaine';
      var lw = Mx().width(lab.toLocaleUpperCase('fr'), 16, true) * 1.06 + 40;
      b.pill(lab.toLocaleUpperCase('fr'), 600 - lw / 2, ny - 16, { size: 16, h: 32, w: lw, fill: C.newText });
      var n = news.length, cg = 14, cw = (1120 - 32 - (n - 1) * cg) / n, ch = nh - 32;
      news.forEach(function (it, i) {
        var cx = 56 + i * (cw + cg), cy = ny + 22;
        var cat = CSE.model.categoryOf(ctx.project, it), col = cat ? cat.color : C.green;
        var ph = (it.photos || [])[0];
        var pw = Math.min(ch * 1.15, cw * 0.42);
        b.photo(ph, cx, cy, pw, ch, { color: col, label: cat ? cat.name : '' });
        var tx = cx + pw + 12, tw2 = cw - pw - 12;
        if (cat) b.text(cat.name, tx, cy, tw2, 20, { size: 14, min: 10, bold: true, color: col, upper: true, maxLines: 1, role: 'label', noScale: true });
        var tr = b.text(it.title, tx, cy + 22, tw2, ch - 48, { size: n <= 2 ? 24 : 19, min: 13, bold: true, color: C.navy, maxLines: 4, field: 'nouveauté', noScale: true });
        var dt = d.fmtRangeShort(it.dateStart, it.dateEnd);
        if (dt) b.text(dt, tx, cy + ch - 22, tw2, 22, { size: 14, min: 10, bold: true, color: C.purple, maxLines: 1, role: 'label', noScale: true });
      });
      if (data.newsTotal > news.length) b.text('+ ' + (data.newsTotal - news.length) + ' autre(s) nouveauté(s) dans ce MEL', 760, ny + nh - 22, 380, 18, { size: 13, color: C.green, bold: true, align: 'right', role: 'label', noScale: true });
      y += hNews + gap;
    }
    if (extraH) {
      var extraY = Math.min(bottom - extraH, y + 2);
      b.rect(40, extraY, 1120, extraH, { fill: '#F3F6FD', stroke: '#DCE5F2', r: 9 });
      var lineY = extraY + 6;
      visibleNotes.forEach(function (note) {
        b.text('• ' + note, 58, lineY, 1080, 26, { size: 15, min: 12, color: C.navy, maxLines: 1, role: 'label', noScale: true, field: 'information complémentaire' });
        lineY += 27;
      });
    }
    if (!hImp && !hMust && !hNews && !extraH) b.text('Ajoutez un message important ou des activités : la couverture se remplit automatiquement.', 80, 320, 1040, 120, { size: 24, color: C.muted, align: 'center', valign: 'middle', field: 'couverture', important: false });
    var ey = 636 - (showLink ? 40 : 0) - (editorial ? 30 : 0) + 2;
    if (editorial) { b.text(editorial, 40, ey, 1120, 26, { size: 16, min: 12, bold: true, color: C.navy, align: 'center', maxLines: 1, field: 'message éditorial', noScale: true }); ey += 30; }
    if (showLink) {
      b.rect(140, ey, 920, 34, { fill: '#E4EEFD', stroke: '#C2D5F3', r: 17 });
      b.text((s.planningLabel || 'Vue d’ensemble des activités du CSE') + ' →', 160, ey, 880, 34, { size: 16, min: 11, bold: true, color: C.blue, align: 'center', valign: 'middle', maxLines: 1, link: link, role: 'label', noScale: true });
    }
    b.footer({ link: '', note: s.footerNote });
    var result = [b.result()];
    if (remainingNotes.length) {
      var next = new (L().Builder)(nth(ctx, 1));
      next.banner();
      next.glyph('info', 56, 194, 36, C.blue);
      next.text('Informations complémentaires du MEL', 110, 190, 1030, 54, { size: 30, min: 20, color: C.navy, bold: true, role: 'label', noScale: true });
      remainingNotes.forEach(function (note, i) {
        var yy = 260 + i * 80;
        next.rect(44, yy, 1112, 66, { fill: '#F3F6FD', stroke: '#DCE5F2', r: 10 });
        next.text(note, 66, yy + 5, 1064, 56, { size: 19, min: 14, color: C.navy, valign: 'middle', maxLines: 3, field: 'information complémentaire' });
      });
      next.footer({ link: '', note: s.footerNote });
      result.push(next.result());
      result[0].warnings.push({ level: 'info', code: 'cover-more', msg: 'Les informations complémentaires supplémentaires sont placées sur une diapositive lisible à la suite de la couverture.' });
    }
    return result;
  }

  /** Mosaïque de 1 à 6 cartes ; au-delà, pages supplémentaires. */
  function mosaic(ctx, urgent) {
    var C = L().C, d = D(), o = ctx.page.opts || {};
    var all = CO().selection(ctx.page, ctx.project, ctx.issue);
    var chunks = [];
    for (var i = 0; i < Math.max(1, all.length); i += 6) chunks.push(all.slice(i, i + 6));
    return chunks.map(function (items, ci) {
      var b = new (L().Builder)(nth(ctx, ci));
      b.banner();
      var bandY = L().BANNER_H + 2.5, bandH = 66;
      var bg = urgent ? C.lastBg : C.newBg, fg = urgent ? C.lastText : C.newText, bd = urgent ? C.lastBorder : C.newBorder, color = fg;
      b.rect(0, bandY, 1200, bandH, { fill: bg });
      b.rect(0, bandY + bandH - 2, 1200, 2, { fill: bd });
      b.glyph(urgent ? 'calendar' : 'star', 40, bandY + 15, 34, fg);
      var title = o.title || (urgent ? 'Dernière chance !' : 'Les nouveautés de la semaine');
      b.text(title.toLocaleUpperCase('fr') + (chunks.length > 1 ? ' (' + (ci + 1) + '/' + chunks.length + ')' : ''), 88, bandY + 6, 712, 36, { size: 28, min: 18, bold: true, color: fg, maxLines: 1, field: 'titre', noScale: true });
      var sub = o.subtitle || (urgent ? 'Clôture des inscriptions d’ici le ' + d.fmtLong(d.addDays(ctx.issue.refDate, ctx.settings.lastDays || 7)) : (all.length > 1 ? all.length + ' nouvelles activités à découvrir' : 'Une nouvelle activité à découvrir'));
      b.text(sub, 88, bandY + 38, 712, 22, { size: 15, min: 11, color: fg, maxLines: 1, field: 'sous-titre', noScale: true, role: 'label' });
      var link = CO().validUrl(ctx.settings.portalUrl) ? ctx.settings.portalUrl : M().PORTAL;
      if (link) b.pill('Inscriptions sur le portail CSE →', 1160, bandY + 15, { size: 15, h: 34, fill: C.white, color: fg, stroke: bd, align: 'right', link: link });
      var top = bandY + bandH + 14, bottom = 636;
      if (!items.length) {
        b.text(urgent ? 'Aucune activité ne se termine dans les 7 jours suivant la date du MEL.' : 'Aucune nouveauté sélectionnée pour ce MEL.', 80, top + 60, 1040, 120, { size: 24, color: C.muted, align: 'center', valign: 'middle', role: 'label' });
        b.warn(urgent ? 'Page « Dernières chances » vide : aucune inscription ne se termine dans la fenêtre de ' + (ctx.settings.lastDays || 7) + ' jours.' : 'Page « Nouveautés » vide : marquer des fiches comme nouveautés ou choisir manuellement les activités.', 'warn');
        b.footer({ link: '', note: ctx.settings.footerNote });
        return b.result();
      }
      var n = items.length, rowsSpec = n <= 3 ? [n] : n === 4 ? [2, 2] : n === 5 ? [3, 2] : [3, 3];
      var gap = 16, rowH = (bottom - top - gap * (rowsSpec.length - 1)) / rowsSpec.length, idx = 0;
      rowsSpec.forEach(function (count, r) {
        var cw = (1120 - gap * (count - 1)) / count;
        for (var k = 0; k < count; k++) {
          var it = items[idx++];
          card(b, ctx, it, 40 + k * (cw + gap), top + r * (rowH + gap), cw, rowH, urgent, n);
        }
      });
      b.footer({ link: '', note: ctx.settings.footerNote });
      return b.result();
    });
  }
  function card(b, ctx, it, x, y, w, h, urgent, n) {
    var C = L().C, d = D();
    var cat = CSE.model.categoryOf(ctx.project, it), col = cat ? cat.color : C.blue;
    var cls = CO().classify(it, ctx.issue.refDate, ctx.settings);
    var horizontal = w / h >= 1.6;
    b.rect(x, y, w, h, { fill: C.white, stroke: C.border, sw: 1, r: 14 });
    var photo = (it.photos || [])[0];
    var pw = horizontal ? Math.min(h * 1.25, w * (n === 1 ? 0.5 : n >= 5 ? 0.34 : 0.42)) : w, ph = horizontal ? h : Math.min(h * 0.5, w * 0.62);
    b.photo(photo, x, y, pw, ph, { color: col, label: cat ? cat.name : '' });
    var tx = horizontal ? x + pw + 16 : x + 14, ty = horizontal ? y + 14 : y + ph + 10;
    var tw = horizontal ? w - pw - 30 : w - 28, bottomY = y + h - 12;
    // Étiquette de statut miniature, alignée avec la catégorie (jamais sur la photo).
    var stTxt = urgent ? (it.regEnd ? d.countdown(it.regEnd, ctx.issue.refDate) : 'Dernière semaine') : (cls.isNew || ctx.page.kind === 'news' ? 'Nouveauté' : '');
    var stW = stTxt ? Math.min(150, Mx().width(stTxt, 11.5, true) * 1.06 + 18) : 0;
    if (stTxt) b.statusLabel(urgent ? 'last' : 'new', stTxt, tx + tw, ty - 1, { align: 'right', size: 11.5, h: 22 });
    if (cat) {
      b.glyph(CSE.icons ? CSE.icons.iconFor(cat) : 'star', tx, ty + 1, 18, col);
      b.text(cat.name, tx + 24, ty, tw - 24 - stW - 8, 20, { size: 14, min: 10, bold: true, color: col, upper: true, maxLines: 1, role: 'label', noScale: true });
    }
    if (cat || stTxt) ty += 26;
    var infoH = urgent ? 54 : 26;
    var big = n === 1;
    var titleH = bottomY - ty - infoH - 6;
    var summaryParas = n <= 2 && hasText(it.summary) ? rich(it.summary) : null;
    var tr = b.text(it.title, tx, ty, tw, big ? Math.min(110, titleH) : titleH, { size: big ? 34 : n <= 3 ? 25 : 21, min: 14, bold: true, color: C.navy, maxLines: big ? 3 : 4, field: 'titre de carte', noScale: true, lh: 1.12 });
    if (summaryParas) { var sy = ty + tr.height + 8; if (bottomY - infoH - 8 - sy > 40) b.text(summaryParas, tx, sy, tw, bottomY - infoH - 8 - sy, { size: big ? 21 : 18, min: 13, color: C.ink, field: 'résumé', important: false }); }
    var dt = d.fmtRange(it.dateStart, it.dateEnd);
    if (urgent) {
      b.rect(tx, bottomY - infoH, tw, infoH, { fill: C.lastBg, stroke: C.lastBorder, r: 8 });
      var narrow = tw < 300;
      b.text(it.regEnd ? (narrow ? 'Jusqu’au ' : 'Inscriptions jusqu’au ') + d.fmtDayShort(it.regEnd) : 'Date limite à préciser', tx + 10, bottomY - infoH + 4, tw - 20, 24, { size: 16, min: 11, bold: true, color: C.lastText, maxLines: 1, role: 'label', noScale: true, field: 'date limite' });
      var dts = narrow ? d.fmtRangeShort(it.dateStart, it.dateEnd) : dt;
      b.text(dts ? (narrow ? '' : 'Activité : ') + dts : 'Dernière semaine', tx + 10, bottomY - infoH + 28, tw - 20, 20, { size: 13.5, min: 10, color: C.lastText, maxLines: 1, role: 'label', noScale: true, field: 'date activité', important: false });
    } else if (dt) {
      b.rect(tx, bottomY - infoH, tw, infoH, { fill: C.newBg, stroke: C.newBorder, r: 7 });
      b.text(dt, tx + 10, bottomY - infoH, tw - 20, infoH, { size: 15, min: 10, bold: true, color: C.newText, valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    }
  }

  /** Programme à venir (V10) : liste chronologique ou tableau. Pagination équilibrée : le nombre de
   *  diapositives est le minimum lisible (titres ≥ 14 pt), puis les lignes sont réparties à parts égales
   *  et la hauteur des lignes s'ajuste à l'espace (pas de dernière page presque vide). */
  function upcoming(ctx, table) {
    var C = L().C, d = D(), o = ctx.page.opts || {};
    var rows = CO().upcomingRows(ctx.page, ctx.project, ctx.issue);
    var cat = o.categoryId ? (ctx.project.categories || []).find(function (c) { return c.id === o.categoryId; }) : null;
    var title = o.title || 'Programme des prochaines activités';
    var sub = o.subtitle || (cat ? cat.name : '') + (o.from || o.to ? (cat ? ' · ' : '') + d.fmtRange(o.from, o.to).replace(/^Le /, 'à partir du ') : '');
    var catColor = function (name) { var c = (ctx.project.categories || []).find(function (x) { return x.name === name; }); return c ? c.color : C.blue; };
    var note = o.note || ctx.settings.mentions.upcoming;
    var y0 = 258, bottom = 592, avail = bottom - y0;
    var showCat = !table && !cat && new Set(rows.map(function (r) { return r.type; })).size > 1;
    var cols = [{ k: 'title', l: 'Activité', w: 500 }, { k: 'location', l: 'Lieu', w: 220 }, { k: 'type', l: cat ? 'Statut' : 'Type', w: 170 }, { k: 'date', l: 'Date', w: 230 }];
    var cellsOf = function (r) { return { title: r.title, location: r.location || '—', type: (cat ? r.status : [r.type, r.status].filter(hasText).join(' · ')) || '—', date: d.fmtRange(r.date, r.dateEnd).replace(/^Le /, '') || 'À préciser' }; };
    var FS = table ? 15 : 17;
    // Hauteur naturelle de chaque ligne (titre sur 2 lignes au plus).
    var natural = rows.map(function (r) {
      if (table) {
        var cells = cellsOf(r), lines = 1;
        cols.forEach(function (c) { lines = Math.max(lines, Math.min(2, Mx().countLines(Mx().toParas(cells[c.k], { bold: c.k === 'title' }), c.w - 24, FS))); });
        return lines * FS * 1.2 + 9;
      }
      var detail = [r.location, r.status].filter(hasText).join(' · ');
      var dw = detail ? Math.min(330, Mx().width(detail, 15, false) * 1.06 + 10) : 0;
      var tw = Math.min(220, showCat && r.type ? Mx().width(String(r.type).toLocaleUpperCase('fr'), 12.5, true) * 1.06 + 20 : 0);
      var titleW = 1150 - 246 - (tw ? tw + 12 : 0) - dw - 16;
      return Math.min(2, Mx().countLines(Mx().toParas(r.title, { bold: true }), titleW, FS)) * FS * 1.2 + 8;
    });
    var gap = table ? 0 : 3, head = table ? 40 : 0;
    // Nombre minimal de diapositives, puis répartition équilibrée.
    var pages = [], cur = [], used = head;
    natural.forEach(function (h, i) { if (cur.length && used + h + gap > avail) { pages.push(cur); cur = []; used = head; } cur.push(i); used += h + gap; });
    if (cur.length) pages.push(cur);
    if (pages.length > 1) {
      var per = Math.ceil(rows.length / pages.length), bal = [];
      for (var i0 = 0; i0 < rows.length; i0 += per) bal.push(rows.slice(i0, i0 + per).map(function (_, k) { return i0 + k; }));
      var okBal = bal.every(function (pg) { return pg.reduce(function (a, i) { return a + natural[i] + gap; }, head) <= avail; });
      if (okBal && bal.length === pages.length) pages = bal;
    }
    if (!rows.length) pages = [[]];
    var slides = [];
    pages.forEach(function (idx, pi) {
      var b = new (L().Builder)(nth(ctx, pi));
      b.banner();
      b.pill('À venir', 40, 190, { size: 16, h: 34, fill: C.purple });
      b.text(title + (pi ? ' (suite)' : ''), 190, 186, 970, 42, { size: 30, min: 22, bold: true, color: C.navy, maxLines: 1, field: 'titre', noScale: true });
      if (sub) b.text(sub, 190, 226, 970, 26, { size: 19, min: 14, bold: true, color: C.purple, maxLines: 1, field: 'sous-titre', noScale: true });
      var y = y0;
      if (!idx.length) {
        b.text('Aucune activité future ne correspond. Ajoutez des fiches datées dans la bibliothèque ou saisissez des lignes manuellement.', 90, 330, 1020, 140, { size: 22, color: C.muted, align: 'center', valign: 'middle', role: 'label' });
        b.warn('Programme vide.', 'warn');
      } else {
        var total = idx.reduce(function (a, i) { return a + natural[i] + gap; }, head);
        var bonus = Math.min(table ? 14 : 20, Math.max(0, (avail - total) / idx.length));
        if (table) {
          b.rect(40, y, 1120, 36, { fill: C.navy, r: 8 });
          var cx = 40;
          cols.forEach(function (c) { b.text(c.l, cx + 12, y, c.w - 20, 36, { size: 15, bold: true, color: C.white, valign: 'middle', upper: true, maxLines: 1, role: 'label', noScale: true }); cx += c.w; });
          y += 40;
          idx.forEach(function (i, z) {
            var cells = cellsOf(rows[i]), rh = natural[i] + bonus;
            b.rect(40, y, 1120, rh, { fill: z % 2 ? C.white : C.light, stroke: C.border });
            var cx2 = 40;
            cols.forEach(function (c) { b.text(cells[c.k], cx2 + 12, y + 4, c.w - 24, rh - 8, { size: FS, min: 13, bold: c.k === 'title' || c.k === 'date', color: c.k === 'date' ? C.purple : C.ink, valign: 'middle', maxLines: 2, field: c.l, noScale: true }); cx2 += c.w; });
            y += rh;
          });
        } else {
          idx.forEach(function (i) {
            var r2 = rows[i], hh = natural[i] + bonus;
            b.rect(40, y, 1120, hh, { fill: C.lighter, stroke: C.border, r: 9 });
            b.rect(40, y, 190, hh, { fill: C.lilac, r: 9 });
            b.text(d.fmtRangeShort(r2.date, r2.dateEnd) || 'À préciser', 48, y, 174, hh, { size: 16, min: 13, bold: true, color: C.purple, align: 'center', valign: 'middle', maxLines: 2, role: 'label', noScale: true, field: 'date' });
            var x2 = 246;
            if (showCat && r2.type) {
              var tw2 = Math.min(220, Mx().width(String(r2.type).toLocaleUpperCase('fr'), 12.5, true) * 1.06 + 20);
              b.pill(String(r2.type).toLocaleUpperCase('fr'), x2, y + hh / 2 - 12, { size: 12.5, h: 24, w: tw2, fill: catColor(r2.type) });
              x2 += tw2 + 12;
            }
            var detail = [r2.location, r2.status].filter(hasText).join(' · ');
            var dw = detail ? Math.min(330, Mx().width(detail, 15, false) * 1.06 + 10) : 0;
            b.text(r2.title, x2, y + 3, 1150 - x2 - dw - 16, hh - 6, { size: FS, min: 14, bold: true, color: C.navy, valign: 'middle', maxLines: 2, field: 'activité', noScale: true });
            if (detail) b.text(detail, 1150 - dw, y, dw, hh, { size: 15, min: 12.5, color: C.muted, align: 'right', valign: 'middle', maxLines: 2, role: 'label', noScale: true, field: 'lieu' });
            y += hh + gap;
          });
        }
      }
      if (note) b.text(note, 40, 596, 900, 20, { size: 12.5, min: 11, color: C.muted, maxLines: 1, role: 'label', noScale: true, field: 'mention' });
      b.footer({ link: CO().validUrl(ctx.settings.portalUrl) ? ctx.settings.portalUrl : M().PORTAL, ctaLabel: 'Portail CSE', note: ctx.settings.footerNote });
      slides.push(b.result({ part: pi + 1 }));
    });
    if (slides.length > 1) slides[0].warnings.push({ level: 'info', msg: 'Programme réparti automatiquement sur ' + slides.length + ' diapositives (' + rows.length + ' lignes).' });
    return slides;
  }
  /* ================= MOTEUR ================= */

  function recommend(item, project) {
    if (!item) return 'classic';
    var t = item.type;
    if (t === 'info') return 'info';
    if (t === 'partner') return 'partner';
    if (t === 'calendar') return 'calendar';
    if (t === 'rules') return 'rules';
    var photos = (item.photos || []).length;
    var textLen = ['summary', 'description', 'highlights', 'transport', 'lodging', 'conditions', 'notes', 'regInfo'].reduce(function (n, k) { return n + String(item[k] || '').length; }, 0);
    var cat = project ? CSE.model.categoryName(project, item) : '';
    if (t === 'page') return photos && textLen < 400 ? 'immersive' : 'info';
    if (/anim|musique|concert|spectacle|f[eê]te/i.test(cat + ' ' + item.title) && (item.highlights || item.program)) return 'animation';
    var heavy = textLen > 420 || String(item.program || '').length > 160 || (item.pricing && item.pricing.enabled && item.pricing.mode === 'tranches' || item.pricing && item.pricing.mode === 'manual');
    if (!heavy && photos && textLen <= 320 && !item.program) return 'immersive';
    if (!textLen && !item.program && !item.highlights) return 'poster';
    return 'classic';
  }
  function templateIdFor(page, item, project) {
    if (page.kind === 'cover') return 'cover';
    if (page.kind === 'news') return 'news';
    if (page.kind === 'last') return 'last';
    if (page.kind === 'upcoming') return page.opts && page.opts.style === 'table' ? 'upcoming-table' : 'upcoming-list';
    if (!item) return 'classic';
    var allowed = ITEM_TEMPLATES[item.type] || ['classic'];
    var want = page.template && page.template !== 'auto' ? page.template : item.template && item.template !== 'auto' ? item.template : recommend(item, project);
    return allowed.indexOf(want) >= 0 ? want : allowed[0];
  }
  var RENDER = { classic: classic, immersive: immersive, poster: poster, animation: animation, info: info, partner: partner, calendar: calendar, rules: rules,
    cover: cover, news: function (c) { return mosaic(c, false); }, last: function (c) { return mosaic(c, true); },
    'upcoming-list': function (c) { return upcoming(c, false); }, 'upcoming-table': function (c) { return upcoming(c, true); } };

  /** Rend une page du MEL : renvoie une liste de diapositives. */
  function renderPage(page, project, issue, opts) {
    opts = opts || {};
    var sourceItem = page.kind === 'item' ? CO().findItem(project, page.itemId) : null;
    // Personnalisation propre à ce MEL (tous les champs) : la fiche source n'est jamais modifiée.
    var item = sourceItem ? (CO().effectiveItem ? CO().effectiveItem(page, sourceItem) : sourceItem) : null;
    if (item && opts.skipImages && opts.skipImages.length) {
      // Export explicitement demandé « sans les photos non intégrables » : la composition se recalcule sans elles.
      item = Object.assign({}, item, { photos: (item.photos || []).filter(function (s) { return opts.skipImages.indexOf(s) < 0; }) });
    }
    var settings = project.settings;
    var ref = issue.refDate;
    var tid = templateIdFor(page, item, project);
    var density = page.density && page.density !== 'auto' ? page.density : item && item.density !== 'auto' ? item.density : settings.defaultDensity || 'auto';
    var base = { project: project, issue: issue, page: page, item: item, ref: ref, settings: settings, templateId: tid,
      cat: item ? CSE.model.categoryOf(project, item) : null,
      cls: item ? CO().classify(item, ref, settings, issue) : null,
      prices: item ? CSE.pricing.fromPricing(item.pricing, settings) : { kind: 'none', rows: [], issues: [] },
      pageNumber: opts.pageNumber || 0, skipImages: opts.skipImages || null };
    if (page.kind === 'item' && !item) {
      var b = new (L().Builder)(base);
      b.banner();
      b.text('Fiche introuvable (supprimée de la bibliothèque).', 80, 300, 1040, 80, { size: 26, color: L().C.red, align: 'center', valign: 'middle' });
      b.warn('Cette page référence une fiche supprimée : retirer la page ou restaurer la fiche depuis la corbeille.', 'block');
      b.footer({});
      return [b.result({ templateId: 'missing' })];
    }
    function run(dens) { return RENDER[tid](Object.assign({}, base, { density: dens === 'auto' ? 'normal' : dens })); }
    var slides = run(density);
    if (density === 'auto' && slides.some(function (s) { return s.overflow; })) {
      var compact = run('compact');
      var ov = function (list) { return list.filter(function (s) { return s.overflow; }).length; };
      if (ov(compact) < ov(slides) || !ov(compact)) {
        slides = compact;
        slides[0].warnings.unshift({ level: 'info', msg: 'Mise en page compacte appliquée automatiquement pour que le texte tienne.' });
      }
    } else if (density === 'auto' && item && slides.length > 1 && ['classic', 'immersive', 'info'].indexOf(tid) >= 0 && splitMode(base) === 'auto') {
      // Suite nécessaire à 12 pt : indiquer si la densité compacte (corps 11 pt, choix explicite) tient sur une seule diapositive.
      var c1 = run('compact');
      if (c1.length < slides.length && !c1.some(function (s) { return s.overflow; }))
        slides[0].warnings.push({ level: 'info', code: 'compact-fits', msg: 'Une seule diapositive est possible en densité « Compacte » (corps 11 pt minimum, photos réduites).' });
    }
    // Pagination interne : numéros successifs ; contrôles géométriques de chaque diapositive.
    slides.forEach(function (s, i) {
      s.templateId = tid; s.pageId = page.id; s.part = slides.length > 1 ? i + 1 : 0; s.parts = slides.length;
      if (opts.pageNumber) s.pageNumber = opts.pageNumber + i;
      L().auditSlide(s).forEach(function (w) { if (!s.warnings.some(function (x) { return x.msg === w.msg; })) s.warnings.push(w); });
      if (s.minBody && s.minBody < (density === 'compact' ? L().MIN.compactBody : L().MIN.body) - 0.01)
        s.warnings.push({ level: 'warn', code: 'min-font', msg: 'Corps de texte sous le seuil de lisibilité (' + Math.round(s.minBody * 0.8 * 10) / 10 + ' pt).' });
      if (item && i === 0) {
        (base.prices.issues || []).forEach(function (x) { s.warnings.push({ level: x[0], msg: 'Tarifs : ' + x[1] }); });
        if (base.cls.expired) s.warnings.push({ level: 'warn', msg: 'Fiche expirée à la date du MEL.' });
      }
    });
    if (item && tid === 'classic' && splitMode(base) === 'off' && slides[0].overflow) {
      slides[0].warnings.push({ level: 'warn', code: 'suggest-split', msg: 'Conseil : choisir « Texte long : automatique » pour publier tout le texte lisiblement.' });
    }
    return slides;
  }
  /** Rend tout le MEL (pages incluses), avec numérotation facultative.
   *  Un MEL publié (figé) est rendu à partir de son instantané : une modification ultérieure
   *  des fiches de la bibliothèque ne change pas rétroactivement ce qui a été diffusé. */
  function renderIssue(project, issue, opts) {
    opts = opts || {};
    var view = CO().issueView ? CO().issueView(project, issue) : { project: project, issue: issue };
    var proj = view.project, is = view.issue;
    var pages = CO().enforceOrder(is.pages, proj, is);
    var out = [], n = 1;
    pages.forEach(function (p) {
      if (!p.included && !opts.all) { out.push({ page: p, slides: [], excluded: true }); return; }
      var slides = renderPage(p, proj, is, { pageNumber: is.numbering && p.included ? n : 0, skipImages: opts.skipImages });
      if (p.included) n += slides.length;
      out.push({ page: p, slides: slides, excluded: !p.included });
    });
    return out;
  }
  /** Aperçu d'une fiche hors MEL (éditeur) : page virtuelle à la date du jour ou à une date donnée. */
  function renderItem(item, project, opts) {
    opts = opts || {};
    var ref = opts.refDate || CSE.dates.todayParis();
    var wk = CSE.dates.isoWeek(ref);
    var issue = { refDate: ref, week: wk.week, year: wk.year, pages: [] };
    var page = CSE.model.blankPage('item', { itemId: item.id, template: opts.template || 'auto', density: opts.density || 'auto', split: !!opts.split });
    var proj = Object.assign({}, project, { items: project.items.some(function (x) { return x.id === item.id; }) ? project.items.map(function (x) { return x.id === item.id ? item : x; }) : project.items.concat([item]) });
    return renderPage(page, proj, issue, {});
  }
  function readability(slides) {
    var min = Infinity;
    slides.forEach(function (s) { if (s.minBody && s.minBody < min) min = s.minBody; });
    var over = slides.some(function (s) { return s.overflow; });
    if (over) return { level: 'bad', label: 'Texte tronqué', min: min };
    if (min === Infinity) return { level: 'good', label: 'Très lisible', min: null };
    if (min >= 17) return { level: 'good', label: 'Très lisible', min: min };
    if (min >= 14.5) return { level: 'ok', label: 'Lisible', min: min };
    return { level: 'dense', label: 'Dense', min: min };
  }

  return { TEMPLATES: TEMPLATES, ITEM_TEMPLATES: ITEM_TEMPLATES, recommend: recommend, templateIdFor: templateIdFor, renderPage: renderPage, renderIssue: renderIssue,
    renderItem: renderItem, readability: readability, flow: flow, dateLine: dateLine, contactText: contactText, practicalRows: practicalRows, bodyParas: bodyParas, sizeRange: sizeRange };
});
