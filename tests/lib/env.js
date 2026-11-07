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
  if (canvasModulePath) {
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
