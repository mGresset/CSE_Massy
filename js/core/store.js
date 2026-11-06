/* CSE Studio V9 · Persistance locale (localStorage + images IndexedDB), instantanés et corbeille.
 * - Clé principale : cse-studio-massy:v9:project (le JSON du projet, sans les images).
 * - Les anciennes clés V6/V7/V8 sont lues pour la migration et JAMAIS effacées.
 * - Avant toute migration, restauration ou remplacement : instantané automatique (3 derniers conservés). */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {}, root);
  root.CSE = root.CSE || {};
  root.CSE.store = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE, G) {
  'use strict';
  var KEY = 'cse-studio-massy:v9:project';
  var SNAP_KEY = 'cse-studio-massy:v9:snapshots';
  var project = null, timer = 0, listeners = [], lastError = '', migrationReport = null;
  var ls = function () { try { return G.localStorage; } catch (e) { return null; } };

  function emit(kind) { listeners.forEach(function (fn) { try { fn(kind); } catch (e) { console.error(e); } }); }
  function on(fn) { listeners.push(fn); }

  /** Remplace les photos « data:image » par des références IndexedDB « img:… ». */
  function internImages(p) {
    var jobs = [];
    p.items.forEach(function (it) {
      it.photos = it.photos || [];
      it.photos.forEach(function (ph, i) {
        if (/^data:image\//.test(ph)) jobs.push(CSE.images.compress(ph, {}).catch(function () { return ph; }).then(CSE.images.put).then(function (ref) { it.photos[i] = ref; }).catch(function () { /* garde la data URL */ }));
      });
    });
    return Promise.all(jobs).then(function () { return p; });
  }
  function serialize(p) { return JSON.stringify(p); }

  function load() {
    var st = ls();
    var raw = st ? st.getItem(KEY) : null;
    if (raw) {
      try {
        project = CSE.model.normalizeProject(JSON.parse(raw));
        // Projet V9 encore vide alors que des données V6–V8 existent : la migration reste proposée automatiquement.
        var empty = !project.items.length && !project.issues.length && !project.migration && !(project.trash || []).length;
        if (!empty || !legacyPresent().length) return Promise.resolve({ project: project, migrated: false });
      } catch (e) { lastError = 'Sauvegarde locale V9 illisible : ' + e.message + '. Elle est conservée telle quelle sous une clé de secours.'; console.error(e); try { st.setItem(KEY + ':illisible-' + Date.now(), raw); } catch (e2) { /* ignoré */ } }
    }
    var legacy = st ? CSE.migrate.fromLegacyStorage(st) : null;
    if (legacy) {
      project = legacy.project;
      migrationReport = legacy.report;
      return internImages(project).then(function () {
        saveNow();
        snapshot('Résultat de la migration V6/V8 → V9 (les données d’origine restent dans leurs clés)', project, true);
        return { project: project, migrated: true, report: legacy.report };
      });
    }
    project = CSE.model.blankProject();
    return Promise.resolve({ project: project, migrated: false, fresh: true });
  }
  function get() { return project; }
  function set(p, reason) { project = CSE.model.normalizeProject(p); saveNow(); emit(reason || 'replace'); }
  /** Signale une modification : sauvegarde différée et notification des vues. */
  function changed(kind) {
    clearTimeout(timer);
    emit(kind || 'change');
    status('pending');
    timer = setTimeout(saveNow, 250);
  }
  var statusFns = [];
  function onStatus(fn) { statusFns.push(fn); }
  function status(s, msg) { statusFns.forEach(function (fn) { fn(s, msg); }); }
  var volatile = false;
  /** Mode démonstration : rien n'est écrit dans le navigateur. */
  function setVolatile(v) { volatile = !!v; }
  function saveNow() {
    clearTimeout(timer);
    if (volatile) { status('demo'); return true; }
    var st = ls();
    if (!st || !project) return false;
    try {
      st.setItem(KEY, serialize(project));
      status('saved');
      return true;
    } catch (e) {
      lastError = 'Espace de stockage du navigateur saturé : téléchargez une sauvegarde JSON, puis videz la corbeille ou réduisez les images.';
      status('error', lastError);
      return false;
    }
  }
  /* ---------- Instantanés ---------- */
  function snapshots() { try { return JSON.parse((ls() || { getItem: function () { return null; } }).getItem(SNAP_KEY) || '[]'); } catch (e) { return []; } }
  function snapshot(reason, p, silent) {
    var st = ls(); if (!st || volatile) return;
    var list = snapshots();
    list.unshift({ at: new Date().toISOString(), reason: reason, project: JSON.parse(serialize(p || project)) });
    list = list.slice(0, 3);
    try { st.setItem(SNAP_KEY, JSON.stringify(list)); }
    catch (e) {
      try { st.setItem(SNAP_KEY, JSON.stringify(list.slice(0, 1))); } catch (e2) { if (!silent) status('error', 'Instantané impossible (stockage plein).'); }
    }
  }
  function restoreSnapshot(i) {
    var s = snapshots()[i];
    if (!s) return false;
    snapshot('Avant restauration d’un instantané');
    set(s.project, 'replace');
    return true;
  }
  /* ---------- Sauvegarde complète ---------- */
  function backupObject() {
    var refs = CSE.images.refsOf(project);
    return Object.assign({ schema: CSE.model.SCHEMA, app: 'CSE Studio V9', exportedAt: new Date().toISOString() }, JSON.parse(serialize(project)), { images: CSE.images.exportMap(refs) });
  }
  /** Importe une sauvegarde : mode 'merge' (ajout) ou 'replace' (instantané préalable). */
  function importBackup(obj, mode) {
    var r = CSE.migrate.fromBackup(obj, project);
    var imgs = r.images || {};
    return CSE.images.importMap(imgs).then(function (count) {
      snapshot('Avant import (' + (mode === 'replace' ? 'remplacement' : 'fusion') + ')');
      var next;
      if (mode === 'replace' && r.full) next = r.project;
      else if (mode === 'replace') next = Object.assign(CSE.model.blankProject(), { settings: r.project.settings, categories: r.project.categories, items: r.project.items, issues: r.project.issues });
      else next = CSE.migrate.merge(project, r.project);
      next = CSE.model.normalizeProject(next);
      if (!next.activeIssueId && next.issues[0]) next.activeIssueId = next.issues[0].id;
      return internImages(next).then(function () { set(next, 'replace'); r.report.images = count; return r.report; });
    });
  }
  /* ---------- Corbeille ---------- */
  function trashItem(id) {
    var i = project.items.findIndex(function (x) { return x.id === id; });
    if (i < 0) return null;
    var it = project.items.splice(i, 1)[0];
    project.trash = project.trash || [];
    project.trash.unshift({ at: new Date().toISOString(), item: it });
    changed('items');
    return it;
  }
  function restoreTrash(i) {
    var e = (project.trash || [])[i];
    if (!e) return null;
    project.trash.splice(i, 1);
    project.items.push(e.item);
    changed('items');
    return e.item;
  }
  function emptyTrash() { project.trash = []; changed('items'); }
  function legacyPresent() {
    var st = ls(); if (!st) return [];
    return Object.keys(CSE.migrate.KEYS).filter(function (k) { return k !== 'v9' && st.getItem(CSE.migrate.KEYS[k]); }).map(function (k) { return CSE.migrate.KEYS[k]; });
  }
  function legacyDump() {
    var st = ls(), o = { exportedAt: new Date().toISOString(), note: 'Données brutes des versions V6–V8 conservées dans ce navigateur.' };
    legacyPresent().forEach(function (k) { try { o[k] = JSON.parse(st.getItem(k)); } catch (e) { o[k] = st.getItem(k); } });
    return o;
  }
  function storageUsage() {
    var st = ls(), bytes = 0;
    try { for (var i = 0; i < st.length; i++) { var k = st.key(i); bytes += (k.length + (st.getItem(k) || '').length) * 2; } } catch (e) { /* ignoré */ }
    return { localBytes: bytes, images: CSE.images.usage() };
  }
  return { KEY: KEY, setVolatile: setVolatile, isVolatile: function () { return volatile; }, load: load, get: get, set: set, changed: changed, saveNow: saveNow, on: on, onStatus: onStatus, snapshot: snapshot, snapshots: snapshots,
    restoreSnapshot: restoreSnapshot, backupObject: backupObject, importBackup: importBackup, trashItem: trashItem, restoreTrash: restoreTrash, emptyTrash: emptyTrash,
    legacyPresent: legacyPresent, legacyDump: legacyDump, storageUsage: storageUsage, internImages: internImages,
    lastError: function () { return lastError; }, migrationReport: function () { return migrationReport; } };
});
