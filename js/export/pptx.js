/* CSE Studio V9 · Export PowerPoint (PptxGenJS 4, MIT) à partir des mêmes éléments que l'aperçu.
 * - 1 px de diapositive = 1/90 pouce ; police Arial ; taille × 0,8 pt ; interligne exact identique.
 * - Textes en zones de texte modifiables, formes natives, liens cliquables, images séparées.
 * - Le bandeau officiel est placé une seule fois dans le masque (fichier JPEG d'origine, sans recompression). */
(function (root, factory) {
  'use strict';
  root.CSE = root.CSE || {};
  var mod = factory(root.CSE, root);
  root.CSE.pptx = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE, G) {
  'use strict';
  var PX = 90, PT = 0.8;
  var BANNER_SRC = 'assets/bandeau-cse.jpg';
  var bannerData = null;

  function hex(c) { var s = String(c || '#FFFFFF').replace('#', '').toUpperCase(); return /^[0-9A-F]{6}$/.test(s) ? s : 'FFFFFF'; }
  function inch(v) { return Math.round(v / PX * 10000) / 10000; }
  function blobToData(blob) { return new Promise(function (resolve, reject) { var fr = new FileReader(); fr.onload = function () { resolve(fr.result); }; fr.onerror = reject; fr.readAsDataURL(blob); }); }
  function loadScript(src) {
    return new Promise(function (resolve, reject) { var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = function () { reject(Error('Chargement impossible : ' + src)); }; document.head.appendChild(s); });
  }
  /** Bandeau d'origine (1920 × 282) : fetch en HTTP(S), sinon copie embarquée (ouverture locale file://). */
  function banner() {
    if (bannerData) return Promise.resolve(bannerData);
    if (G.CSE_BANNER_DATA) { bannerData = G.CSE_BANNER_DATA; return Promise.resolve(bannerData); }
    var viaFetch = !G.location || G.location.protocol === 'file:' ? Promise.reject(Error('file')) : fetch(BANNER_SRC, { cache: 'force-cache' }).then(function (r) { if (!r.ok) throw Error('HTTP ' + r.status); return r.blob(); }).then(blobToData);
    return viaFetch.catch(function () {
      return loadScript('assets/bandeau-cse.data.js').then(function () { if (!G.CSE_BANNER_DATA) throw Error('Bandeau introuvable'); return G.CSE_BANNER_DATA; });
    }).then(function (d) { bannerData = d; return d; });
  }
  function resolve(src) { return /^img:/.test(src || '') ? (CSE.images ? CSE.images.url(src) : '') : (src || ''); }
  function canvas(w, h) { if (CSE.env && CSE.env.createCanvas) return CSE.env.createCanvas(w, h); var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function loadImage(src) {
    if (CSE.env && CSE.env.loadImage) return CSE.env.loadImage(src);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(Error('Image inaccessible')); };
      img.src = src;
    });
  }
  /** Recadre l'image exactement comme l'aperçu (cover / contain) au format de la zone. */
  function prepareImage(src, w, h, fit, cache) {
    var key = src + '|' + Math.round(w) + 'x' + Math.round(h) + '|' + fit;
    if (cache[key]) return cache[key];
    var real = resolve(src);
    cache[key] = (real ? loadImage(real) : Promise.reject(Error('Image absente'))).then(function (img) {
      var scale = Math.min(2, Math.max(1, 1600 / Math.max(w, h)));
      var cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      var c = canvas(cw, ch);
      var ctx = c.getContext('2d');
      var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      var png = /^data:image\/png/.test(real) || fit === 'contain';
      if (!png) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cw, ch); }
      if (fit === 'stretch') ctx.drawImage(img, 0, 0, cw, ch);
      else {
        var s = fit === 'contain' ? Math.min(cw / iw, ch / ih) : Math.max(cw / iw, ch / ih);
        var dw = iw * s, dh = ih * s;
        ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
      }
      return png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
    });
    return cache[key];
  }
  function textRuns(it) {
    var runs = [];
    it.paras.forEach(function (p, pi) {
      var last = pi === it.paras.length - 1;
      var list = p.runs.filter(function (r) { return String(r.text).length; });
      if (!list.length) { runs.push({ text: ' ', options: { breakLine: !last } }); return; }
      list.forEach(function (r, ri) {
        var o = { bold: r.bold === undefined ? !!it.bold : !!(r.bold || it.bold) };
        if (r.color) o.color = hex(r.color);
        var link = r.link || it.link;
        if (link) o.hyperlink = { url: link };
        if (p.align) o.align = p.align;
        var t = String(r.text);
        if (ri === 0 && p.bullet) t = '• ' + t;
        if (ri === list.length - 1 && !last) o.breakLine = true;
        runs.push({ text: t, options: o });
      });
    });
    return runs;
  }
  function addItem(pptx, slide, it, images, warnings, title) {
    var g = { x: inch(it.x), y: inch(it.y), w: inch(it.w), h: inch(it.h) };
    if (it.rot) g.rotate = it.rot;
    if (it.t === 'rect' || it.t === 'ellipse') {
      var shape = it.t === 'ellipse' ? pptx.ShapeType.ellipse : it.r ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
      var o = Object.assign({}, g, { fill: it.fill ? { color: hex(it.fill) } : { type: 'none' }, line: it.stroke ? { color: hex(it.stroke), width: Math.max(0.5, (it.sw || 1) * 0.75) } : { type: 'none' } });
      if (it.r && it.t === 'rect') o.rectRadius = inch(Math.min(it.r, it.w / 2, it.h / 2));
      slide.addShape(shape, o);
      return Promise.resolve();
    }
    if (it.t === 'image') {
      if (it.role === 'banner') return Promise.resolve(); // déjà dans le masque
      return prepareImage(it.src, it.w, it.h, it.fit, images).then(function (data) {
        slide.addImage(Object.assign({}, g, { data: data }));
      }, function () {
        warnings.push('Image indisponible dans « ' + title + ' » (remplacée par un cadre gris).');
        slide.addShape(pptx.ShapeType.rect, Object.assign({}, g, { fill: { color: 'E9EEF6' }, line: { type: 'none' } }));
      });
    }
    if (it.t === 'text') {
      slide.addText(textRuns(it), Object.assign({}, g, {
        fontFace: 'Arial', fontSize: Math.round(it.size * PT * 10) / 10, color: hex(it.color), bold: !!it.bold,
        align: it.align || 'left', valign: it.valign === 'middle' ? 'middle' : 'top', margin: 0,
        lineSpacing: Math.round(it.size * (it.lh || 1.2) * PT * 10) / 10, paraSpaceBefore: 0, paraSpaceAfter: 0,
        fit: 'none', wrap: true
      }));
    }
    return Promise.resolve();
  }
  /** Construit un fichier PPTX. entries = [{slide: layout, title, notes}] */
  function build(entries, meta) {
    meta = meta || {};
    if (!G.PptxGenJS) return Promise.reject(Error('Bibliothèque PowerPoint absente : vérifier le dossier vendor/.'));
    return banner().then(function (bd) {
      var pptx = new G.PptxGenJS();
      pptx.layout = 'LAYOUT_WIDE';
      pptx.author = meta.author || 'CSE THALES LAS MASSY';
      pptx.company = 'CSE THALES LAS MASSY';
      pptx.title = meta.title || 'MEL du CSE';
      pptx.subject = 'Généré avec CSE Studio V9';
      pptx.lang = 'fr-FR';
      pptx.defineSlideMaster({ title: 'CSE_MEL', background: { color: 'FFFFFF' }, objects: [{ image: { x: 0, y: 0, w: inch(1200), h: inch(CSE.layout.BANNER_H), data: bd } }] });
      var warnings = [], images = {};
      var chain = Promise.resolve();
      entries.forEach(function (e, idx) {
        chain = chain.then(function () {
          var slide = pptx.addSlide({ masterName: 'CSE_MEL' });
          var hasBanner = e.slide.items.some(function (it) { return it.role === 'banner'; });
          if (!hasBanner) slide.background = { color: 'FFFFFF' };
          var seq = Promise.resolve();
          e.slide.items.forEach(function (it) { seq = seq.then(function () { return addItem(pptx, slide, it, images, warnings, e.title || 'diapositive ' + (idx + 1)); }); });
          return seq.then(function () { if (e.notes) slide.addNotes(e.notes); if (meta.onProgress) meta.onProgress(idx + 1, entries.length); });
        });
      });
      return chain.then(function () { return { pptx: pptx, warnings: warnings }; });
    });
  }
  function toBlob(entries, meta) {
    return build(entries, meta).then(function (r) {
      if (typeof Blob === 'undefined' || (CSE.env && CSE.env.node)) return r.pptx.write({ outputType: 'nodebuffer' }).then(function (buf) { return { buffer: buf, warnings: r.warnings }; });
      return r.pptx.write({ outputType: 'blob' }).then(function (blob) {
        return { blob: blob instanceof Blob ? blob : new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), warnings: r.warnings };
      });
    });
  }
  return { build: build, toBlob: toBlob, banner: banner, prepareImage: prepareImage, textRuns: textRuns };
});
