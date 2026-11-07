/* CSE Studio V9 · Bibliothèque de blocs graphiques (moteur de composition commun).
 * Coordonnées en « px de diapositive » : 1200 × 675 = 13,333 × 7,5 pouces (16:9).
 * Un même résultat (liste d'éléments) alimente l'aperçu HTML et l'export PowerPoint.
 * Éléments produits :
 *   {t:'rect'|'ellipse', x,y,w,h, fill, stroke, sw, r, rot}
 *   {t:'image', x,y,w,h, src, fit:'cover'|'contain'}
 *   {t:'text', x,y,w,h, paras, size, color, bold, align, valign, lh, link, rot, field, overflow}
 */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.layout = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var W = 1200, H = 675;
  var BANNER_H = 1200 * 282 / 1920; // bandeau officiel 1920 × 282, sans déformation
  var C = {
    navy: '#1C3474', blue: '#2F5DA8', bar: '#3B4BA3', purple: '#6236C9', red: '#D6263C', orange: '#EF7A1A', amber: '#FFF2E0',
    coral: '#FDECEC', green: '#1E8A4C', greenLight: '#E8F6EE', light: '#EEF3FB', lighter: '#F6F8FC', ink: '#1F2937', muted: '#56657C',
    border: '#D7E0EE', white: '#FFFFFF', yellow: '#FFD43B', lilac: '#F1ECFD', dark: '#15295A',
    // Statuts éditoriaux sobres (V9.1)
    newBg: '#EAF5ED', newText: '#3E7657', newBorder: '#C6E0CE',
    lastBg: '#FFF1E5', lastText: '#A75B2C', lastBorder: '#F1C9A8',
    priceBg: '#F8F6FE', priceBorder: '#E6DFFA'
  };
  /* Seuils de lisibilité, en px de diapositive (1 px = 0,8 pt dans PowerPoint) :
   *   corps de texte : 15 px = 12 pt minimum, cible 17,5–20 px = 14–16 pt ;
   *   titres : 22 px = 17,6 pt minimum ; petites métadonnées (libellés, mentions) : 11 px = 8,8 pt. */
  var MIN = { body: 15, compactBody: 13.75, small: 12.5, title: 28 };
  var PT = 0.8;
  /* Jetons de conception V10 (px de diapositive ; 1 px = 0,8 pt) : marges, espacements, rayons et tailles
   * communs à tous les modèles, pour des alignements identiques d'une diapositive à l'autre. */
  var T = {
    margin: 40, right: 1160, contentW: 1120, top: 186, headerTitleY: 220, bodyBottom: 590, footerY: 645, actionY: 600,
    gap: { xs: 6, s: 10, m: 14, l: 22, col: 30 },
    radius: { s: 6, m: 10, l: 14 },
    font: { title: 34, titleMin: 28, sub: 19, body: 19, bodyTarget: 17.5, bodyMin: 15, label: 12.5, info: 15.5 },
    lh: 1.2
  };
  var M = function () { return CSE.metrics; };

  function Builder(ctx) {
    this.ctx = ctx || {};
    this.items = [];
    this.warnings = [];
    this.overflows = [];
    this.minBody = Infinity;
    this.density = this.ctx.density || 'auto';
    this.scale = this.density === 'airy' ? 1.1 : this.density === 'compact' ? 0.9 : 1;
  }
  var B = Builder.prototype;

  B.rect = function (x, y, w, h, o) {
    o = o || {};
    if (w <= 0 || h <= 0) return null;
    var it = { t: 'rect', x: x, y: y, w: w, h: h, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1, r: o.r || 0, rot: o.rot || 0 };
    if (o.act) it.act = o.act;
    this.items.push(it);
    return it;
  };
  B.ellipse = function (x, y, w, h, o) {
    o = o || {};
    var it = { t: 'ellipse', x: x, y: y, w: w, h: h, fill: o.fill || null, stroke: o.stroke || null, sw: o.sw || 1, rot: o.rot || 0 };
    this.items.push(it);
    return it;
  };
  B.image = function (src, x, y, w, h, o) {
    o = o || {};
    if (!src || w <= 0 || h <= 0) return null;
    var meta = o.meta || photoMeta(this.ctx, src);
    var it = { t: 'image', x: x, y: y, w: w, h: h, src: src, fit: o.fit || meta.fit || 'cover', role: o.role || 'photo' };
    if (meta.fx !== undefined || meta.fy !== undefined) { it.fx = clampPct(meta.fx); it.fy = clampPct(meta.fy); }
    if (meta.alt) it.alt = String(meta.alt).slice(0, 200);
    this.items.push(it);
    return it;
  };
  /** État d'une image : prête (octets locaux), distante non importée (CORS possible) ou introuvable. */
  function imageStatus(src) {
    if (!src) return 'missing';
    if (/^assets\//.test(src) || /^data:image\//.test(src)) return 'ready';
    var I = CSE.images;
    if (I && typeof I.status === 'function') return I.status(src);
    return 'ready';
  }
  /** Cadrage choisi pour une photo (point focal, cover/contain) : fiche affichée puis bibliothèque. */
  function photoMeta(ctx, src) {
    var it = ctx && ctx.item;
    if (it && it.photoMeta && it.photoMeta[src]) return it.photoMeta[src];
    var items = ctx && ctx.project && ctx.project.items || [];
    for (var i = 0; i < items.length; i++) if (items[i].photoMeta && items[i].photoMeta[src]) return items[i].photoMeta[src];
    return {};
  }
  function clampPct(v) { var n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50; }
  /** Mesure sans dessiner. */
  B.measure = function (value, w, size, o) {
    o = o || {};
    var paras = M().toParas(value, { bold: o.bold, bullets: o.bullets });
    return M().textHeight(paras, w, size, o.lh);
  };
  /** Taille de police retenue pour un texte (densité appliquée), sans dessiner. */
  B.fitSize = function (value, w, h, o) {
    o = o || {};
    var max = (o.size || 18) * (o.noScale ? 1 : this.scale);
    var min = o.min || Math.min(max, this.density === 'compact' ? MIN.compactBody : MIN.body);
    return M().fit(value, w, h, { max: max, min: Math.min(min, max), bold: o.bold, bullets: o.bullets, maxLines: o.maxLines, lh: o.lh });
  };
  /** Texte ajusté dans sa boîte : la police diminue jusqu'au seuil, sinon troncature signalée. */
  B.text = function (value, x, y, w, h, o) {
    o = o || {};
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length)) return { size: 0, height: 0, lines: 0, overflow: false };
    if (w <= 4 || h <= 4) return { size: 0, height: 0, lines: 0, overflow: true };
    var r = this.fitSize(value, w, h, o);
    var paras = r.paras.map(function (p) {
      return { runs: p.runs.map(function (run) { return { text: o.upper ? String(run.text).toLocaleUpperCase('fr') : run.text, bold: run.bold || !!o.bold, color: run.color, link: run.link }; }), bullet: p.bullet, align: p.align };
    });
    var it = { t: 'text', x: x, y: y, w: w, h: h, paras: paras, size: r.size, color: o.color || C.ink, bold: !!o.bold, align: o.align || 'left',
      valign: o.valign || 'top', lh: o.lh || M().LINE_HEIGHT, link: o.link || '', rot: o.rot || 0, field: o.field || '', overflow: r.overflow, role: o.role || 'body' };
    if (o.act) it.act = o.act;
    this.items.push(it);
    if (o.role !== 'label' && o.role !== 'deco' && r.size < this.minBody) this.minBody = r.size;
    if (r.overflow) {
      this.overflows.push({ field: o.field || 'texte', hidden: r.hidden });
      this.warnings.push({ level: o.important === false ? 'warn' : 'block', code: 'overflow', field: o.field || 'texte',
        msg: 'Texte trop long dans « ' + (o.field || 'texte') + ' » : ' + (r.hidden || 'quelques') + ' mot(s) ne tiennent pas, même en police minimale. Raccourcir, passer en mode compact ou scinder la fiche en deux pages.' });
    }
    return { size: r.size, height: Math.min(h, r.height), lines: r.lines, overflow: r.overflow, item: it };
  };
  B.warn = function (msg, level, code) { this.warnings.push({ level: level || 'warn', msg: msg, code: code || '' }); };

  /* ---------- Blocs communs ---------- */
  B.banner = function () {
    this.items.push({ t: 'image', x: 0, y: 0, w: W, h: BANNER_H, src: 'assets/bandeau-cse.jpg', fit: 'stretch', role: 'banner' });
    this.rect(0, BANNER_H, W, 2.5, { fill: '#E3E9F4' });
  };
  /** Barre basse, contact, bouton d'action et numéro de page. */
  B.footer = function (o) {
    o = o || {};
    var ctx = this.ctx;
    this.rect(0, 645, W, 30, { fill: C.bar });
    var right = 1160;
    if (ctx.pageNumber) {
      this.text(String(ctx.pageNumber), 1100, 649, 60, 22, { size: 14, min: 11, color: C.white, bold: true, align: 'right', role: 'label', noScale: true, maxLines: 1 });
    }
    if (o.note) this.text(o.note, 40, 649, 900, 22, { size: 12.5, min: 11, color: '#E6EBFA', role: 'label', noScale: true, maxLines: 1, field: 'note de bas de page', important: false });
    var link = o.link || '';
    if (link && o.cta !== false) {
      var label = String(o.ctaLabel || 'Plus d’infos').trim() || 'Plus d’infos';
      var bw = Math.min(260, Math.max(150, M().width(label, 16, true) * 1.08 + 44));
      this.rect(right - bw, 600, bw, 36, { fill: C.navy, r: 18 });
      this.text(label + ' →', right - bw + 10, 600, bw - 20, 36, { size: 16, min: 12, bold: true, color: C.white, align: 'center', valign: 'middle', link: link, maxLines: 1, role: 'label', noScale: true, field: 'bouton' });
      right = right - bw - 16;
    }
    if (o.contactRuns && o.contactRuns.length) {
      var lbl = o.contactCount > 1 ? 'Contacts : ' : 'Contact : ';
      this.text([{ runs: [{ text: lbl, bold: true }].concat(o.contactRuns) }], 40, 602, right - 40, 34,
        { size: 15, min: 12, color: C.purple, valign: 'middle', maxLines: 2, field: 'contacts', role: 'label', noScale: true, important: false });
    }
  };
  /** Étiquette de rubrique / catégorie en petites capitales colorées. */
  B.tag = function (text, x, y, color, o) {
    o = o || {};
    if (!text) return 0;
    var size = o.size || 14;
    var w = Math.min(o.maxW || 600, M().width(String(text).toLocaleUpperCase('fr'), size, true) * 1.06 + 24);
    this.rect(x, y, w, size + 12, { fill: color || C.blue, r: (size + 12) / 2 });
    this.text(text, x + 10, y, w - 20, size + 12, { size: size, min: 10, bold: true, color: C.white, upper: true, valign: 'middle', maxLines: 1, role: 'label', noScale: true, align: 'center' });
    return w;
  };
  /** Étiquette de statut sobre : « Nouveauté » (vert pastel) ou « Dernière chance » (orange pastel). Renvoie {w,h,x}. */
  B.statusLabel = function (kind, text, x, y, o) {
    o = o || {};
    var last = kind === 'last', size = o.size || 13, h = o.h || 26;
    var w = Math.min(o.maxW || 320, M().width(text, size, true) * 1.06 + 22);
    var px = o.align === 'right' ? x - w : x;
    this.rect(px, y, w, h, { fill: last ? C.lastBg : C.newBg, stroke: last ? C.lastBorder : C.newBorder, r: 6 });
    this.text(text, px + 10, y, w - 20, h, { size: size, min: 10, bold: true, color: last ? C.lastText : C.newText, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'statut' });
    return { w: w, h: h, x: px };
  };
  /** Encart « Dernière chance » : titre + date limite, dimensionné au texte. Renvoie {w,h,x}. */
  B.lastChanceBox = function (deadlineText, x, y, o) {
    o = o || {};
    var line2 = deadlineText ? 'Inscriptions jusqu’au ' + deadlineText : 'Inscriptions bientôt closes';
    var w = Math.min(o.maxW || 360, Math.max(M().width('Dernière chance', 15, true), M().width(line2, 13.5, false)) * 1.06 + 28);
    var h = 50, px = o.align === 'right' ? x - w : x;
    this.rect(px, y, w, h, { fill: C.lastBg, stroke: C.lastBorder, r: 8 });
    this.rect(px, y + 8, 3, h - 16, { fill: C.lastText });
    this.text('Dernière chance', px + 14, y + 6, w - 22, 20, { size: 15, min: 11, bold: true, color: C.lastText, maxLines: 1, role: 'label', noScale: true, field: 'dernière chance' });
    this.text(line2, px + 14, y + 26, w - 22, 18, { size: 13.5, min: 10, color: C.lastText, maxLines: 1, role: 'label', noScale: true, field: 'date limite' });
    return { w: w, h: h, x: px };
  };
  /** Pictogramme vectoriel (même tracé en SVG et dans PowerPoint). */
  B.glyph = function (key, x, y, size, color) {
    var I = CSE.icons, ic = I && (I.ICONS[key] || I.ICONS.star);
    if (!ic) return;
    var self = this;
    ic.paths.forEach(function (cmds) { self.items.push({ t: 'path', x: x, y: y, w: size, h: size, vb: 24, d: cmds, fill: color || C.navy, icon: key }); });
  };
  /** Étiquette de catégorie avec pictogramme. Renvoie la largeur totale. */
  B.catTag = function (cat, x, y, o) {
    o = o || {};
    if (!cat) return 0;
    var color = cat.color || C.blue, h = o.h || 26;
    this.rect(x, y, h, h, { fill: color, r: 6 });
    this.glyph(CSE.icons ? CSE.icons.iconFor(cat) : 'star', x + 4, y + 4, h - 8, C.white);
    var size = o.size || 13;
    var tw = Math.min(o.maxW || 420, M().width(String(cat.name).toLocaleUpperCase('fr'), size, true) * 1.06 + 4);
    this.text(cat.name, x + h + 8, y, tw, h, { size: size, min: 10, bold: true, color: shade(color, 0.12), upper: true, valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'catégorie' });
    return h + 8 + tw;
  };
  /** Pastille de texte (J−3, CODE…). Renvoie la largeur utilisée. */
  B.pill = function (text, x, y, o) {
    o = o || {};
    var size = o.size || 15, h = o.h || size + 14;
    var w = o.w || Math.min(o.maxW || 500, M().width(text, size, o.bold !== false) * 1.06 + 26);
    var px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    this.rect(px, y, w, h, { fill: o.fill || C.navy, stroke: o.stroke, r: o.r !== undefined ? o.r : h / 2 });
    this.text(text, px + 8, y, w - 16, h, { size: size, min: Math.min(size, 11), bold: o.bold !== false, color: o.color || C.white, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, link: o.link });
    return w;
  };
  /** Pictogramme dessiné (aucune police d'icônes : rendu identique dans PowerPoint). */
  B.icon = function (kind, x, y, s, color) {
    color = color || C.blue;
    if (kind === 'info') {
      this.ellipse(x, y, s, s, { fill: color });
      this.text('i', x, y, s, s, { size: s * 0.62, min: 8, bold: true, color: C.white, align: 'center', valign: 'middle', role: 'deco', noScale: true });
    } else if (kind === 'alert') {
      this.ellipse(x, y, s, s, { fill: color || C.red });
      this.text('!', x, y, s, s, { size: s * 0.66, min: 8, bold: true, color: C.white, align: 'center', valign: 'middle', role: 'deco', noScale: true });
    } else if (kind === 'calendar') {
      this.rect(x, y + s * 0.12, s, s * 0.88, { fill: C.white, stroke: color, sw: 2, r: 5 });
      this.rect(x, y + s * 0.12, s, s * 0.26, { fill: color, r: 3 });
      for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) this.rect(x + s * (0.16 + i * 0.26), y + s * (0.5 + j * 0.22), s * 0.16, s * 0.12, { fill: color });
    } else if (kind === 'mail') {
      this.rect(x, y + s * 0.18, s, s * 0.64, { fill: C.white, stroke: color, sw: 2, r: 4 });
      this.text('@', x, y + s * 0.18, s, s * 0.64, { size: s * 0.42, min: 8, bold: true, color: color, align: 'center', valign: 'middle', role: 'deco', noScale: true });
    }
  };
  /** Image ou panneau décoratif aux couleurs de la catégorie (jamais de texte « ajouter une image » exporté). */
  B.photo = function (src, x, y, w, h, o) {
    o = o || {};
    if (src) {
      var st = imageStatus(src);
      if (st === 'ready') { this.image(src, x, y, w, h, { fit: o.fit }); return true; }
      // Image non intégrable : erreur visible et bloquante à l'export (jamais un cadre gris silencieux).
      this.rect(x, y, w, h, { fill: '#FFF4F2', stroke: '#E5484D', sw: 2, r: 4, role: 'image-error' });
      var msg = st === 'remote' ? 'Image Web non importée' : 'Image introuvable';
      if (w > 90 && h > 50) this.text(h > 90 ? [{ runs: [{ text: msg, bold: true }] }, { runs: [{ text: 'Réimporter le fichier ou coller l’image', bold: false }] }] : msg, x + 8, y + 8, w - 16, h - 16, { size: 13, min: 11, bold: true, color: '#B42318', align: 'center', valign: 'middle', role: 'label', noScale: true, field: 'photo' });
      this.warnings.push({ level: 'block', code: 'image', src: src, status: st,
        msg: st === 'remote' ? 'Photo liée à une adresse Web non importée : elle ne peut pas être intégrée au PowerPoint (CORS). Importer le fichier ou coller l’image.' : 'Photo introuvable dans le stockage local : la réimporter ou la retirer.' });
      return false;
    }
    if (o.placeholder === false) return false;
    var color = o.color || C.blue;
    this.rect(x, y, w, h, { fill: tint(color, 0.18) });
    this.rect(x + 10, y + 10, w - 20, h - 20, { fill: tint(color, 0.32), r: 8 });
    if (o.label) this.text(o.label, x + 16, y + 16, w - 32, h - 32, { size: Math.min(34, Math.max(14, Math.min(w, h) / 5)), min: 11, bold: true, color: shade(color, 0.25), align: 'center', valign: 'middle', upper: true, role: 'deco', noScale: true, maxLines: 3 });
    return false;
  };
  /** Pile d'informations (libellé + valeur) dans un panneau. Renvoie la hauteur utilisée. */
  B.chips = function (chips, x, y, w, maxH, o) {
    o = o || {};
    var self = this, gap = 8, pad = 10;
    if (!chips.length) return 0;
    var size = (o.size || 17) * this.scale, min = o.min || 12.5, labelH = 15;
    // Ajuste une taille commune pour que la pile tienne.
    var heights;
    for (; size >= min; size -= 0.5) {
      heights = chips.map(function (c) { return pad * 2 + labelH + 3 + Math.min(c.maxLines || 4, M().countLines(M().toParas(c.value, { bold: true }), w - 2 * pad, size)) * size * 1.2 + (c.sub ? 17 : 0); });
      if (heights.reduce(function (a, b) { return a + b; }, 0) + gap * (chips.length - 1) <= maxH) break;
    }
    size = Math.max(min, size);
    var total = heights.reduce(function (a, b) { return a + b; }, 0) + gap * (chips.length - 1);
    // Répartit l'espace restant si la pile est courte (évite le vide sous les infos).
    var extra = o.stretch && total < maxH ? Math.min(24, (maxH - total) / chips.length) : 0;
    var cy = y;
    chips.forEach(function (c, i) {
      var hh = Math.min(heights[i] + extra, maxH - (cy - y));
      if (hh < 30) return;
      self.rect(x, cy, w, hh, { fill: c.fill || C.lighter, stroke: c.stroke || C.border, r: 10 });
      if (c.accent) self.rect(x, cy, 5, hh, { fill: c.accent });
      self.text(c.label, x + pad + (c.accent ? 4 : 0), cy + pad, w - 2 * pad - (c.badge ? 64 : 0), labelH, { size: 11.5, min: 9, bold: true, color: c.labelColor || C.muted, upper: true, maxLines: 1, role: 'label', noScale: true });
      if (c.badge) self.pill(c.badge, x + w - pad, cy + pad - 3, { size: 12, h: 21, fill: c.badgeFill || C.red, align: 'right' });
      var vh = hh - 2 * pad - labelH - 3 - (c.sub ? 17 : 0) - extra;
      self.text(c.value, x + pad + (c.accent ? 4 : 0), cy + pad + labelH + 3 + extra / 2, w - 2 * pad - (c.accent ? 4 : 0), Math.max(vh, size * 1.2), { size: size, min: Math.min(size, min), bold: true, color: c.color || C.navy, maxLines: c.maxLines || 4, field: c.label, noScale: true, important: false });
      if (c.sub) self.text(c.sub, x + pad + (c.accent ? 4 : 0), cy + hh - pad - 15, w - 2 * pad, 16, { size: 12.5, min: 10, color: C.muted, maxLines: 1, role: 'label', noScale: true, field: c.label });
      cy += hh + gap;
    });
    return cy - gap - y;
  };
  /* ---------- Cartouche tarifaire V10 : géométrie déterministe ----------
   * Grille 4 / 4 / 2 : chaque colonne c commence au même x (T1, T5, T9 alignés à gauche) et
   * les montants sont alignés à droite sur le même bord (symbole € aligné). « Extérieur » occupe
   * les colonnes libres de la dernière ligne, aligné sur le bord droit des montants. Le supplément
   * court est intégré en haut à droite ; un supplément long passe dans un encart interne, renvoyé
   * à la ligne sans troncature. Les largeurs viennent des métriques Arial (metrics.js) et servent
   * à l'aperçu comme au PowerPoint : aucun espace de calage, uniquement des x / largeurs calculés. */
  var PG = { fs: 13.5, head: 13, out: 14, note: 12.5, rowH: 19, headH: 20, padT: 7, padB: 7, barX: 8, barW: 3, padL: 20, padR: 12, cellGap: 8, colGap: 16, noteLh: 1.2 };
  function ceilHalf(v) { return Math.ceil(v * 2) / 2; }
  B.priceGridSize = function (pr, w) {
    if (!pr || pr.kind !== 'grid' || !pr.rows.length) return { h: 0, w: 0, actualW: 0, cols: 0, rows: 0 };
    var P = CSE.pricing, n = pr.rows.length, S = M().SAFETY;
    var labelW = ceilHalf(pr.rows.reduce(function (m, r) { return Math.max(m, M().width(String(r.label || ''), PG.fs, true)); }, 0) * S + 1);
    var amountW = ceilHalf(pr.rows.reduce(function (m, r) { return Math.max(m, M().width(P.money(r.price), PG.fs, true)); }, 0) * S + 1);
    var cellW = labelW + PG.cellGap + amountW;
    var outside = pr.outside !== null && pr.outside !== undefined ? 'Extérieur : ' + P.money(pr.outside) : '';
    var outW = outside ? ceilHalf(M().width(outside, PG.out, true) * S + 2) : 0;
    var maxW = w || 1120;
    var cols = Math.min(4, n);
    function gridWidth(c, cw) { return c * cw + (c - 1) * PG.colGap; }
    while (cols > 2 && PG.padL + gridWidth(cols, cellW) + PG.padR > maxW) cols--;
    var rows = Math.ceil(n / cols), lastCount = n - (rows - 1) * cols;
    // « Extérieur » sur la dernière ligne quand elle laisse au moins deux colonnes libres (cas 4 / 4 / 2).
    var outsideOnLastRow = !!outside && rows > 1 && cols - lastCount >= 2;
    if (outsideOnLastRow) {
      var free = cols - lastCount, room = free * cellW + (free - 1) * PG.colGap;
      if (outW > room - 6) cellW = Math.max(cellW, (outW + 6 - (free - 1) * PG.colGap) / free);
    }
    var gridW = gridWidth(cols, cellW);
    var head = 'Tarifs CSE' + (pr.label ? ' · ' + pr.label : '');
    var headW = ceilHalf(M().width(head, PG.head, true) * S + 2);
    var notes = String(pr.notes || '').trim();
    var noteW = notes ? ceilHalf(M().width(notes, PG.note, true) * S + 2) : 0;
    var headRight = !outsideOnLastRow && outside ? outW : 0; // « Extérieur » en tête quand la dernière ligne est pleine
    var innerW = Math.max(gridW, headW + (headRight ? headRight + 18 : 0));
    var limit = maxW - PG.padL - PG.padR;
    var colGap = PG.colGap, need = headW + 18 + noteW;
    var noteInline = !!notes && !headRight && need <= Math.min(limit, Math.max(innerW, gridW * 1.35));
    if (noteInline && need > gridW && cols > 1) {
      // La grille s'élargit (espaces entre colonnes) pour que le supplément tienne sur la ligne de titre :
      // son bord droit et celui des montants restent alignés.
      colGap = (need - cols * cellW) / (cols - 1);
      gridW = need;
    }
    if (noteInline) innerW = Math.max(innerW, need, gridW);
    innerW = Math.min(innerW, limit);
    var noteLines = 0, noteH = 0;
    if (notes && !noteInline) {
      noteLines = M().countLines(M().toParas(notes), innerW - 4, PG.note);
      noteH = noteLines * PG.note * PG.noteLh + 14;
    }
    var h = PG.padT + PG.headH + rows * PG.rowH + PG.padB + noteH;
    return { h: h, w: PG.padL + innerW + PG.padR, actualW: PG.padL + innerW + PG.padR, cols: cols, rows: rows, labelW: labelW, amountW: amountW, cellW: cellW,
      gridW: gridW, innerW: innerW, colGap: colGap, outside: outside, outW: outW, outsideOnLastRow: outsideOnLastRow, headRight: headRight,
      head: head, headW: headW, notes: notes, noteInline: noteInline, noteW: noteW, noteLines: noteLines, noteH: noteH, lastCount: lastCount };
  };
  /** Dessine le cartouche ; mémorise la géométrie (x des colonnes, bords droits des montants) pour les contrôles. */
  B.priceGrid = function (pr, x, y, w) {
    var P = CSE.pricing, g = this.priceGridSize(pr, w);
    if (!g.h) return 0;
    var self = this, bw = g.w, gx = x + PG.padL, top = y + PG.padT + PG.headH;
    this.rect(x, y, bw, g.h, { fill: C.priceBg, stroke: C.priceBorder, r: 7 });
    // Filet violet intérieur : marges haute et basse identiques (8 px), sans toucher la bordure.
    this.rect(x + PG.barX, y + 8, PG.barW, g.h - 16, { fill: C.purple, r: 1.5 });
    var headRoom = g.innerW - (g.headRight ? g.headRight + 18 : g.noteInline ? g.noteW + 18 : 0);
    this.text(g.head, gx, y + PG.padT, Math.min(g.headW, headRoom), PG.headH - 2,
      { size: PG.head, min: 11, bold: true, color: C.purple, valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    var right = gx + g.innerW;
    if (g.headRight) this.text(g.outside, right - g.outW, y + PG.padT, g.outW, PG.headH - 2,
      { size: PG.out, min: 12, bold: true, color: C.dark, align: 'right', valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    if (g.noteInline) this.text(g.notes, right - g.noteW, y + PG.padT, g.noteW, PG.headH - 2,
      { size: PG.note, min: 11, bold: true, color: C.muted, align: 'right', valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'notes tarifs' });
    var colX = [], amountRight = [];
    for (var c = 0; c < g.cols; c++) { colX.push(gx + c * (g.cellW + g.colGap)); amountRight.push(gx + c * (g.cellW + g.colGap) + g.cellW); }
    pr.rows.forEach(function (r, i) {
      var row = Math.floor(i / g.cols), col = i % g.cols, cy = top + row * PG.rowH;
      self.text(String(r.label || ''), colX[col], cy, g.labelW, PG.rowH, { size: PG.fs, min: 11, bold: true, color: C.purple, valign: 'middle', align: 'left', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
      self.text(P.money(r.price), amountRight[col] - g.amountW, cy, g.amountW, PG.rowH, { size: PG.fs, min: 11, bold: true, color: C.dark, valign: 'middle', align: 'right', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    });
    if (g.outsideOnLastRow) {
      var oy = top + (g.rows - 1) * PG.rowH, ox = colX[g.lastCount];
      this.text(g.outside, ox, oy, amountRight[g.cols - 1] - ox, PG.rowH,
        { size: PG.out, min: 12, bold: true, color: C.dark, align: 'right', valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    }
    if (g.noteH) {
      var ny = top + g.rows * PG.rowH + 4;
      this.rect(gx - 6, ny, g.innerW + 10, g.noteH - 6, { fill: C.lilac, r: 4 });
      this.text(g.notes, gx, ny + 4, g.innerW, g.noteH - 14,
        { size: PG.note, min: 11, color: C.dark, maxLines: g.noteLines, role: 'label', noScale: true, field: 'notes tarifs' });
    }
    this.priceGeometry = { x: x, y: y, w: bw, h: g.h, colX: colX, amountRight: amountRight, rows: g.rows, cols: g.cols, barY: y + 8, barH: g.h - 16 };
    return g.h;
  };

  /* ---------- Informations pratiques ---------- */
  var INFO = { label: 12.5, value: 15.5, padX: 12, padY: 7, gap: 10, maxCard: 300 };
  /** Informations pratiques : liste compacte (libellé + valeur), hauteur ajustée au contenu. */
  B.infoRowHeight = function (r, w) {
    var lines = Math.min(3, M().countLines(M().toParas(r.value, { bold: true }), w - 2 * INFO.padX, INFO.value));
    return INFO.padY + 15 + 2 + lines * INFO.value * 1.2 + INFO.padY;
  };
  B.infoPanelSize = function (rows, w) {
    var self = this;
    return rows.reduce(function (h, r) { return h + self.infoRowHeight(r, w); }, 0) + 8;
  };
  /** Panneau vertical ; hFill étire légèrement les lignes pour occuper la hauteur disponible. */
  B.infoPanel = function (rows, x, y, w, hFill) {
    if (!rows.length) return 0;
    var self = this, h = this.infoPanelSize(rows, w), extra = hFill && hFill > h ? Math.min(14, (hFill - h) / rows.length) : 0, cy = y + 4;
    h += extra * rows.length;
    this.rect(x, y, w, h, { fill: C.lighter, stroke: C.border, r: 10 });
    rows.forEach(function (r, i) {
      var base = self.infoRowHeight(r, w), rh = base + extra;
      if (i) self.rect(x + INFO.padX, cy, w - 2 * INFO.padX, 1, { fill: C.border });
      self.text(r.label, x + INFO.padX, cy + INFO.padY + extra / 2, w - 2 * INFO.padX, 15, { size: INFO.label, min: 11, bold: true, color: C.muted, upper: true, maxLines: 1, role: 'label', noScale: true });
      self.text(r.value, x + INFO.padX, cy + INFO.padY + 17 + extra / 2, w - 2 * INFO.padX, base - INFO.padY * 2 - 17, { size: INFO.value, min: 13, bold: true, color: r.color || C.navy, maxLines: 3, field: r.label, noScale: true, role: 'label', important: false });
      cy += rh;
    });
    return h;
  };
  /** Cartes d'informations en grille : à côté du cartouche tarifaire ou en bande basse. */
  /** Valeur d'une carte : forme courte (ex. date sans le jour) si la forme complète ne tient pas sur une ligne. */
  function cardValue(r, cw) {
    if (!r.short) return r.value;
    return M().countLines(M().toParas(r.value, { bold: true }), cw - 2 * INFO.padX, INFO.value) > 1 ? r.short : r.value;
  }
  B.infoGridSize = function (rows, w, maxCols) {
    if (!rows || !rows.length) return { h: 0, cols: 0, rowH: [] };
    var n = rows.length, best = null;
    for (var cols = Math.min(maxCols || 5, n); cols >= 1; cols--) {
      var cw = Math.min(INFO.maxCard, (w - INFO.gap * (cols - 1)) / cols);
      if (cw < 150 && cols > 1) continue;
      var lines = rows.map(function (r) { return M().countLines(M().toParas(cardValue(r, cw), { bold: true }), cw - 2 * INFO.padX, INFO.value); });
      var fits = lines.every(function (l) { return l <= 2; });
      var nr = Math.ceil(n / cols), rowH = [];
      for (var k = 0; k < nr; k++) rowH.push(INFO.padY * 2 + 17 + Math.min(2, Math.max.apply(null, lines.slice(k * cols, k * cols + cols))) * INFO.value * 1.2);
      var h = rowH.reduce(function (a, b) { return a + b; }, 0) + INFO.gap * (nr - 1);
      var cand = { h: h, cols: cols, cw: cw, rowH: rowH, fits: fits };
      if (!best || (fits && !best.fits) || (fits === best.fits && h < best.h - 0.5)) best = cand;
    }
    return best;
  };
  B.infoGrid = function (rows, x, y, w, maxCols, hFill) {
    var g = this.infoGridSize(rows, w, maxCols);
    if (!g.h) return 0;
    var self = this, cy = y, nr = g.rowH.length;
    var extra = hFill && hFill > g.h ? (hFill - g.h) / nr : 0;
    for (var k = 0; k < nr; k++) {
      var base = g.rowH[k], rh = base + extra;
      rows.slice(k * g.cols, k * g.cols + g.cols).forEach(function (r, i) {
        var cx = x + i * (g.cw + INFO.gap);
        self.rect(cx, cy, g.cw, rh, { fill: C.lighter, stroke: C.border, r: 9 });
        self.text(r.label, cx + INFO.padX, cy + INFO.padY + extra / 2, g.cw - 2 * INFO.padX, 15, { size: INFO.label, min: 11, bold: true, color: C.muted, upper: true, maxLines: 1, role: 'label', noScale: true });
        self.text(cardValue(r, g.cw), cx + INFO.padX, cy + INFO.padY + 17 + extra / 2, g.cw - 2 * INFO.padX, base - INFO.padY * 2 - 17, { size: INFO.value, min: 13, bold: true, color: r.color || C.navy, maxLines: 2, field: r.label, noScale: true, role: 'label', important: false });
      });
      cy += rh + INFO.gap;
    }
    return g.h + extra * nr;
  };
  /** Variante horizontale historique (1 ou 2 informations), conservée pour compatibilité. */
  B.infoStrip = function (rows, x, y, w, opts) {
    if (!rows.length) return 0;
    opts = opts || {};
    var cols = rows.length;
    var cw = opts.stretch ? w : Math.min(w, cols * (cols === 1 ? 360 : 420) + (cols - 1) * INFO.gap);
    return this.infoGrid(rows, x, y, cw, cols);
  };
  /** Ligne de prix compacte (modèles immersif, affiche, animation). */
  B.priceLine = function (pr) {
    var P = CSE.pricing;
    if (!pr || !pr.rows.length) return '';
    if (pr.kind === 'single') return pr.rows[0].label + ' : ' + P.money(pr.rows[0].price) + (pr.outside !== null ? ' · Extérieur : ' + P.money(pr.outside) : '');
    var min = pr.rows[0].price, max = pr.rows[pr.rows.length - 1].price;
    return 'De ' + P.money(min) + ' (' + pr.rows[0].label + ') à ' + P.money(max) + ' (' + pr.rows[pr.rows.length - 1].label + ')' + (pr.outside !== null ? ' · Extérieur : ' + P.money(pr.outside) : '');
  };
  B.result = function (extra) {
    var out = { width: W, height: H, items: this.items, warnings: dedupe(this.warnings), overflow: this.overflows.length > 0, minBody: this.minBody === Infinity ? null : this.minBody };
    if (this.priceGeometry) out.priceGeometry = this.priceGeometry;
    return Object.assign(out, extra || {});
  };

  /* ---------- Contrôles géométriques (V10) ----------
   * Vérifie une diapositive calculée : éléments hors du cadre 16:9, textes qui se chevauchent,
   * police du corps sous le seuil, images non intégrables. Renvoie une liste d'alertes. */
  function inkBox(it) {
    var Mx = M(), paras = it.paras || [];
    var lines = Mx.countLines(paras, it.w, it.size), ih = Math.min(it.h, lines * it.size * (it.lh || Mx.LINE_HEIGHT));
    var iw = Math.min(it.w, Mx.maxLineWidth(paras, it.size));
    var x = it.align === 'right' ? it.x + it.w - iw : it.align === 'center' ? it.x + (it.w - iw) / 2 : it.x;
    var y = it.valign === 'middle' ? it.y + (it.h - ih) / 2 : it.y;
    return { x: x, y: y, w: iw, h: ih };
  }
  function auditSlide(slide) {
    var out = [], texts = [];
    (slide.items || []).forEach(function (it) {
      if (it.role === 'banner') return;
      if (it.x < -0.5 || it.y < -0.5 || it.x + it.w > W + 0.5 || it.y + it.h > H + 0.5) out.push({ level: 'warn', code: 'bounds', msg: 'Élément hors du cadre de la diapositive (' + (it.field || it.t) + ').' });
      if (it.t === 'text' && it.paras && it.paras.length && !it.layer) texts.push({ it: it, box: inkBox(it) });
    });
    for (var i = 0; i < texts.length; i++) for (var j = i + 1; j < texts.length; j++) {
      var a = texts[i].box, b = texts[j].box;
      var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 2 && oy > 2) out.push({ level: 'warn', code: 'overlap', msg: 'Textes superposés : « ' + (texts[i].it.field || 'texte') + ' » et « ' + (texts[j].it.field || 'texte') + ' ».' });
    }
    return out;
  }
  B.audit = function () { return auditSlide({ items: this.items }); };
  function dedupe(list) {
    var seen = {};
    return list.filter(function (w) { var k = w.level + w.msg; if (seen[k]) return false; seen[k] = 1; return true; });
  }

  /* ---------- Couleurs ---------- */
  function hexToRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [47, 93, 168]; var n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbToHex(r) { return '#' + r.map(function (v) { return ('0' + Math.round(Math.max(0, Math.min(255, v))).toString(16)).slice(-2); }).join('').toUpperCase(); }
  /** Mélange avec du blanc (k = part de couleur conservée). */
  function tint(h, k) { var c = hexToRgb(h); return rgbToHex(c.map(function (v) { return 255 - (255 - v) * k; })); }
  function shade(h, k) { var c = hexToRgb(h); return rgbToHex(c.map(function (v) { return v * (1 - k); })); }

  return { W: W, H: H, BANNER_H: BANNER_H, C: C, MIN: MIN, PT: PT, T: T, PG: PG, Builder: Builder, tint: tint, shade: shade, auditSlide: auditSlide, inkBox: inkBox, imageStatus: imageStatus, photoMeta: photoMeta };
});
