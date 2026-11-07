/* Synchronisation Supabase (logique) contre un faux serveur PostgREST en mémoire :
 * versions, conflits entre deux bénévoles, rôles, documents partagés. Aucun accès réseau. */
'use strict';
const { assert, test, done } = require('./lib/assert-ext');
const { load } = require('./lib/env');
const C = load(['js/core/cloud-sync.js']);
const M = C.model, S = C.cloudSync;

function fakeServer() {
  const db = { act: [], doc: [] };
  let seq = 0;
  function api(role) {
    return async function (path, opts = {}) {
      const method = opts.method || 'GET';
      const u = new URL('http://x' + path);
      const table = u.pathname.endsWith('cse_activities') ? db.act : db.doc;
      const isAct = table === db.act;
      const idF = (u.searchParams.get('id') || '').replace(/^eq\./, ''), verF = Number((u.searchParams.get('version') || '').replace(/^eq\./, ''));
      const body = opts.body ? JSON.parse(opts.body) : null;
      if (method === 'GET') return JSON.parse(JSON.stringify(table));
      if (method === 'POST') {
        if (isAct && !['editor', 'admin'].includes(role)) throw Error('Création réservée aux rédacteurs');
        if (!isAct && body.kind === 'settings' && role !== 'admin') throw Error('réservé à l’administrateur');
        if (isAct && body.editorial_status === 'approved') throw Error('approbation directe interdite');
        const row = Object.assign({ id: isAct ? 'uuid-' + (++seq) : body.id, version: 1 }, body);
        table.push(row);
        return [row];
      }
      if (method === 'PATCH') {
        const row = table.find((r) => r.id === idF && r.version === verF);
        if (!row) return [];
        if (isAct && role === 'editor' && body.editorial_status === 'approved') throw Error('Approbation réservée');
        if (isAct && role === 'reviewer' && (body.title !== undefined || body.payload !== undefined)) throw Error('Le relecteur ne peut changer que le statut');
        Object.assign(row, body); row.version++;
        return [JSON.parse(JSON.stringify(row))];
      }
      throw Error('méthode');
    };
  }
  return { db, api };
}
function project(titles) {
  const p = M.blankProject();
  p.items = titles.map((t) => M.normalizeItem({ type: 'activity', title: t, dateStart: '2026-12-01' }));
  const is = M.blankIssue('2026-11-09'); is.pages = p.items.map((it) => M.blankPage('item', { itemId: it.id })); p.issues = [is];
  return p;
}
(async () => {
  const srv = fakeServer();
  const A = project(['Karting', 'Concert']);
  A.items[1].editorialStatus = 'approved';
  const r1 = await S.syncItems(A, srv.api('editor'), { role: 'editor' });
  const d1 = await S.syncDocs(A, srv.api('editor'), { role: 'editor' });
  test('premier envoi par un rédacteur', () => {
    assert.equal(r1.created, 2); assert.equal(srv.db.act.length, 2);
    assert.equal(srv.db.act.find((r) => r.title === 'Concert').editorial_status, 'review', 'un rédacteur ne peut pas approuver');
    assert.equal(d1.pushed, 1, 'MEL partagé, paramètres réservés à l’administrateur');
    assert.ok(srv.db.doc.every((d) => d.kind === 'issue'));
  });
  const B = M.blankProject();
  await S.syncItems(B, srv.api('editor'), { role: 'editor' });
  await S.syncDocs(B, srv.api('editor'), { role: 'editor' });
  test('second bénévole : réception des fiches et du MEL, références intactes', () => {
    assert.equal(B.items.length, 2);
    assert.equal(B.issues.length, 1);
    assert.ok(B.issues[0].pages.every((pg) => B.items.some((it) => it.id === pg.itemId)));
  });
  // B modifie Karting et synchronise ; A modifie aussi Karting localement.
  B.items.find((i) => i.title === 'Karting').summary = 'Version B';
  const rb = await S.syncItems(B, srv.api('editor'), { role: 'editor' });
  A.items.find((i) => i.title === 'Karting').summary = 'Version A';
  const ra = await S.syncItems(A, srv.api('editor'), { role: 'editor' });
  test('conflit : rien n’est écrasé, la version locale est conservée en copie', () => {
    assert.equal(rb.pushed, 1);
    assert.deepEqual(ra.conflicts, ['Karting']);
    assert.equal(A.items.find((i) => i.title === 'Karting').summary, 'Version B', 'version en ligne reprise');
    const copy = A.items.find((i) => /version locale en conflit/.test(i.title));
    assert.ok(copy && copy.summary === 'Version A', 'version locale conservée');
    assert.equal(srv.db.act.find((r) => r.title === 'Karting').payload.summary, 'Version B');
  });
  // Relecteur : approuve sans modifier le contenu.
  const R = M.blankProject();
  await S.syncItems(R, srv.api('reviewer'), { role: 'reviewer' });
  R.items.find((i) => i.title === 'Concert').editorialStatus = 'approved';
  const rr = await S.syncItems(R, srv.api('reviewer'), { role: 'reviewer' });
  R.items.find((i) => i.title === 'Concert').summary = 'Changement interdit';
  const rr2 = await S.syncItems(R, srv.api('reviewer'), { role: 'reviewer' });
  test('relecteur : approbation seule', () => {
    assert.equal(rr.pushed, 1);
    assert.equal(srv.db.act.find((r) => r.title === 'Concert').editorial_status, 'approved');
    assert.equal(rr2.errors.length, 1, 'modification de contenu refusée localement');
  });
  // Suppression en ligne : la fiche locale est conservée (détachée), jamais effacée.
  srv.db.act.splice(srv.db.act.findIndex((r) => r.title === 'Concert'), 1);
  const ro = await S.syncItems(B, srv.api('editor'), { role: 'editor' });
  test('fiche supprimée en ligne : conservée localement', () => {
    assert.equal(ro.orphaned, 1);
    assert.ok(B.items.some((i) => i.title === 'Concert'));
    assert.equal(ro.created, 0, 'pas de recréation automatique en ligne');
    assert.ok(!srv.db.act.some((r) => r.title === 'Concert'));
  });
  // Modification faite PENDANT l'envoi : elle ne doit pas être marquée comme synchronisée.
  const srv2 = fakeServer();
  const E = project(['Atelier']);
  await S.syncItems(E, srv2.api('editor'), { role: 'editor' });
  const slow = (fn) => async (path, opts) => { const r = await fn(path, opts); if (opts && opts.method === 'PATCH') E.items[0].summary = 'Saisi pendant la synchronisation'; return r; };
  E.items[0].summary = 'Version 1';
  const ref = E.items[0];
  await S.syncItems(E, slow(srv2.api('editor')), { role: 'editor' });
  test('modification concurrente pendant l’envoi : conservée et renvoyée ensuite', () => {
    assert.equal(srv2.db.act[0].payload.summary, 'Version 1');
    assert.notEqual(S.itemHash(E.items[0]), E.items[0].cloud.hash, 'reste « à envoyer »');
  });
  await S.syncItems(E, srv2.api('editor'), { role: 'editor' });
  test('… puis envoyée à la synchronisation suivante, sans changer d’objet', () => {
    assert.equal(srv2.db.act[0].payload.summary, 'Saisi pendant la synchronisation');
    assert.equal(S.itemHash(E.items[0]), E.items[0].cloud.hash);
    assert.ok(E.items[0] === ref, 'la fiche ouverte dans l’éditeur reste la même');
  });
  // Mise à jour reçue d'un autre bénévole : remplacement en place (référence conservée).
  const F = M.blankProject();
  await S.syncItems(F, srv2.api('editor'), { role: 'editor' });
  const opened = F.items[0];
  srv2.db.act[0].payload.summary = 'Modifié ailleurs'; srv2.db.act[0].version++;
  await S.syncItems(F, srv2.api('editor'), { role: 'editor' });
  test('mise à jour distante appliquée en place', () => {
    assert.ok(F.items[0] === opened); assert.equal(opened.summary, 'Modifié ailleurs');
  });
  done('synchronisation Supabase (faux serveur)');
})().catch((e) => { console.error(e); process.exit(1); });
