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
    border: '#D7E0EE', white: '#FFFFFF', yellow: '#FFD43B', lilac: '#F1ECFD', dark: '#15295A'
  };
  /* Seuils de lisibilité (px de diapositive ; 1 px = 0,8 pt dans PowerPoint). */
  var MIN = { body: 14, compactBody: 12.5, small: 11, title: 22 };
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
    var it = { t: 'image', x: x, y: y, w: w, h: h, src: src, fit: o.fit || 'cover', role: o.role || 'photo' };
    this.items.push(it);
    return it;
  };
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
    if (o.note) this.text(o.note, 40, 649, 900, 22, { size: 12, min: 10, color: '#E6EBFA', role: 'label', noScale: true, maxLines: 1, field: 'note de bas de page', important: false });
    var link = o.link || '';
    if (link && o.cta !== false) {
      var label = String(o.ctaLabel || 'Plus d’infos').trim() || 'Plus d’infos';
      var bw = Math.min(260, Math.max(150, M().width(label, 16, true) * 1.08 + 44));
      this.rect(right - bw, 600, bw, 36, { fill: C.navy, r: 18 });
      this.text(label + ' →', right - bw + 10, 600, bw - 20, 36, { size: 16, min: 12, bold: true, color: C.white, align: 'center', valign: 'middle', link: link, maxLines: 1, role: 'label', noScale: true, field: 'bouton' });
      right = right - bw - 16;
    }
    if (o.contact) {
      this.text([{ runs: [{ text: 'Contact : ', bold: true }].concat(o.contactRuns || [{ text: o.contact, bold: false }]) }], 40, 602, right - 40, 34,
        { size: 15, min: 11, color: C.purple, valign: 'middle', maxLines: 2, field: 'contacts', role: 'label', noScale: true, important: false });
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
  /** Pastille ronde « NEW ! » (vert) ou « Dernière chance » (jaune), légèrement inclinée. */
  B.badge = function (kind, x, y, d) {
    d = d || 92;
    if (kind === 'new') {
      this.ellipse(x, y, d, d, { fill: '#2FB344', stroke: C.white, sw: 3, rot: -12 });
      this.text('NEW !', x, y, d, d, { size: d * 0.26, min: 10, bold: true, color: C.white, align: 'center', valign: 'middle', rot: -12, maxLines: 1, role: 'deco', noScale: true });
    } else if (kind === 'last') {
      this.ellipse(x, y, d, d, { fill: C.yellow, stroke: C.white, sw: 3, rot: -12 });
      this.text('DERNIÈRE\nCHANCE !', x + 4, y, d - 8, d, { size: d * 0.17, min: 9, bold: true, color: '#7A1F00', align: 'center', valign: 'middle', rot: -12, role: 'deco', noScale: true });
    }
  };
  /** Pastille de texte (J−3, CODE…). Renvoie la largeur utilisée. */
  B.pill = function (text, x, y, o) {
    o = o || {};
    var size = o.size || 15, h = o.h || size + 14;
    var w = o.w || Math.min(o.maxW || 500, M().width(text, size, o.bold !== false) * 1.06 + 26);
    var px = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    this.rect(px, y, w, h, { fill: o.fill || C.navy, stroke: o.stroke, r: o.r !== undefined ? o.r : h / 2 });
    this.text(text, px + 8, y, w - 16, h, { size: size, min: 9, bold: o.bold !== false, color: o.color || C.white, align: 'center', valign: 'middle', maxLines: 1, role: 'label', noScale: true, link: o.link });
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
    if (src) { this.image(src, x, y, w, h, { fit: o.fit || 'cover' }); return true; }
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
  /** Hauteur nécessaire à la grille des tarifs pour une largeur donnée. */
  B.priceGridSize = function (pr, w) {
    if (!pr || pr.kind !== 'grid' || !pr.rows.length) return { h: 0, cols: 0 };
    var cols = w >= 600 ? 5 : w >= 430 ? 4 : 2;
    var rows = Math.ceil(pr.rows.length / cols);
    var h = 40 + rows * 31 + (pr.notes ? 24 : 0) + 8;
    return { h: h, cols: cols, rows: rows };
  };
  B.priceGrid = function (pr, x, y, w) {
    var P = CSE.pricing, g = this.priceGridSize(pr, w);
    if (!g.h) return 0;
    this.rect(x, y, w, g.h, { fill: C.lilac, stroke: '#DCD0F7', r: 12 });
    this.rect(x, y, 6, g.h, { fill: C.purple });
    var head = 'TARIFS CSE' + (pr.label ? ' · ' + pr.label : '');
    var outside = pr.outside !== null && pr.outside !== undefined ? 'Extérieur : ' + P.money(pr.outside) : '';
    var ow = outside ? M().width(outside, 14, true) * 1.06 + 10 : 0;
    this.text(head, x + 18, y + 9, w - 36 - ow, 22, { size: 15, min: 11, bold: true, color: C.purple, maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    if (outside) this.text(outside, x + w - 14 - ow, y + 10, ow, 20, { size: 14, min: 10, bold: true, color: C.muted, align: 'right', maxLines: 1, role: 'label', noScale: true });
    var cw = (w - 30) / g.cols, top = y + 38, self = this;
    pr.rows.forEach(function (r, i) {
      var col = i % g.cols, row = Math.floor(i / g.cols);
      var cx = x + 16 + col * cw, cy = top + row * 31;
      self.rect(cx, cy, cw - 8, 27, { fill: C.white, r: 6 });
      self.text([{ runs: [{ text: r.label + '  ', bold: true, color: C.purple }, { text: P.money(r.price), bold: true }] }], cx + 7, cy, cw - 22, 27,
        { size: 15, min: 11, color: C.dark, valign: 'middle', maxLines: 1, role: 'label', noScale: true, field: 'tarifs' });
    });
    if (pr.notes) this.text(pr.notes, x + 18, y + g.h - 30, w - 36, 22, { size: 13, min: 10, color: C.muted, maxLines: 1, field: 'notes tarifs', noScale: true, important: false });
    return g.h;
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
    return Object.assign(out, extra || {});
  };
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

  return { W: W, H: H, BANNER_H: BANNER_H, C: C, MIN: MIN, Builder: Builder, tint: tint, shade: shade };
});
