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

  var TEMPLATES = [
    { id: 'cover', name: 'Couverture du MEL', family: 'Numéro', for: ['cover'], desc: 'Semaine, message important, dernières chances et nouveautés, alimentés automatiquement.' },
    { id: 'calendar', name: 'Calendrier de permanences', family: 'Pages fixes', for: ['calendar'], desc: 'Calendrier mensuel coloré, légende, horaires, contacts et catalogue.' },
    { id: 'info', name: 'Information', family: 'Informations', for: ['info', 'page', 'activity'], desc: 'Message administratif hiérarchisé, pictogramme et encadré d’alerte.' },
    { id: 'classic', name: 'Activité classique', family: 'Activités', for: ['activity', 'info', 'page'], desc: 'Photos, description, programme, infos pratiques ; tarifs et points facultatifs.' },
    { id: 'immersive', name: 'Immersif', family: 'Activités', for: ['activity', 'partner', 'page'], desc: 'Grande photo, message court et informations synthétiques.' },
    { id: 'poster', name: 'Essentiel / affiche', family: 'Activités', for: ['activity', 'info', 'partner', 'page'], desc: 'Titre, date, lieu, visuel et appel à l’action très visibles.' },
    { id: 'animation', name: 'Animation', family: 'Activités', for: ['activity'], desc: 'Affiche attractive, temps forts, programme horaire et infos pratiques.' },
    { id: 'news', name: 'Nouveautés (mosaïque)', family: 'Numéro', for: ['news'], desc: 'Mosaïque visuelle de 1 à 6 activités avec badges NEW et dates.' },
    { id: 'last', name: 'Dernières chances', family: 'Numéro', for: ['last'], desc: 'Présentation flash orange/rouge, date limite et compteur J−x.' },
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
    if (hasText(it.subtitle)) line = line ? line + ' — ' + it.subtitle.trim() : it.subtitle.trim();
    return line;
  }
  function contactRuns(it) {
    var runs = [];
    (it.contacts || []).forEach(function (c, i) {
      if (i) runs.push({ text: ' · ', bold: false });
      runs.push({ text: c.name || c.email || c.phone, bold: true });
      var extra = [c.name ? c.email : '', c.phone].filter(hasText).join(', ');
      if (extra) runs.push({ text: ' (' + extra + ')', bold: false });
    });
    return runs;
  }
  function contactText(it) { return contactRuns(it).map(function (r) { return r.text; }).join(''); }
  function counterLabel(c) { return { long: 'Séjour long', short: 'Séjour court', france: 'Séjour FRANCE' }[c] || ''; }
  function ageText(v) { v = String(v || '').trim(); return /^\d+$/.test(v) ? 'Dès ' + v + ' ans' : v; }

  /** Informations latérales : seuls les champs saisis produisent un bloc. */
  function asideChips(ctx, opts) {
    opts = opts || {};
    var it = ctx.item, cls = ctx.cls, pr = ctx.prices, C = L().C, d = D(), chips = [];
    if (it.regEnd && it.type !== 'partner') {
      chips.push({ label: 'Inscriptions jusqu’au', value: d.capital(d.fmtDay(it.regEnd)), color: C.red, accent: C.red, fill: '#FFF6F6', stroke: '#F4C7CC',
        badge: cls.isLast && cls.daysLeft !== null && cls.daysLeft >= 0 ? d.countdown(it.regEnd, ctx.ref) : '' });
    } else if (cls.regLabel && it.regStatus !== 'auto') chips.push({ label: 'Inscriptions', value: cls.regLabel });
    if (it.regEnd && it.regStatus !== 'auto' && it.regStatus !== 'open' && cls.regLabel) chips.push({ label: 'Statut', value: cls.regLabel, color: C.orange });
    if (!opts.noPrice && pr.kind === 'single') chips.push({ label: pr.rows[0].label, value: P().money(pr.rows[0].price), sub: pr.outside !== null ? 'Extérieur : ' + P().money(pr.outside) : '', color: C.purple, accent: C.purple });
    if (it.minPart || it.maxPart) chips.push({ label: 'Participants', value: [it.minPart ? 'Min. ' + it.minPart : '', it.maxPart ? 'Max. ' + it.maxPart : ''].filter(Boolean).join(' · ') });
    if (it.points && it.points.value) chips.push({ label: 'Points', value: it.points.value + ' point' + (parseFloat(String(it.points.value).replace(',', '.')) > 1 ? 's' : '') + (it.points.counter ? ' · ' + counterLabel(it.points.counter) : ''), color: C.purple });
    if (hasText(it.audience) || hasText(it.minAge)) chips.push({ label: 'Public', value: [it.audience, ageText(it.minAge)].filter(hasText).join(' · ') });
    if (hasText(it.address)) chips.push({ label: 'Adresse', value: it.address, maxLines: 3 });
    if (hasText(it.carbon)) chips.push({ label: 'Bilan carbone', value: it.carbon, color: C.green });
    return chips;
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
      var p = q.shift(), box = boxes[bi], cap = Math.floor((box.h + 0.5) / (size * lh));
      var empty = M.isEmpty(p);
      if (empty && used === 0) continue;
      var n = empty ? 1 : M.wrapPara(p, box.w, size).length;
      if (p.heading && used + n >= cap && q.length) { bi++; used = 0; q.unshift(p); continue; }
      if (used + n <= cap) { chunks[bi].push(p); used += n; continue; }
      var room = cap - used;
      if (!empty && room >= 2 && n - room >= 1) {
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
  function itemHeader(b, ctx, o) {
    o = o || {};
    var it = ctx.item, C = L().C, cat = ctx.cat, cls = ctx.cls;
    b.banner();
    var badges = [];
    if (cls.isLast && !o.noLastBadge) badges.push('last');
    if (cls.isNew) badges.push('new');
    badges.forEach(function (k, i) { b.badge(k, 1078 - i * 104, 150, 96); });
    var reserve = badges.length ? badges.length * 104 + 10 : 0;
    var x = 40, y = 186;
    var label = o.tag || (cat ? cat.name : '');
    if (label) b.tag(label, x, y, o.tagColor || (cat ? cat.color : C.blue), { size: 13 });
    y = 218;
    var title = it.title || 'Titre à renseigner';
    var tr = b.text(title + (ctx.part === 2 ? ' (suite)' : ''), x, y, 1120 - reserve, 92, { size: o.titleSize || 34, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.12 });
    y += tr.height + 4;
    var dl = o.dateLine !== undefined ? o.dateLine : dateLine(it);
    if (dl) { var dr = b.text(dl, x, y, 1120 - reserve, 52, { size: 20, min: 14, bold: true, color: C.purple, maxLines: 2, field: 'date', noScale: true }); y += dr.height; }
    return y + 12;
  }
  function itemFooter(b, ctx, o) {
    o = o || {};
    var it = ctx.item, s = ctx.settings;
    b.footer({ contact: o.noContact ? '' : contactText(it), contactRuns: contactRuns(it), link: CO().linkOf(it, s), ctaLabel: it.link && it.link.label, note: s.footerNote });
  }
  /** Colonne de photos (1, 2 ou 3+ photos) ou rien. */
  function photoStack(b, photos, x, y, w, h, color) {
    photos = (photos || []).filter(Boolean);
    if (!photos.length) return;
    if (photos.length === 1 || h < 200) { b.photo(photos[0], x, y, w, h); }
    else if (photos.length === 2) { var h1 = (h - 10) * 0.55; b.photo(photos[0], x, y, w, h1); b.photo(photos[1], x, y + h1 + 10, w, h - h1 - 10); }
    else { var hb = (h - 10) * 0.6, hs = h - hb - 10, ws = (w - 10) / 2; b.photo(photos[0], x, y, w, hb); b.photo(photos[1], x, y + hb + 10, ws, hs); b.photo(photos[2], x + ws + 10, y + hb + 10, ws, hs); }
    b.rect(x, y + h - 4, w, 4, { fill: color || L().C.blue });
  }

  /* ================= MODÈLES DE FICHE ================= */

  /** Activité classique : photos | texte (+ tarifs) | informations. */
  function classic(ctx) {
    if (ctx.page && ctx.page.split) return classicSplit(ctx);
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue;
    var top = itemHeader(b, ctx), bottom = 590;
    var chips = asideChips(ctx), pr = ctx.prices;
    var paras = bodyParas(ctx);
    var photos = it.photos || [];
    var asideW = chips.length ? 236 : 0, gap = 22;
    // La colonne photo s'élargit lorsque le texte est court.
    var textDemand = natural(paras, 560, 17);
    var deco = !photos.length && textDemand < 230 && !b.priceGridSize(pr, 600).h;
    var photoW = photos.length ? (textDemand < 140 ? 400 : textDemand < 260 ? 340 : 300) : deco ? 300 : 0;
    var x0 = 40, right = 1160 - (asideW ? asideW + gap : 0);
    var mainX = x0 + (photoW ? photoW + gap : 0), mainW = right - mainX;
    var g = b.priceGridSize(pr, right - x0);
    var gridY = bottom - g.h;
    var bodyBottom = g.h ? gridY - 14 : bottom;
    if (photoW && photos.length) photoStack(b, photos, x0, top, photoW, bodyBottom - top, color);
    else if (photoW) { b.photo('', x0, top, photoW, bodyBottom - top, { color: color, label: cat ? cat.name : '' }); b.rect(x0, bodyBottom - 4, photoW, 4, { fill: color }); }
    if (asideW) b.chips(chips, right + gap, top, asideW, bottom - top, { stretch: false });
    if (g.h) b.priceGrid(pr, x0, gridY, right - x0);
    var boxes;
    if (mainW > 720 && paras.length > 3 && natural(paras, mainW, 18) > bodyBottom - top - 10) {
      var cw = (mainW - 30) / 2;
      boxes = [{ x: mainX, y: top, w: cw, h: bodyBottom - top }, { x: mainX + cw + 30, y: top, w: cw, h: bodyBottom - top }];
    } else boxes = [{ x: mainX, y: top, w: mainW, h: bodyBottom - top }];
    var plainLen = Mx().plain(paras).length;
    if (paras.length) placeFlow(b, paras, boxes, { size: plainLen < 260 ? 24 : plainLen < 520 ? 21 : photoW || asideW ? 19 : 20, field: 'description' });
    else if (!photos.length && !chips.length && !g.h) b.text('Renseigner une description, un programme ou des informations pratiques.', mainX, top, mainW, 60, { size: 18, color: C.muted, field: 'description', important: false });
    itemFooter(b, ctx);
    return [b.result()];
  }
  /** Fiche scindée : page 1 = essentiel + tarifs ; page 2 = suite du texte sur deux colonnes. */
  function classicSplit(ctx) {
    var C = L().C, it = ctx.item, cat = ctx.cat, color = cat ? cat.color : C.blue;
    var paras = bodyParas(ctx);
    // Page 1
    var b1 = new (L().Builder)(Object.assign({}, ctx, { part: 1 }));
    var top = itemHeader(b1, Object.assign({}, ctx, { part: 1 })), bottom = 590;
    var chips = asideChips(ctx), pr = ctx.prices, photos = it.photos || [];
    var asideW = chips.length ? 236 : 0, gap = 22, photoW = photos.length ? 340 : 0;
    var right = 1160 - (asideW ? asideW + gap : 0), mainX = 40 + (photoW ? photoW + gap : 0), mainW = right - mainX;
    var g = b1.priceGridSize(pr, right - 40), bodyBottom = g.h ? bottom - g.h - 14 : bottom;
    if (photoW) photoStack(b1, photos, 40, top, photoW, bodyBottom - top, color);
    if (asideW) b1.chips(chips, right + gap, top, asideW, bottom - top);
    if (g.h) b1.priceGrid(pr, 40, bottom - g.h, right - 40);
    var size = 18 * b1.scale;
    var f = flow(paras, [{ w: mainW, h: bodyBottom - top - 30 }], size);
    b1.text(f.chunks[0], mainX, top, mainW, bodyBottom - top - 30, { size: size, min: size, noScale: true, field: 'description' });
    b1.text('Suite page suivante →', mainX, bodyBottom - 26, mainW, 24, { size: 14, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
    itemFooter(b1, ctx);
    // Page 2
    var ctx2 = nth(ctx, 1, { part: 2 });
    var b2 = new (L().Builder)(ctx2);
    var top2 = itemHeader(b2, ctx2, { dateLine: '' });
    var cw = (1120 - 30) / 2;
    placeFlow(b2, f.rest.length ? f.rest : [rich('Toutes les informations figurent sur la page précédente.')[0]], [{ x: 40, y: top2, w: cw, h: 590 - top2 }, { x: 40 + cw + 30, y: top2, w: cw, h: 590 - top2 }], { size: 18, field: 'suite de la description' });
    itemFooter(b2, ctx2);
    return [b1.result(), b2.result()];
  }

  /** Immersif : grande photo à gauche, message court et infos synthétiques. */
  function immersive(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue, cls = ctx.cls, d = D();
    b.banner();
    var photo = (it.photos || [])[0];
    var pw = 560, y0 = L().BANNER_H + 2.5, h = 645 - y0;
    b.photo(photo, 0, y0, pw, h, { color: color, label: cat ? cat.name : it.title });
    if (cls.isNew) b.badge('new', 18, y0 + 14, 92);
    if (cls.isLast) b.badge('last', cls.isNew ? 118 : 18, y0 + 14, 96);
    b.rect(pw, y0, 8, h, { fill: color });
    var x = pw + 40, w = 1160 - x, y = y0 + 16;
    if (cat) { b.tag(cat.name, x, y, color, { size: 13 }); y += 36; }
    var tr = b.text(it.title || 'Titre à renseigner', x, y, w, 110, { size: 38, min: L().MIN.title, bold: true, color: C.navy, maxLines: 3, field: 'titre', noScale: true, lh: 1.1 });
    y += tr.height + 6;
    var dl = dateLine(it);
    if (dl) { var dr = b.text(dl, x, y, w, 56, { size: 21, min: 15, bold: true, color: C.purple, maxLines: 2, field: 'date', noScale: true }); y += dr.height + 10; }
    var chips = asideChips(ctx, { noPrice: false });
    var priceLine = ctx.prices.kind === 'grid' ? b.priceLine(ctx.prices) : '';
    var chipH = chips.length ? Math.min(2, Math.ceil(chips.length / 2)) * 72 + 8 : 0;
    var plH = priceLine ? 34 : 0;
    var textBottom = 590 - chipH - plH - 6;
    var paras = joinParas([hasText(it.summary) ? rich(it.summary, { bold: true }) : [], hasText(it.description) ? rich(it.description) : [], hasText(it.highlights) ? programParas(it.highlights).map(function (p) { p.bullet = true; return p; }) : []]);
    if (paras.length) b.text(paras, x, y, w, textBottom - y, { size: 20, field: 'description' });
    var cy = textBottom + 8;
    if (priceLine) { b.text(priceLine, x, cy, w, 28, { size: 16, min: 12, bold: true, color: C.purple, maxLines: 1, field: 'tarifs', noScale: true }); cy += plH; }
    if (chips.length) {
      var shown = chips.slice(0, 4), cw = (w - 12) / 2;
      shown.forEach(function (c, i) {
        var cx = x + (i % 2) * (cw + 12), yy = cy + Math.floor(i / 2) * 72;
        b.chips([c], cx, yy, cw, 64, {});
      });
      if (chips.length > 4) b.warn('Immersif : ' + (chips.length - 4) + ' information(s) secondaire(s) masquée(s) ; utiliser le modèle classique pour tout afficher.', 'info');
    }
    b.footer({ contact: '', link: CO().linkOf(it, ctx.settings), ctaLabel: it.link && it.link.label, note: ctx.settings.footerNote });
    var ct = contactText(it);
    if (ct) b.text([{ runs: [{ text: 'Contact : ', bold: true }].concat(contactRuns(it)) }], x, 604, 1160 - x - 280, 34, { size: 14, min: 11, color: C.purple, valign: 'middle', maxLines: 2, role: 'label', noScale: true, field: 'contacts', important: false });
    return [b.result()];
  }

  /** Essentiel / affiche : titre, date, lieu, visuel, appel à l'action. */
  function poster(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cat = ctx.cat, color = cat ? cat.color : C.blue, cls = ctx.cls, d = D();
    b.banner();
    if (cls.isNew) b.badge('new', 1078, 150, 96);
    if (cls.isLast) b.badge('last', cls.isNew ? 974 : 1078, 150, 96);
    var y = 186;
    if (cat) { var tw = Mx().width(cat.name.toLocaleUpperCase('fr'), 13, true) * 1.06 + 24; b.tag(cat.name, 600 - tw / 2, y, color, { size: 13 }); }
    y = 216;
    var tr = b.text(String(it.title || 'Titre à renseigner').toLocaleUpperCase('fr'), 120, y, 960, 104, { size: 44, min: 26, bold: true, color: C.navy, align: 'center', maxLines: 2, field: 'titre', noScale: true, lh: 1.08 });
    y += tr.height + 6;
    var dr = d.fmtRange(it.dateStart, it.dateEnd, { day: true });
    var times = [it.timeStart, it.timeEnd].filter(hasText).map(d.fmtTime);
    var dline = [dr, times.length === 2 ? times[0] + ' – ' + times[1] : times[0] ? 'à ' + times[0] : ''].filter(Boolean).join(' · ') || it.subtitle;
    if (dline) { var r1 = b.text(dline, 60, y, 1080, 40, { size: 28, min: 18, bold: true, color: C.purple, align: 'center', maxLines: 1, field: 'date', noScale: true }); y += r1.height + 2; }
    if (hasText(it.location)) { var r2 = b.text(it.location + (hasText(it.address) ? ' — ' + it.address : ''), 60, y, 1080, 30, { size: 19, min: 14, bold: true, color: C.muted, align: 'center', maxLines: 1, field: 'lieu', noScale: true }); y += r2.height + 4; }
    y += 6;
    // Pastilles : date limite, tarif, places.
    var pills = [];
    if (it.regEnd) pills.push({ t: 'Inscriptions jusqu’au ' + d.fmtShort(it.regEnd, true) + (cls.isLast ? ' · ' + d.countdown(it.regEnd, ctx.ref) : ''), fill: C.red });
    if (ctx.prices.rows.length) pills.push({ t: ctx.prices.kind === 'single' ? ctx.prices.rows[0].label + ' : ' + P().money(ctx.prices.rows[0].price) : 'Dès ' + P().money(ctx.prices.rows[0].price) + ' (T1)', fill: C.purple });
    if (it.maxPart) pills.push({ t: it.maxPart + ' places', fill: C.blue });
    if (ageText(it.minAge)) pills.push({ t: ageText(it.minAge), fill: C.orange });
    var pillsH = pills.length ? 40 : 0;
    var summaryH = hasText(it.summary) ? 56 : 0;
    var visualH = 590 - y - pillsH - summaryH - (pillsH ? 12 : 0) - (summaryH ? 8 : 0);
    var photo = (it.photos || [])[0];
    if (visualH >= 90) {
      if (photo) b.photo(photo, 40, y, 1120, visualH);
      else if (!summaryH && hasText(it.description)) { b.rect(40, y, 1120, visualH, { fill: L().tint(color, 0.14), r: 14 }); b.text(it.description, 80, y + 14, 1040, visualH - 28, { size: 22, color: C.dark, align: 'center', valign: 'middle', field: 'description' }); }
      else b.photo('', 40, y, 1120, visualH, { color: color, label: cat ? cat.name : '' });
      y += visualH + 8;
    }
    if (summaryH) { b.text(it.summary, 60, y, 1080, 50, { size: 19, min: 14, bold: true, color: C.dark, align: 'center', maxLines: 2, field: 'résumé', noScale: true }); y += summaryH; }
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
    var top = itemHeader(b, ctx, { titleSize: 38 }), bottom = 590;
    var photos = it.photos || [];
    var hasHl = hasText(it.highlights), hasPg = hasText(it.program);
    var chips = asideChips(ctx);
    var pr = ctx.prices, pl = pr.kind === 'grid' ? b.priceLine(pr) : '';
    var photoW = photos.length ? 330 : 0, x = 40 + (photoW ? photoW + 22 : 0), w = 1160 - x;
    var chipRowH = chips.length ? 74 : 0;
    var plH = pl ? 30 : 0;
    var bodyBottom = bottom - chipRowH - plH - (chipRowH || plH ? 8 : 0);
    if (photoW) photoStack(b, photos, 40, top, photoW, bottom - top, color);
    var y = top;
    var lead = joinParas([hasText(it.summary) ? rich(it.summary, { bold: true }) : [], hasText(it.description) ? rich(it.description) : []]);
    var boxesH = (hasHl || hasPg) ? Math.max(150, (bodyBottom - y) * (lead.length ? 0.62 : 1)) : 0;
    if (lead.length) {
      var leadH = bodyBottom - y - boxesH - (boxesH ? 12 : 0);
      var lr = b.text(lead, x, y, w, leadH, { size: 20, field: 'description' });
      y += (boxesH ? Math.min(leadH, lr.height) + 12 : leadH);
      boxesH = bodyBottom - y;
    }
    if (hasHl || hasPg) {
      var both = hasHl && hasPg, bw = both ? (w - 16) / 2 : w;
      if (hasHl) {
        b.rect(x, y, bw, boxesH, { fill: L().tint(color, 0.1), stroke: L().tint(color, 0.35), r: 12 });
        b.text('Temps forts', x + 16, y + 10, bw - 32, 26, { size: 18, bold: true, color: L().shade(color, 0.1), maxLines: 1, role: 'label', noScale: true, upper: true });
        b.text(programParas(it.highlights).map(function (p) { p.bullet = true; return p; }), x + 16, y + 42, bw - 32, boxesH - 52, { size: 22, field: 'temps forts', color: C.dark });
      }
      if (hasPg) {
        var px = hasHl ? x + bw + 16 : x;
        b.rect(px, y, bw, boxesH, { fill: C.lighter, stroke: C.border, r: 12 });
        b.text('Programme', px + 16, y + 10, bw - 32, 26, { size: 18, bold: true, color: C.navy, maxLines: 1, role: 'label', noScale: true, upper: true });
        b.text(programParas(it.program), px + 16, y + 42, bw - 32, boxesH - 52, { size: 21, field: 'programme', color: C.dark });
      }
    }
    var cy = bodyBottom + 8;
    if (pl) { b.text(pl, x, cy, w, 26, { size: 16, min: 12, bold: true, color: C.purple, maxLines: 1, noScale: true, field: 'tarifs' }); cy += plH; }
    if (chips.length) {
      var n = Math.min(chips.length, w > 700 ? 4 : 3), cw = (w - (n - 1) * 10) / n;
      chips.slice(0, n).forEach(function (c, i) { b.chips([c], x + i * (cw + 10), cy, cw, 66, {}); });
      if (chips.length > n) b.warn('Animation : ' + (chips.length - n) + ' information(s) secondaire(s) non affichée(s).', 'info');
    }
    itemFooter(b, ctx);
    return [b.result()];
  }

  /** Information : pictogramme, message hiérarchisé, encadré d'alerte. */
  function info(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cls = ctx.cls;
    b.banner();
    if (cls.isNew) b.badge('new', 1078, 150, 96);
    var reserve = cls.isNew ? 110 : 0;
    b.icon('info', 40, 194, 58, C.blue);
    var x = 116, y = 190;
    b.text((ctx.cat && ctx.cat.name !== 'Informations' ? ctx.cat.name : 'Information CSE'), x, y, 600, 20, { size: 13, bold: true, color: C.blue, upper: true, maxLines: 1, role: 'label', noScale: true });
    y += 22;
    var tr = b.text(it.title || 'Titre de l’information', x, y, 1160 - x - reserve, 84, { size: 32, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.12 });
    y += tr.height + 2;
    var dl = [it.subtitle, it.dateStart && !it.dateEnd ? D().fmtLong(it.dateStart) : ''].filter(hasText).join(' · ');
    if (dl) { var sr = b.text(dl, x, y, 1160 - x - reserve, 30, { size: 19, min: 14, bold: true, color: C.purple, maxLines: 1, field: 'sous-titre', noScale: true }); y += sr.height; }
    y = Math.max(y + 14, 268);
    var photo = (it.photos || [])[0];
    var alert = hasText(it.notes);
    var bottom = 592;
    var alertH = 0;
    var textX = 40, textW = 1120;
    if (photo) { var pw = 340; b.photo(photo, 1160 - pw, y, pw, bottom - y); b.rect(1160 - pw, bottom - 4, pw, 4, { fill: C.blue }); textW = 1120 - pw - 24; }
    if (alert) {
      var ap = rich(it.notes, { bold: true });
      var ah = Math.min(130, Math.max(58, b.measure(ap, textW - 90, 18) + 26));
      alertH = ah;
      b.rect(textX, bottom - ah, textW, ah, { fill: '#FFF1F0', stroke: '#F3C1BE', r: 12 });
      b.icon('alert', textX + 16, bottom - ah / 2 - 18, 36, C.red);
      b.text(ap, textX + 66, bottom - ah + 12, textW - 84, ah - 24, { size: 18, min: 13, bold: true, color: '#A1142A', valign: 'middle', field: 'encadré d’alerte' });
    }
    var bodyBottom = bottom - (alertH ? alertH + 14 : 0);
    var paras = bodyParas(ctx, { notesElsewhere: true });
    b.rect(textX, y, textW, bodyBottom - y, { fill: C.lighter, r: 14 });
    b.rect(textX, y, 6, bodyBottom - y, { fill: C.blue });
    if (paras.length) {
      var boxes = textW > 900 && natural(paras, textW - 50, 20) > bodyBottom - y - 30 ? [{ x: textX + 24, y: y + 16, w: (textW - 74) / 2, h: bodyBottom - y - 30 }, { x: textX + 50 + (textW - 74) / 2, y: y + 16, w: (textW - 74) / 2, h: bodyBottom - y - 30 }] : [{ x: textX + 24, y: y + 16, w: textW - 48, h: bodyBottom - y - 30 }];
      placeFlow(b, paras, boxes, { size: 24, field: 'texte de l’information' });
    }
    itemFooter(b, ctx);
    return [b.result()];
  }

  /** Offre partenaire. */
  function partner(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, cls = ctx.cls, pa = it.partner || {}, d = D();
    b.banner();
    if (cls.isNew) b.badge('new', 1078, 150, 96);
    var photos = it.photos || [];
    var lx = 40, lw = 390, top = 196, bottom = 592;
    // Logo / visuel principal sur fond blanc encadré.
    b.rect(lx, top, lw, photos[1] ? 250 : bottom - top - 50, { fill: C.white, stroke: C.border, r: 14 });
    if (photos[0]) b.image(photos[0], lx + 14, top + 14, lw - 28, (photos[1] ? 250 : bottom - top - 50) - 28, { fit: 'contain' });
    else b.text(it.title || 'Partenaire', lx + 20, top + 20, lw - 40, (photos[1] ? 250 : bottom - top - 50) - 40, { size: 36, min: 16, bold: true, color: C.purple, align: 'center', valign: 'middle', role: 'deco', noScale: true, maxLines: 3 });
    if (photos[1]) b.photo(photos[1], lx, top + 262, lw, bottom - top - 262 - 50);
    b.pill('Offre partenaire', lx, bottom - 38, { size: 14, h: 32, fill: C.purple });
    var x = lx + lw + 30, w = 1160 - x - (cls.isNew ? 70 : 0), y = top - 4;
    var tr = b.text(it.title || 'Nom du partenaire', x, y, w, 80, { size: 36, min: L().MIN.title, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.1 });
    y += tr.height + 2;
    if (hasText(it.subtitle)) { var sr = b.text(it.subtitle, x, y, w, 30, { size: 19, min: 14, bold: true, color: C.muted, maxLines: 1, field: 'sous-titre', noScale: true }); y += sr.height + 4; }
    y += 6;
    var w2 = 1160 - x;
    var hasAmount = hasText(pa.amount);
    if (hasText(pa.offer) || hasAmount) {
      var offerParas = rich(pa.offer || '', { bold: true });
      var ow = w2 - (hasAmount ? 150 : 0) - 36;
      var oh = Math.max(hasAmount ? 128 : 70, Math.min(150, b.measure(offerParas, ow, 26, { bold: true }) + 30));
      b.rect(x, y, w2, oh, { fill: C.lilac, stroke: '#DCCFF8', r: 14 });
      if (hasAmount) {
        b.ellipse(x + 14, y + oh / 2 - 60, 120, 120, { fill: C.red, rot: -8 });
        b.text(pa.amount, x + 20, y + oh / 2 - 60, 108, 120, { size: 34, min: 14, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 2, rot: -8, role: 'deco', noScale: true, field: 'remise' });
      }
      if (offerParas.length) b.text(offerParas, x + (hasAmount ? 150 : 18), y + 12, ow, oh - 24, { size: 28, min: 15, bold: true, color: C.purple, valign: 'middle', field: 'offre', noScale: true });
      y += oh + 12;
    }
    var rowH = 0, rx = x;
    if (hasText(pa.code)) { var cw2 = b.pill('CODE : ' + pa.code, rx, y, { size: 18, h: 40, fill: C.navy }); rx += cw2 + 12; rowH = 40; }
    var until = pa.validUntil || it.regEnd;
    if (until) { b.pill('Jusqu’au ' + d.fmtLong(until) + (cls.daysLeft !== null && cls.daysLeft <= 7 && cls.daysLeft >= 0 ? ' · ' + d.countdown(until, ctx.ref) : ''), rx, y, { size: 17, h: 40, fill: C.red }); rowH = 40; }
    if (rowH) y += rowH + 14;
    var paras = bodyParas(ctx);
    if (paras.length) b.text(paras, x, y, w2, 590 - y, { size: 19, field: 'conditions de l’offre' });
    itemFooter(b, ctx);
    return [b.result()];
  }

  /** Calendrier mensuel de permanences (jours ouvrés). Les cases sont cliquables dans l'aperçu. */
  function calendar(ctx) {
    var b = new (L().Builder)(ctx), it = ctx.item, C = L().C, d = D(), cal = it.calendar || {};
    b.banner();
    var month = cal.month || (ctx.ref || d.todayParis()).slice(0, 7);
    var title = it.title || 'Permanences du mois';
    b.text(title, 300, 186, 860, 44, { size: 32, min: 22, bold: true, color: C.navy, align: 'center', maxLines: 1, field: 'titre', noScale: true });
    if (hasText(it.subtitle)) b.text(it.subtitle, 300, 228, 860, 26, { size: 18, min: 13, bold: true, color: C.purple, align: 'center', maxLines: 1, field: 'sous-titre', noScale: true });
    // Colonne gauche : service, photo, contact, catalogue.
    var lx = 40, lw = 230, ly = 194;
    var service = cal.service || 'Permanences';
    b.rect(lx, ly, lw, 54, { fill: C.blue, r: 27 });
    b.text(service, lx + 14, ly, lw - 28, 54, { size: 22, min: 12, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 2, field: 'service', noScale: true });
    ly += 66;
    var photo = (it.photos || [])[0];
    if (photo) { b.photo(photo, lx, ly, lw, 150); ly += 162; }
    var contactParas = [];
    if ((it.contacts || []).length) {
      contactParas.push({ runs: [{ text: 'Contact :', bold: true, color: C.navy }] });
      it.contacts.forEach(function (c) {
        contactParas.push({ runs: [{ text: c.name || c.email, bold: true, color: C.purple }] });
        if (c.name && c.email) contactParas.push({ runs: [{ text: c.email, color: C.purple, link: 'mailto:' + c.email }] });
        if (c.phone) contactParas.push({ runs: [{ text: c.phone, color: C.muted }] });
      });
    }
    var catH = cal.catalogUrl ? 44 : 0;
    if (contactParas.length) b.text(contactParas, lx, ly, lw, 590 - ly - catH, { size: 17, min: 12, align: 'center', field: 'contacts' });
    if (cal.catalogUrl && CO().validUrl(cal.catalogUrl)) {
      b.rect(lx, 590 - 38, lw, 38, { fill: C.light, stroke: C.border, r: 10 });
      b.text((cal.catalogLabel || 'Catalogue') + ' →', lx + 8, 590 - 38, lw - 16, 38, { size: 15, min: 11, bold: true, color: C.blue, align: 'center', valign: 'middle', maxLines: 1, link: cal.catalogUrl, role: 'label', noScale: true });
    }
    // Grille.
    var p = /^(\d{4})-(\d{2})$/.exec(month), year = +p[1], mo = +p[2];
    var first = month + '-01', mon = d.monday(first);
    var lastDay = new Date(Date.UTC(year, mo, 0)).getUTCDate();
    var lastIso = month + '-' + d.pad(lastDay);
    var weeks = [];
    for (var wk = mon; wk <= lastIso; wk = d.addDays(wk, 7)) {
      // Ignore une semaine dont aucun jour ouvré n'appartient au mois.
      var anyIn = false;
      for (var k = 0; k < 5; k++) if (d.addDays(wk, k).slice(0, 7) === month) anyIn = true;
      if (anyIn) weeks.push(wk);
    }
    var gx = 300, gy = 262, gw = 560, colW = 58, cellW = (gw - colW) / 5;
    var headH = 40, dayH = 30;
    var rowH = Math.min(52, (590 - 24 - gy - headH - dayH) / weeks.length);
    b.rect(gx, gy, gw, headH, { fill: C.navy, r: 10 });
    b.text(d.monthLabel(month), gx, gy, gw, headH, { size: 23, min: 14, bold: true, color: C.white, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    var hy = gy + headH;
    ['Sem.', 'LUN', 'MAR', 'MER', 'JEU', 'VEN'].forEach(function (h, i) {
      var hx = i === 0 ? gx : gx + colW + (i - 1) * cellW, hw = i === 0 ? colW : cellW;
      b.rect(hx, hy, hw, dayH, { fill: '#DCE6F7', stroke: '#B8C8E4' });
      b.text(h, hx, hy, hw, dayH, { size: 14, min: 10, bold: true, color: C.navy, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    });
    var statusMap = {};
    (cal.statuses || []).forEach(function (s) { statusMap[s.key] = s; });
    weeks.forEach(function (wkStart, r) {
      var ry = hy + dayH + r * rowH;
      b.rect(gx, ry, colW, rowH, { fill: '#F2F5FB', stroke: '#B8C8E4' });
      b.text(String(d.isoWeek(wkStart).week), gx, ry, colW, rowH, { size: 16, min: 10, color: C.muted, bold: true, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
      for (var c = 0; c < 5; c++) {
        var day = d.addDays(wkStart, c), inMonth = day.slice(0, 7) === month;
        var st = statusMap[(cal.days || {})[day]];
        var cx = gx + colW + c * cellW;
        b.rect(cx, ry, cellW, rowH, { fill: inMonth ? (st ? st.color : C.white) : '#EEF0F3', stroke: '#B8C8E4', act: inMonth ? { type: 'calendar-day', date: day } : null });
        if (inMonth) b.text(String(+day.slice(8)), cx, ry, cellW, rowH, { size: 18, min: 10, bold: true, color: st && isDark(st.color) ? C.white : C.ink, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, act: { type: 'calendar-day', date: day } });
      }
    });
    var gridBottom = hy + dayH + weeks.length * rowH;
    // Légende et horaires.
    var rx = 890, rw = 270, ry2 = 262;
    b.text('Légende', rx, ry2, rw, 26, { size: 17, bold: true, color: C.navy, upper: true, maxLines: 1, role: 'label', noScale: true });
    ry2 += 34;
    (cal.statuses || []).forEach(function (s) {
      if (!hasText(s.label)) return;
      b.rect(rx, ry2 + 3, 34, 26, { fill: s.color, stroke: '#9AA8BF', r: 4 });
      var lr = b.text(s.label, rx + 44, ry2, rw - 44, 52, { size: 17, min: 12, bold: true, color: C.ink, valign: 'top', maxLines: 2, field: 'légende', noScale: true });
      ry2 += Math.max(36, lr.height + 10);
    });
    if (hasText(cal.hours)) { ry2 += 6; b.text(cal.hours, rx, ry2, rw, 590 - ry2, { size: 17, min: 12, color: C.blue, bold: true, field: 'horaires' }); }
    var note = cal.note || (ctx.settings.mentions && ctx.settings.mentions.calendar) || '';
    if (note) b.text(note, gx, Math.min(gridBottom + 8, 590), gw + 300, 20, { size: 12.5, min: 10, color: C.muted, maxLines: 1, field: 'mention', role: 'label', noScale: true, important: false });
    b.footer({ link: '', note: ctx.settings.footerNote });
    return [b.result()];
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
    var top0 = alert ? 268 + 84 : 268, colH = 590 - top0, cw = (1120 - 36) / 2;
    var chosen = null;
    for (var s = maxS; s >= minS; s -= 0.5) { if (!flow(paras, [{ w: cw, h: colH }, { w: cw, h: colH }], s).rest.length) { chosen = s; break; } }
    var size = chosen || Math.max(minS, 15 * probe.scale);
    while (rest.length && guard++ < 8) {
      var part = slides.length;
      var b = new (L().Builder)(nth(ctx, part));
      b.banner();
      var y = 190;
      b.icon('info', 40, 192, 50, C.blue);
      b.text((it.title || 'Modalités d’inscription') + (part ? ' (suite)' : ''), 104, y, 1056, 70, { size: 30, min: 20, bold: true, color: C.navy, maxLines: 2, field: 'titre', noScale: true, lh: 1.1 });
      y = 262;
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
      f.chunks.forEach(function (ch, i) { if (ch.length) b.text(ch, boxes[i].x, boxes[i].y, boxes[i].w, boxes[i].h, { size: size, min: size, noScale: true, field: 'règlement' }); });
      rest = f.rest;
      if (rest.length) b.text('Suite page suivante →', 760, 590, 400, 16, { size: 12.5, color: C.purple, bold: true, align: 'right', role: 'label', noScale: true });
      b.footer({ link: CO().linkOf(it, ctx.settings), ctaLabel: it.link && it.link.label, note: ctx.settings.footerNote || 'Modalités à vérifier avant chaque diffusion' });
      slides.push(b.result({ part: part + 1 }));
      if (!f.chunks.some(function (c) { return c.length; })) break;
    }
    if (rest.length) slides[slides.length - 1].warnings.push({ level: 'block', msg: 'Règlement trop long : plus de 8 diapositives.' });
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
        mustRuns.push({ text: it.title, bold: true, color: C.red });
        if (it.regEnd) mustRuns.push({ text: ' (jusqu’au ' + d.fmtShort(it.regEnd) + ')', color: C.red });
      });
      if (data.last.length > 5) mustRuns.push({ text: ' et ' + (data.last.length - 5) + ' autre(s)', color: C.navy });
    }
    if (mustText || mustRuns) blocks.push('must');
    var news = data.news;
    if (news.length) blocks.push('news');
    var editorial = String(o.editorial || '').trim();
    var link = s.planningUrl && CO().validUrl(s.planningUrl) ? s.planningUrl : s.portalUrl;
    var showLink = o.showPlanning !== false && !!link;
    var top = 256, bottom = 636 - (showLink ? 40 : 0) - (editorial ? 30 : 0);
    var avail = bottom - top, gap = 12;
    // Hauteurs naturelles puis répartition de l'espace restant au bloc nouveautés.
    var impParas = hasText(imp.title) ? [{ runs: [{ text: imp.title.trim(), bold: true }] }].concat(hasText(imp.text) ? rich(imp.text) : []) : rich(imp.text);
    var mustParas = mustRuns ? [{ runs: mustRuns }] : rich(mustText, { bold: true });
    var hasImp = blocks.indexOf('important') >= 0, hasMust = blocks.indexOf('must') >= 0;
    var newsMin = news.length ? 150 : 0, hImp = 0, hMust = 0;
    // Hauteurs naturelles à une taille commune, réduite si nécessaire pour laisser place aux nouveautés.
    for (var fs = 21; fs >= 14; fs -= 1) {
      hImp = hasImp ? Math.max(66, b.measure(impParas, 836, fs) + 22) : 0;
      hMust = hasMust ? Math.max(62, b.measure(mustParas, 836, fs) + 22) : 0;
      if (hImp + hMust + (hImp ? gap : 0) + (hMust ? gap : 0) + newsMin <= avail) break;
    }
    var used = hImp + hMust + (hImp ? gap : 0) + (hMust ? gap : 0);
    if (used + newsMin > avail) { var k = (avail - newsMin - (hImp ? gap : 0) - (hMust ? gap : 0)) / Math.max(1, hImp + hMust); hImp *= k; hMust *= k; used = avail - newsMin; }
    var hNews = news.length ? Math.min(260, avail - used) : 0;
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
    if (hMust) row('à ne pas manquer', hMust, C.amber, '#F6D2A8', C.orange, 'À ne pas manquer', mustParas, 'calendar');
    if (hNews) {
      var ny = y + 14, nh = hNews - 14;
      b.rect(40, ny, 1120, nh, { fill: C.white, stroke: '#7CC49A', sw: 2, r: 14 });
      var lab = data.newsTotal > 1 ? 'Les nouveautés de la semaine' : 'La nouveauté de la semaine';
      var lw = Mx().width(lab.toLocaleUpperCase('fr'), 16, true) * 1.06 + 40;
      b.pill(lab.toLocaleUpperCase('fr'), 600 - lw / 2, ny - 16, { size: 16, h: 32, w: lw, fill: C.green });
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
    if (!hImp && !hMust && !hNews) b.text('Ajoutez un message important ou des activités : la couverture se remplit automatiquement.', 80, 320, 1040, 120, { size: 24, color: C.muted, align: 'center', valign: 'middle', field: 'couverture', important: false });
    var ey = 636 - (showLink ? 40 : 0) - (editorial ? 30 : 0) + 2;
    if (editorial) { b.text(editorial, 40, ey, 1120, 26, { size: 16, min: 12, bold: true, color: C.navy, align: 'center', maxLines: 1, field: 'message éditorial', noScale: true }); ey += 30; }
    if (showLink) {
      b.rect(140, ey, 920, 34, { fill: '#E4EEFD', stroke: '#C2D5F3', r: 17 });
      b.text((s.planningLabel || 'Vue d’ensemble des activités du CSE') + ' →', 160, ey, 880, 34, { size: 16, min: 11, bold: true, color: C.blue, align: 'center', valign: 'middle', maxLines: 1, link: link, role: 'label', noScale: true });
    }
    b.footer({ link: '', note: s.footerNote });
    return [b.result()];
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
      var color = urgent ? '#D9381E' : C.green;
      b.rect(0, bandY, 1200, bandH, { fill: color });
      if (urgent) { b.rect(0, bandY + bandH - 7, 1200, 7, { fill: '#FF9F1C' }); }
      var title = o.title || (urgent ? 'Dernière chance !' : 'Les nouveautés de la semaine');
      b.text(title.toLocaleUpperCase('fr') + (chunks.length > 1 ? ' (' + (ci + 1) + '/' + chunks.length + ')' : ''), 40, bandY + 6, 760, 36, { size: 30, min: 18, bold: true, color: C.white, maxLines: 1, field: 'titre', noScale: true });
      var sub = o.subtitle || (urgent ? 'Clôture des inscriptions d’ici le ' + d.fmtLong(d.addDays(ctx.issue.refDate, ctx.settings.lastDays || 7)) : (all.length > 1 ? all.length + ' nouvelles activités à découvrir' : 'Une nouvelle activité à découvrir'));
      b.text(sub, 40, bandY + 38, 760, 22, { size: 16, min: 11, color: '#FFF6E8', maxLines: 1, field: 'sous-titre', noScale: true, role: 'label' });
      var link = ctx.settings.portalUrl;
      if (link) b.pill('Inscriptions sur le portail CSE →', 1160, bandY + 15, { size: 15, h: 34, fill: C.white, color: color, align: 'right', link: link });
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
    b.rect(x, y, w, h, { fill: C.white, stroke: urgent ? '#F2B8A8' : C.border, sw: urgent ? 2 : 1, r: 14 });
    var photo = (it.photos || [])[0];
    var pw = horizontal ? Math.min(h * 1.25, w * (n === 1 ? 0.5 : n >= 5 ? 0.34 : 0.42)) : w, ph = horizontal ? h : Math.min(h * 0.5, w * 0.62);
    b.photo(photo, x, y, pw, ph, { color: col, label: cat ? cat.name : '' });
    if (urgent) {
      var cd = it.regEnd ? d.countdown(it.regEnd, ctx.issue.refDate) : 'Urgent';
      b.pill(cd, x + 12, y + 12, { size: n <= 2 ? 22 : 17, h: n <= 2 ? 40 : 32, fill: C.red });
    } else if (cls.isNew || ctx.page.kind === 'news') {
      b.badge('new', x + 10, y + 10, n <= 2 ? 78 : 62);
    }
    var tx = horizontal ? x + pw + 16 : x + 14, ty = horizontal ? y + 14 : y + ph + 10;
    var tw = horizontal ? w - pw - 30 : w - 28, bottomY = y + h - 12;
    if (cat) { b.text(cat.name, tx, ty, tw, 20, { size: 14, min: 10, bold: true, color: col, upper: true, maxLines: 1, role: 'label', noScale: true }); ty += 22; }
    var infoH = urgent ? 54 : 26;
    var big = n === 1;
    var titleH = bottomY - ty - infoH - 6;
    var summaryParas = n <= 2 && hasText(it.summary) ? rich(it.summary) : null;
    var tr = b.text(it.title, tx, ty, tw, big ? Math.min(110, titleH) : titleH, { size: big ? 34 : n <= 3 ? 25 : 21, min: 14, bold: true, color: C.navy, maxLines: big ? 3 : 4, field: 'titre de carte', noScale: true, lh: 1.12 });
    if (summaryParas) { var sy = ty + tr.height + 8; if (bottomY - infoH - 8 - sy > 40) b.text(summaryParas, tx, sy, tw, bottomY - infoH - 8 - sy, { size: big ? 21 : 18, min: 13, color: C.ink, field: 'résumé', important: false }); }
    var dt = d.fmtRange(it.dateStart, it.dateEnd);
    if (urgent) {
      b.rect(tx, bottomY - infoH, tw, infoH, { fill: '#FFE9E3', r: 8 });
      var narrow = tw < 300;
      b.text(it.regEnd ? (narrow ? 'Jusqu’au ' : 'Inscriptions jusqu’au ') + d.fmtDayShort(it.regEnd) : 'Date limite à préciser', tx + 10, bottomY - infoH + 4, tw - 20, 24, { size: 17, min: 11, bold: true, color: C.red, maxLines: 1, role: 'label', noScale: true, field: 'date limite' });
      var dts = narrow ? d.fmtRangeShort(it.dateStart, it.dateEnd) : dt;
      b.text(dts ? (narrow ? '' : 'Activité : ') + dts : 'Dernière semaine', tx + 10, bottomY - infoH + 28, tw - 20, 20, { size: 14, min: 10, color: '#8A3B12', maxLines: 1, role: 'label', noScale: true, field: 'date activité', important: false });
    } else if (dt) {
      b.rect(tx, bottomY - infoH, tw, infoH, { fill: C.greenLight, r: 7 });
      b.text(dt, tx + 10, bottomY - infoH, tw - 20, infoH, { size: 15, min: 10, bold: true, color: C.green, valign: 'middle', maxLines: 1, role: 'label', noScale: true });
    }
  }

  /** Programme à venir : liste chronologique ou tableau, pagination automatique. */
  function upcoming(ctx, table) {
    var C = L().C, d = D(), o = ctx.page.opts || {};
    var rows = CO().upcomingRows(ctx.page, ctx.project, ctx.issue);
    var cat = o.categoryId ? (ctx.project.categories || []).find(function (c) { return c.id === o.categoryId; }) : null;
    var slides = [], i = 0, guard = 0;
    var title = o.title || 'Programme des prochaines activités';
    var sub = o.subtitle || (cat ? cat.name : '') + (o.from || o.to ? (cat ? ' · ' : '') + d.fmtRange(o.from, o.to).replace(/^Le /, 'à partir du ') : '');
    var catColor = function (name) { var c = (ctx.project.categories || []).find(function (x) { return x.name === name; }); return c ? c.color : C.blue; };
    do {
      var b = new (L().Builder)(nth(ctx, slides.length));
      b.banner();
      b.pill('À venir', 40, 190, { size: 16, h: 34, fill: C.purple });
      b.text(title + (slides.length ? ' (suite)' : ''), 190, 186, 970, 42, { size: 30, min: 20, bold: true, color: C.navy, maxLines: 1, field: 'titre', noScale: true });
      if (sub) b.text(sub, 190, 226, 970, 24, { size: 18, min: 13, bold: true, color: C.purple, maxLines: 1, field: 'sous-titre', noScale: true });
      var note = o.note || ctx.settings.mentions.upcoming;
      var y = 262, bottom = 592 - (note ? 20 : 0);
      if (!rows.length) {
        b.text('Aucune activité future ne correspond. Ajoutez des fiches datées dans la bibliothèque ou saisissez des lignes manuellement.', 90, 330, 1020, 140, { size: 22, color: C.muted, align: 'center', valign: 'middle', role: 'label' });
        b.warn('Programme vide.', 'warn');
      } else if (table) {
        var cols = [{ k: 'title', l: 'Activité', w: 430 }, { k: 'location', l: 'Lieu', w: 250 }, { k: 'type', l: cat ? 'Statut' : 'Type', w: 200 }, { k: 'date', l: 'Date', w: 240 }];
        b.rect(40, y, 1120, 38, { fill: C.navy, r: 8 });
        var cx = 40;
        cols.forEach(function (c) { b.text(c.l, cx + 12, y, c.w - 20, 38, { size: 16, bold: true, color: C.white, valign: 'middle', upper: true, maxLines: 1, role: 'label', noScale: true }); cx += c.w; });
        y += 42;
        var cellsOf = function (r) { return { title: r.title, location: r.location || '—', type: (cat ? r.status : [r.type, r.status].filter(hasText).join(' · ')) || '—', date: d.fmtRange(r.date, r.dateEnd).replace(/^Le /, '') || 'À préciser' }; };
        var size = 17;
        var heights = rows.slice(i).map(function (r) {
          var cells = cellsOf(r), rh = 22;
          cols.forEach(function (c) { rh = Math.max(rh, Math.min(2, Mx().countLines(Mx().toParas(cells[c.k], { bold: c.k === 'title' }), c.w - 24, size)) * size * 1.2); });
          return rh + 16;
        });
        // Lignes plus aérées lorsqu'il y en a peu.
        var fitCount = 0, acc = 0;
        while (fitCount < heights.length && acc + heights[fitCount] <= bottom - y) { acc += heights[fitCount]; fitCount++; }
        var bonus = fitCount === heights.length ? Math.min(26, (bottom - y - acc) / Math.max(1, fitCount)) : 0;
        var z = 0;
        while (i < rows.length) {
          var cells = cellsOf(rows[i]), rh = heights[z] + bonus;
          if (y + rh > bottom + 0.5) break;
          b.rect(40, y, 1120, rh, { fill: z % 2 ? C.white : C.light, stroke: C.border });
          cx = 40;
          cols.forEach(function (c) { b.text(cells[c.k], cx + 12, y + 8, c.w - 24, rh - 16, { size: size, min: 11, bold: c.k === 'title' || c.k === 'date', color: c.k === 'date' ? C.purple : C.ink, valign: 'middle', maxLines: 2, field: c.l, noScale: true }); cx += c.w; });
          y += rh; i++; z++;
        }
      } else {
        var left = rows.length - i, avail = bottom - y;
        var rh2 = Math.max(36, Math.min(58, avail / left));
        var count = Math.floor((avail + 6) / rh2);
        var showCat = !cat && new Set(rows.map(function (r) { return r.type; })).size > 1;
        for (var k = 0; k < count && i < rows.length; k++, i++) {
          var r2 = rows[i], hh = rh2 - 6;
          b.rect(40, y, 1120, hh, { fill: C.lighter, stroke: C.border, r: 9 });
          b.rect(40, y, 190, hh, { fill: C.lilac, r: 9 });
          b.text(d.fmtRangeShort(r2.date, r2.dateEnd) || 'À préciser', 48, y, 174, hh, { size: 17, min: 11, bold: true, color: C.purple, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
          var x2 = 246;
          if (showCat && r2.type) {
            var tw2 = Math.min(220, Mx().width(r2.type.toLocaleUpperCase('fr'), 12, true) * 1.06 + 20);
            b.pill(r2.type.toLocaleUpperCase('fr'), x2, y + hh / 2 - 12, { size: 12, h: 24, w: tw2, fill: catColor(r2.type) });
            x2 += tw2 + 12;
          }
          var detail = [r2.location, r2.status].filter(hasText).join(' · ');
          var dw = detail ? Math.min(360, Mx().width(detail, 15, false) * 1.06 + 10) : 0;
          b.text(r2.title, x2, y, 1150 - x2 - dw - 16, hh, { size: 20, min: 12, bold: true, color: C.navy, valign: 'middle', maxLines: 1, field: 'activité', noScale: true });
          if (detail) b.text(detail, 1150 - dw, y, dw, hh, { size: 15, min: 11, color: C.muted, align: 'right', valign: 'middle', maxLines: 1, role: 'label', noScale: true });
          y += rh2;
        }
      }
      if (note) b.text(note, 40, 594, 1120, 20, { size: 13, min: 10, color: C.muted, maxLines: 1, role: 'label', noScale: true, field: 'mention' });
      b.footer({ link: ctx.settings.portalUrl, ctaLabel: 'Portail CSE', note: ctx.settings.footerNote });
      slides.push(b.result({ part: slides.length + 1 }));
    } while (i < rows.length && guard++ < 10);
    if (slides.length > 1) slides[0].warnings.push({ level: 'info', msg: 'Programme réparti automatiquement sur ' + slides.length + ' diapositives.' });
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
    var item = page.kind === 'item' ? CO().findItem(project, page.itemId) : null;
    var settings = project.settings;
    var ref = issue.refDate;
    var tid = templateIdFor(page, item, project);
    var density = page.density && page.density !== 'auto' ? page.density : item && item.density !== 'auto' ? item.density : settings.defaultDensity || 'auto';
    var base = { project: project, issue: issue, page: page, item: item, ref: ref, settings: settings, templateId: tid,
      cat: item ? CSE.model.categoryOf(project, item) : null,
      cls: item ? CO().classify(item, ref, settings) : null,
      prices: item ? CSE.pricing.fromPricing(item.pricing, settings) : { kind: 'none', rows: [], issues: [] },
      pageNumber: opts.pageNumber || 0 };
    if (page.kind === 'item' && !item) {
      var b = new (L().Builder)(base);
      b.banner();
      b.text('Fiche introuvable (supprimée de la bibliothèque).', 80, 300, 1040, 80, { size: 26, color: L().C.red, align: 'center', valign: 'middle' });
      b.warn('Cette page référence une fiche supprimée : retirer la page ou restaurer la fiche.', 'block');
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
    }
    // Pagination interne : numéros successifs.
    slides.forEach(function (s, i) {
      s.templateId = tid; s.pageId = page.id; s.part = slides.length > 1 ? i + 1 : 0; s.parts = slides.length;
      if (opts.pageNumber) s.pageNumber = opts.pageNumber + i;
      if (item && i === 0) {
        // Les avertissements de pagination du texte sont complétés par les contrôles de la fiche.
        (base.prices.issues || []).forEach(function (x) { s.warnings.push({ level: x[0], msg: 'Tarifs : ' + x[1] }); });
        if (base.cls.expired) s.warnings.push({ level: 'warn', msg: 'Fiche expirée à la date du MEL.' });
      }
    });
    if (item && tid === 'classic' && !page.split && slides[0].overflow) {
      slides[0].warnings.push({ level: 'warn', code: 'suggest-split', msg: 'Conseil : activer « Scinder en deux pages » pour publier tout le texte lisiblement.' });
    }
    return slides;
  }
  /** Rend tout le MEL (pages incluses), avec numérotation facultative. */
  function renderIssue(project, issue, opts) {
    opts = opts || {};
    var pages = CO().enforceOrder(issue.pages, project);
    var out = [], n = 1;
    pages.forEach(function (p) {
      if (!p.included && !opts.all) { out.push({ page: p, slides: [], excluded: true }); return; }
      var slides = renderPage(p, project, issue, { pageNumber: issue.numbering && p.included ? n : 0 });
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
    renderItem: renderItem, readability: readability, flow: flow, dateLine: dateLine, contactText: contactText };
});
