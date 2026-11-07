/* CSE Studio V9.2 : régressions de synchronisation avec faux serveur PostgREST.
 * Couvre les deux anomalies V9/V9.1 : premier rattachement d'une fiche + conflits de MEL. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load(['js/core/cloud-sync.js']);
const M = C.model, S = C.cloudSync;

function server() {
  const db = { items: [], docs: [] };
  let seq = 0;
  const api = async (path, options = {}) => {
    const u = new URL('https://fake.example' + path);
    const rows = u.pathname.endsWith('/cse_activities') ? db.items : db.docs;
    const method = options.method || 'GET';
    const body = options.body && JSON.parse(options.body);
    const clone = x => JSON.parse(JSON.stringify(x));
    const targetId = (u.searchParams.get('id') || '').replace(/^eq\./, '');
    const targetVersion = Number((u.searchParams.get('version') || '').replace(/^eq\./, ''));
    if (method === 'GET') return clone(targetId ? rows.filter(r => r.id === targetId) : rows);
    if (method === 'POST') {
      if (rows.some(r => r.id === body.id)) throw Error('Duplicate primary key');
      const row = Object.assign({ id: body.id || `uuid-${++seq}`, version: 1 }, clone(body));
      rows.push(row);
      return [clone(row)];
    }
    if (method === 'PATCH') {
      const row = rows.find(r => r.id === targetId && r.version === targetVersion);
      if (!row) return [];
      Object.assign(row, clone(body));
      row.version++;
      return [clone(row)];
    }
    throw Error(`Unexpected ${method}`);
  };
  return { db, api };
}
const options = { role: 'admin' };
function item(title) {
  return M.normalizeItem({ id: 'fiche-persistant', type: 'activity', title, summary: 'Sur le serveur', dateStart: '2027-02-12' });
}
function issue() {
  const i = M.blankIssue('2027-02-08');
  i.id = 'mel-persistant'; i.title = 'MEL février';
  i.pages = [M.blankPage('cover')];
  return i;
}
function addPage(i) { i.pages.push(M.blankPage('news')); }
(async () => {
  // Duplicates : le même identifiant métier doit rattacher l'enregistrement existant.
  const srv = server();
  const first = M.blankProject(); first.items = [item('Voyage')];
  await S.syncItems(first, srv.api, options);
  const second = M.blankProject(); second.items = [M.normalizeItem(srv.db.items[0].payload)];
  const ref = second.items[0];
  const r1 = await S.syncItems(second, srv.api, options);
  test('premier rattachement d’une fiche : aucun doublon côté navigateur ni serveur', () => {
    assert.equal(second.items.length, 1);
    assert.equal(srv.db.items.length, 1);
    assert.equal(r1.created, 0);
    assert.equal(ref.cloud.id, srv.db.items[0].id);
    assert.equal(second.items[0], ref, 'référence de la fiche ouverte conservée');
  });
  // Premier rattachement avec 2 contenus concurrents -> copie de récupération.
  const diverged = M.blankProject(); diverged.items = [M.normalizeItem(srv.db.items[0].payload)];
  diverged.items[0].summary = 'Changements saisis sur le second ordinateur';
  const r2 = await S.syncItems(diverged, srv.api, options);
  test('premier rattachement divergent : version locale conservée, pas de POST en doublon', () => {
    assert.equal(srv.db.items.length, 1);
    assert.equal(r2.created, 0);
    assert.equal(r2.conflicts.length, 1);
    assert.equal(diverged.items.length, 2);
    assert.equal(diverged.items.find(i => i.id === 'fiche-persistant').summary, 'Sur le serveur');
    assert.ok(diverged.items.find(i => /version locale en conflit/.test(i.title)).summary.includes('second ordinateur'));
  });
  await S.syncItems(diverged, srv.api, options);
  test('rattachement divergent : idempotent à la synchronisation suivante', () => {
    assert.equal(diverged.items.length, 2); assert.equal(srv.db.items.length, 1);
  });

  // Les images de la même photo ne doivent pas être considérées comme un conflit si
  // un poste utilise img:... (IndexedDB) et Supabase une data URL portable.
  const photoServer = server();
  const photoRef = 'img:photo-test';
  const photoData = 'data:image/png;base64,iVBORw0KGgo=';
  const withImage = M.blankProject();
  withImage.items = [item('Voyage photo')];
  withImage.items[0].photos = [photoRef];
  await S.syncItems(withImage, photoServer.api, { role: 'admin', embed: r => r === photoRef ? photoData : '' });
  const photoRestored = M.blankProject();
  photoRestored.items = [M.normalizeItem(photoServer.db.items[0].payload)];
  photoRestored.items[0].photos = [photoRef];
  const rp = await S.syncItems(photoRestored, photoServer.api, { role: 'admin', embed: r => r === photoRef ? photoData : '' });
  test('photos : les références IndexedDB et data URL identiques ne créent pas de faux conflit', () => {
    assert.equal(rp.conflicts.length, 0);
    assert.equal(rp.created, 0);
    assert.equal(photoRestored.items.length, 1);
    assert.equal(photoServer.db.items.length, 1);
  });

  // Deux postes, même MEL synchronisé, puis modifications différentes.
  const sDocs = server();
  const A = M.blankProject(); A.issues = [issue()];
  await S.syncDocs(A, sDocs.api, options);
  const B = M.blankProject();
  await S.syncDocs(B, sDocs.api, options);
  addPage(A.issues[0]);
  await S.syncDocs(A, sDocs.api, options);
  B.issues[0].pages = []; // modification locale qui n’a pas encore été synchronisée
  const r3 = await S.syncDocs(B, sDocs.api, options);
  const conflict = B.issues.find(i => i.cloudConflict && i.cloudConflict.localOnly);
  test('conflit MEL : version locale récupérable dans Composer le MEL', () => {
    assert.equal(r3.conflicts.length, 1);
    assert.equal(r3.savedCopies.length, 1);
    assert.ok(conflict);
    assert.equal(conflict.pages.length, 0);
    assert.equal(B.issues.find(i => i.id === 'mel-persistant').pages.length, 2);
    assert.equal(sDocs.db.docs.filter(d => d.kind === 'issue').length, 1);
  });
  await S.syncDocs(B, sDocs.api, options);
  test('copie de conflit MEL non publiée automatiquement, ni dupliquée', () => {
    assert.equal(sDocs.db.docs.filter(d => d.kind === 'issue').length, 1);
    assert.equal(B.issues.length, 2);
  });
  const persisted = M.normalizeProject(JSON.parse(JSON.stringify(B)));
  test('copie récupérable après sauvegarde et rechargement local', () => {
    assert.ok(persisted.issues.find(i => i.id === conflict.id && i.cloudConflict.localOnly));
    assert.equal(persisted.cloud.docs['issue:mel-persistant'].version, 2);
  });

  // Premier rattachement d'un MEL local dont l'identifiant métier existe déjà en ligne.
  const C2 = M.blankProject(); C2.issues = [issue()];
  C2.issues[0].pages = [];
  const initial = await S.syncDocs(C2, sDocs.api, options);
  test('premier raccordement divergent : aucune suppression silencieuse du MEL local', () => {
    assert.equal(initial.savedCopies.length, 1);
    assert.ok(C2.issues.find(i => i.cloudConflict && i.cloudConflict.localOnly && i.pages.length === 0));
    assert.equal(C2.issues.find(i => i.id === 'mel-persistant').pages.length, 2);
  });

  // Paramètres et catégories : backup local, restaurable, sans publication implicite.
  const sSettings = server();
  const P1 = M.blankProject(); const P2 = M.blankProject();
  await S.syncDocs(P1, sSettings.api, options);
  await S.syncDocs(P2, sSettings.api, options);
  P1.settings.orgName = 'Bureau A';
  await S.syncDocs(P1, sSettings.api, options);
  P2.settings.orgName = 'Bureau B';
  const r4 = await S.syncDocs(P2, sSettings.api, options);
  test('conflit paramètres : version locale conservée dans les sauvegardes de récupération', () => {
    assert.ok(r4.savedCopies.some(x => x.kind === 'settings'));
    assert.equal(P2.settings.orgName, 'Bureau A');
    assert.equal(P2.cloud.settingsBackups[0].settings.orgName, 'Bureau B');
    assert.ok(M.normalizeProject(JSON.parse(JSON.stringify(P2))).cloud.settingsBackups.length);
  });
  done('V9.2 — dédoublonnage et conflits conservés localement');
})().catch(err => { console.error(err); process.exit(1); });
