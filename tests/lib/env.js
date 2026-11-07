/* Chargement des modules CSE Studio dans Node (tests). Option : canvas Node pour tester les images. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..', '..');
const CORE = ['js/core/dates.js', 'js/pricing.js', 'js/engine/metrics.js', 'js/core/model.js', 'js/core/compose.js', 'js/engine/icons.js', 'js/engine/layout.js',
  'js/engine/templates.js', 'js/core/migrate.js', 'js/core/demo.js'];
function load(extra) {
  for (const f of CORE.concat(extra || [])) {
    const file = path.join(ROOT, f);
    if (fs.existsSync(file)) vm.runInThisContext(fs.readFileSync(file, 'utf8'), { filename: file });
  }
  return globalThis.CSE;
}
/** Charge JSZip + PptxGenJS (vendor) et le module d'export, avec le bandeau embarqué. */
function loadExport(canvasModulePath) {
  globalThis.window = globalThis.window || undefined;
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'vendor/jszip.min.js'), 'utf8'));
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'vendor/pptxgen.min.js'), 'utf8') + ';globalThis.PptxGenJS=PptxGenJS;', { importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER });
  globalThis.CSE_BANNER_DATA = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'assets/bandeau-cse.jpg')).toString('base64');
  const CSE = load(['js/export/pptx.js']);
  CSE.env = { node: true };
  // En Node, le navigateur/canvas n'est pas disponible. Fournir un adaptateur
  // pour embarquer les véritables photos dans les PowerPoint de test et démo.
  // Sharp est facultatif : les JPEG/PNG d'origine restent intégrables sans lui.
  CSE.env.prepareImage = async (src, w, h, fit) => {
    let buf, mime;
    if (/^data:image\/(jpeg|png|webp);base64,/i.test(src)) {
      mime = src.match(/^data:image\/([^;]+)/i)[1].toLowerCase();
      buf = Buffer.from(src.split(',')[1], 'base64');
    } else if (!/^[a-z]+:/i.test(src)) {
      const local = path.resolve(ROOT, src.replace(/^\//, ''));
      if (!local.startsWith(ROOT + path.sep) || !fs.existsSync(local)) throw Error('Photo locale introuvable : ' + src);
      buf = fs.readFileSync(local);
      mime = /\.png$/i.test(local) ? 'png' : /\.webp$/i.test(local) ? 'webp' : 'jpeg';
    } else throw Error('URL non disponible dans le générateur local : ' + src);

    let sharp;
    try { sharp = require('sharp'); } catch (_) { sharp = null; }
    if (sharp) {
      const scale = Math.min(2, Math.max(1, 1600 / Math.max(w, h)));
      const width = Math.max(1, Math.round(w * scale)), height = Math.max(1, Math.round(h * scale));
      const ff = fit === 'contain' ? 'contain' : fit === 'stretch' ? 'fill' : 'cover';
      const transparent = mime === 'png' && fit !== 'stretch';
      const result = await sharp(buf).rotate().resize(width, height,
        { fit: ff, background: transparent ? {r:255,g:255,b:255,alpha:0} : {r:255,g:255,b:255,alpha:1} });
      if (transparent) { buf = await result.png().toBuffer(); mime = 'png'; }
      else { buf = await result.jpeg({quality:90}).toBuffer(); mime = 'jpeg'; }
    } else if (mime !== 'jpeg' && mime !== 'png') {
      throw Error('Format non convertible sans Sharp : ' + mime);
    }
    return 'data:image/' + mime + ';base64,' + buf.toString('base64');
  };
  if (canvasModulePath) {
    // Canvas Node disponible : même recadrage que le navigateur (cover / contain / point focal).
    delete CSE.env.prepareImage;
    const cv = require(canvasModulePath);
    CSE.env.createCanvas = (w, h) => cv.createCanvas(w, h);
    CSE.env.loadImage = (src) => cv.loadImage(src);
    globalThis.document = { createElement: (t) => (t === 'canvas' ? cv.createCanvas(300, 150) : {}) };
  }
  // Images « img:… » stockées en mémoire.
  const mem = {};
  CSE.images = { url: (r) => mem[r] || '', put: (id, d) => { mem[id] = d; } };
  return CSE;
}
module.exports = { ROOT, load, loadExport };
