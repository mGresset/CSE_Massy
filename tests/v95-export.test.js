/* CSE Studio V9.5 — liens de l’export PPTX et fiabilité des sauvegardes. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { loadExport } = require('./lib/env');
const C = loadExport();

test('V9.5 — le lien mailto d’un référent est conservé dans le PowerPoint', () => {
  const rows = C.pptx.textRuns({t:'text',paras:[{runs:[{text:'Référent CSE',link:'mailto:referent@example.org'}]}]});
  assert.equal(rows[0].options.hyperlink.url, 'mailto:referent@example.org');
});

test('V9.5 — les liens non autorisés sont retirés des PowerPoint', () => {
  const rows = C.pptx.textRuns({t:'text',paras:[{runs:[{text:'Click',link:'javascript:alert(1)'},{text:'Data',link:'data:text/html,<script>'},{text:'Web',link:'https://example.org/'}]}]});
  assert.ok(!rows[0].options.hyperlink);
  assert.ok(!rows[1].options.hyperlink);
  assert.equal(rows[2].options.hyperlink.url,'https://example.org/');
});

test('V9.5 — une sauvegarde signale les images manquantes plutôt que les ignorer', () => {
  // Store peut fonctionner sans localStorage en lecture seule dans ce test.
  require('./lib/env').load(['js/core/store.js']);
  const it=C.model.normalizeItem({type:'activity',title:'Avec photo',photos:['img:absente']});
  const p=C.model.blankProject();p.items=[it];
  C.images.refsOf=()=>['img:absente'];C.images.exportMap=()=>({});
  C.store.set(p,'replace');
  const backup=C.store.backupObject();
  assert.equal(backup.items[0].photos[0],'img:absente');
  assert.equal(backup.backupWarnings.length,1);
});

done('V9.5 — sécurité des liens et sauvegardes');
