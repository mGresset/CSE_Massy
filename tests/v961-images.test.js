/* V9.6.1 — les images doivent être intégrées, jamais remplacées silencieusement par du gris. */
'use strict';
const fs = require('fs'), path = require('path');
const { assert, test, done } = require('./lib/assert-ext');
const { loadExport, ROOT } = require('./lib/env');
const C = loadExport();
const JSZip = globalThis.JSZip;
const imageFile = path.join(ROOT, 'assets/sri-lanka.jpg');
const importedPhoto = 'img:photo-importee';
C.images.put(importedPhoto, 'data:image/jpeg;base64,' + fs.readFileSync(imageFile).toString('base64'));

function itemWith(src) {
  const p = C.model.blankProject();
  p.items = [C.model.normalizeItem({id:'photo1',type:'activity',title:'Circuit image',dateStart:'2027-04-03', photos:[src],
    description:'Découverte et visites guidées.'})];
  const pg = C.model.blankPage('item',{itemId:'photo1',template:'classic'});
  return {slide:C.templates.renderPage(pg,p,C.model.blankIssue('2027-01-02'))[0], title:'Circuit image'};
}
(async () => {
  const one = itemWith('assets/sri-lanka.jpg');
  const two = itemWith(importedPhoto);
  const res = await C.pptx.toBlob([one,two],{title:'Deux photos incluses'});
  const zip = await JSZip.loadAsync(res.buffer);
  const media = Object.keys(zip.files).filter(f=>/^ppt\/media\/.*\.(jpeg|jpg|png)$/i.test(f));
  test('PPTX contient des médias réels au-delà du bandeau',()=>{
    assert.ok(media.length >= 3, 'bandeau + photo locale + image importée');
    assert.ok(res.buffer.length > 100000);
    assert.deepEqual(res.warnings,[]);
  });
  const all = await Promise.all(media.map(f=>zip.file(f).async('nodebuffer')));
  test('les photos sont des images réelles non des rectangles gris',()=>{
    assert.ok(all.filter(b=>b.length>5000).length>=3);
    assert.ok(all.some(b=>b.includes(Buffer.from('JFIF'))));
  });
  let err=null;
  try { await C.pptx.toBlob([itemWith('img:introuvable')],{}); } catch(e) {err=e;}
  test('photo manquante = erreur claire, pas de PPTX incomplet',()=>{
    assert.ok(err);
    assert.match(err.message,/Image non intégrable/);
    assert.match(err.message,/Restaurez-la|importez-la/);
  });
  err=null;
  try { await C.pptx.toBlob([itemWith('https://source.exemple.org/photo.jpg')],{}); } catch(e) {err=e;}
  test('image externe inaccessible = message CORS et action utilisateur',()=>{
    assert.ok(err);
    assert.match(err.message,/CORS/);
    assert.match(err.message,/JPG\/PNG/);
  });
  done('V9.6.1 — photos réellement embarquées, absence de cadre gris silencieux');
})().catch(e=>{console.error(e);process.exit(1);});
