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
  /** Indique précisément comment récupérer une photographie manquante.
   *  Un export incomplet ne doit jamais être présenté comme réussi. */
  function imageFailure(src, title, cause) {
    var source = String(src || '');
    var advice = /^https?:/i.test(source)
      ? 'Ce site empêche probablement la récupération de son image (CORS). Ouvrez la fiche et importez la photo depuis un fichier JPG/PNG, ou collez une copie réelle de l’image.'
      : /^img:/i.test(source)
        ? 'Cette photo enregistrée localement est introuvable ou illisible. Restaurez-la depuis la sauvegarde JSON ou importez-la à nouveau dans la fiche.'
        : 'La photo est introuvable ou illisible. Vérifiez le chemin ou réimportez le fichier.';
    return Error('Image non intégrable au PowerPoint dans « ' + title + ' ». ' + advice + (cause && cause.message ? ' (' + cause.message + ')' : ''));
  }
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
  function prepareImage(src, w, h, fit, cache, fx, fy) {
    fx = fx === undefined ? 50 : fx; fy = fy === undefined ? 50 : fy;
    var key = src + '|' + Math.round(w) + 'x' + Math.round(h) + '|' + fit + '|' + fx + ',' + fy;
    if (cache[key]) return cache[key];
    var real = resolve(src);
    // Les tests et générateurs exécutés sous Node peuvent fournir un adaptateur image.
    // En navigateur, le recadrage est réalisé dans un canvas sécurisé.
    if (real && CSE.env && typeof CSE.env.prepareImage === 'function') {
      cache[key] = Promise.resolve().then(function () { return CSE.env.prepareImage(real, w, h, fit); });
      return cache[key];
    }
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
        // Point focal (cadrage choisi dans l'éditeur) : même règle que object-position en CSS.
        ctx.drawImage(img, (cw - dw) * fx / 100, (ch - dh) * fy / 100, dw, dh);
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
      if (!list.some(function (r) { return String(r.text).trim().length; })) {
        // Séparation entre blocs : demi-ligne (interligne exact du paragraphe), identique à l'aperçu.
        var gap = CSE.metrics ? CSE.metrics.PARA_GAP : 1;
        runs.push({ text: ' ', options: { breakLine: !last, lineSpacing: Math.round(it.size * (it.lh || 1.2) * gap * PT * 10) / 10 } });
        return;
      }
      list.forEach(function (r, ri) {
        var o = { bold: r.bold === undefined ? !!it.bold : !!(r.bold || it.bold) };
        if (r.color) o.color = hex(r.color);
        var link = r.link || it.link;
        // Ne jamais exporter de schéma de lien exécutable issu d'une sauvegarde importée.
        if (link && (/^mailto:[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}$/i.test(link) || (CSE.compose && CSE.compose.validUrl(link))))
          o.hyperlink = { url: link };
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
    if (it.t === 'path') {
      // Pictogramme : forme libre (custGeom), mêmes points que le SVG de l'aperçu.
      var k = it.w / (it.vb || 24) / PX, pts = [];
      (it.d || []).forEach(function (c) {
        if (c[0] === 'M') pts.push({ x: c[1] * k, y: c[2] * k, moveTo: true });
        else if (c[0] === 'L') pts.push({ x: c[1] * k, y: c[2] * k });
        else if (c[0] === 'Q') pts.push({ x: c[3] * k, y: c[4] * k, curve: { type: 'quadratic', x1: c[1] * k, y1: c[2] * k } });
        else if (c[0] === 'Z') pts.push({ close: true });
      });
      slide.addShape(pptx.ShapeType.custGeom, Object.assign({}, g, { points: pts, fill: { color: hex(it.fill) }, line: { type: 'none' } }));
      return Promise.resolve();
    }
    if (it.t === 'image') {
      if (it.role === 'banner') return Promise.resolve(); // déjà dans le masque
      return prepareImage(it.src, it.w, it.h, it.fit, images, it.fx, it.fy).then(function (data) {
        slide.addImage(Object.assign({}, g, { data: data, altText: it.alt || '' }));
      }).catch(function (err) {
        // Ne PAS remplacer silencieusement une photo par un rectangle gris.
        // L'utilisateur doit pouvoir restaurer la photo avant la diffusion du MEL.
        throw imageFailure(it.src, title, err);
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
      pptx.subject = 'Généré avec CSE Studio V10';
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
  /** Contrôle d'intégrité du fichier produit : nombre de diapositives et de médias réellement
   *  présents dans ppt/media (une photo annoncée doit y figurer, jamais un cadre gris). */
  function verify(data, entries) {
    var expectedImages = 0;
    entries.forEach(function (e) { e.slide.items.forEach(function (it) { if (it.t === 'image' && it.role !== 'banner') expectedImages++; }); });
    if (!G.JSZip) return Promise.resolve({ slides: entries.length, expectedImages: expectedImages, media: null, ok: true });
    return G.JSZip.loadAsync(data).then(function (zip) {
      var names = Object.keys(zip.files);
      var slides = names.filter(function (n) { return /^ppt\/slides\/slide\d+\.xml$/.test(n); }).length;
      var media = names.filter(function (n) { return /^ppt\/media\//.test(n) && !zip.files[n].dir; }).length;
      // + 1 : le bandeau officiel, placé une seule fois dans le masque.
      return { slides: slides, expectedImages: expectedImages, media: media, ok: slides === entries.length && media >= expectedImages + 1 };
    });
  }
  function toBlob(entries, meta) {
    return build(entries, meta).then(function (r) {
      if (typeof Blob === 'undefined' || (CSE.env && CSE.env.node)) return r.pptx.write({ outputType: 'nodebuffer' }).then(function (buf) {
        return verify(buf, entries).then(function (check) { return { buffer: buf, warnings: r.warnings, check: check }; });
      });
      return r.pptx.write({ outputType: 'blob' }).then(function (blob) {
        blob = blob instanceof Blob ? blob : new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        return verify(blob, entries).then(function (check) { return { blob: blob, warnings: r.warnings, check: check }; }, function () { return { blob: blob, warnings: r.warnings, check: null }; });
      });
    });
  }
  return { build: build, toBlob: toBlob, verify: verify, banner: banner, prepareImage: prepareImage, textRuns: textRuns };
});
