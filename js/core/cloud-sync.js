/* CSE Studio V9.2 · Synchronisation facultative avec Supabase (logique pure, testable sans réseau).
 * Sécurité : la clé publique (publishable/anon) ne donne aucun droit à elle seule ; les autorisations
 * sont appliquées côté serveur par la RLS et les déclencheurs SQL (supabase/v9_migration.sql).
 * Concurrence : chaque écriture filtre sur la version connue (version=eq.N) ; si une autre personne a
 * modifié la fiche entre-temps, aucune ligne n'est mise à jour → conflit signalé, rien n'est écrasé. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.cloudSync = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var ACT = '/rest/v1/cse_activities';
  var DOC = '/rest/v1/cse_documents';

  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); }
  /** Empreinte du contenu d'une fiche (hors métadonnées de synchronisation). */
  function itemHash(it) {
    var c = Object.assign({}, it);
    delete c.cloud; delete c.updatedAt; delete c.version;
    return fnv(JSON.stringify(c));
  }
  /** Remplace le contenu d'une fiche SANS changer d'objet (les vues ouvertes gardent une référence valide). */
  function replaceInPlace(target, src) {
    Object.keys(target).forEach(function (k) { if (!(k in src)) delete target[k]; });
    Object.keys(src).forEach(function (k) { target[k] = src[k]; });
    return target;
  }
  /** Empreinte métier portable : compare les photos locales img: via leur data URL si possible. */
  function portableItemHash(item, embed) {
    var copy = Object.assign({}, item);
    copy.photos = (item.photos || []).map(function (p) {
      return /^img:/.test(p) && embed ? (embed(p) || p) : p;
    });
    return itemHash(copy);
  }
  function copyActivityConflict(project, local) {
    var copy = JSON.parse(JSON.stringify(local));
    copy.id = CSE.model.uid('fiche');
    copy.title = (local.title || 'Fiche') + ' (version locale en conflit)';
    delete copy.cloud;
    project.items.push(CSE.model.normalizeItem(copy));
    return copy.id;
  }
  /** Les brouillons en conflit doivent rester LOCAUX, jusqu'à une décision de l'utilisateur. */
  function copyIssueConflict(project, id, localDoc) {
    var signature = fnv(JSON.stringify(localDoc.payload));
    var found = project.issues.find(function (issue) {
      return issue.cloudConflict && issue.cloudConflict.sourceId === id && issue.cloudConflict.signature === signature;
    });
    if (found) return found.id;
    var local = CSE.model.normalizeIssue(JSON.parse(JSON.stringify(localDoc.payload)));
    local.id = CSE.model.uid('mel');
    local.title = ((local.title || ('MEL semaine ' + local.week)) + ' (version locale en conflit)').slice(0, 120);
    local.status = 'draft';
    local.cloudConflict = { localOnly: true, sourceId: id, signature: signature, savedAt: new Date().toISOString() };
    project.issues.push(local);
    return local.id;
  }
  /** Sauvegarde persistante et restaurable des paramètres et catégories d'avant conflit. */
  function copySettingsConflict(project, id, localDoc) {
    project.cloud = project.cloud || {};
    var backups = project.cloud.settingsBackups = project.cloud.settingsBackups || [];
    var signature = fnv(JSON.stringify(localDoc.payload));
    var found = backups.find(function (x) { return x.sourceId === id && x.signature === signature; });
    if (found) return found.id;
    var entry = { id: CSE.model.uid('parametres'), sourceId: id, signature: signature,
      savedAt: new Date().toISOString(), settings: JSON.parse(JSON.stringify(localDoc.payload.settings || {})),
      categories: JSON.parse(JSON.stringify(localDoc.payload.categories || [])) };
    backups.unshift(entry);
    project.cloud.settingsBackups = backups.slice(0, 10);
    return entry.id;
  }
  function preserveDocumentConflict(project, row, localDoc, report) {
    if (!localDoc) return;
    if (row.kind === 'issue') {
      var issueId = copyIssueConflict(project, row.id, localDoc);
      report.savedCopies.push({ kind: 'issue', sourceId: row.id, id: issueId });
    } else if (row.kind === 'settings') {
      var settingsId = copySettingsConflict(project, row.id, localDoc);
      report.savedCopies.push({ kind: 'settings', sourceId: row.id, id: settingsId });
    }
  }
  function canEdit(role) { return role === 'editor' || role === 'admin'; }
  function canApprove(role) { return role === 'reviewer' || role === 'admin'; }
  function statusFor(item, role) {
    if (item.editorialStatus === 'approved' && !canApprove(role)) return 'review';
    return item.editorialStatus || 'draft';
  }
  /** Prépare la charge utile : les images locales « img:… » sont embarquées (data URL). */
  function payloadOf(item, embed) {
    var c = JSON.parse(JSON.stringify(item));
    delete c.cloud;
    c.photos = (c.photos || []).map(function (p) { return /^img:/.test(p) && embed ? (embed(p) || '') : p; }).filter(Boolean);
    return c;
  }
  function fromRow(row) {
    var it = CSE.model.normalizeItem(Object.assign({}, row.payload || {}, { title: row.title, editorialStatus: row.editorial_status }));
    return it;
  }

  /** Synchronise les fiches. api(path, {method, headers, body}) → Promise(JSON).
   * opts = {role, embed(ref)→dataURL, intern(dataURL)→Promise(ref)}. Modifie project en place. */
  function syncItems(project, api, opts) {
    var role = opts.role, report = { pulled: 0, pushed: 0, created: 0, conflicts: [], errors: [], orphaned: 0 };
    return api(ACT + '?select=id,title,payload,editorial_status,version,updated_at&order=updated_at.desc&limit=1000').then(function (rows) {
      rows = Array.isArray(rows) ? rows : [];
      var seen = {};
      var chain = Promise.resolve();
      rows.forEach(function (row) {
        seen[row.id] = 1;
        chain = chain.then(function () {
          var local = project.items.find(function (i) { return i.cloud && i.cloud.id === row.id; });
          if (!local) {
            var it = fromRow(row);
            // Premier raccordement : une fiche restaurée sur un deuxième poste garde son identifiant métier.
            // Ne JAMAIS la pousser en doublon si le serveur la connaît déjà sous un UUID différent.
            var byBusinessId = project.items.find(function (x) { return x.id === it.id; });
            if (byBusinessId && (!byBusinessId.cloud || !byBusinessId.cloud.id)) {
              var same = portableItemHash(byBusinessId, opts.embed) === portableItemHash(it);
              return internPhotos(it, opts).then(function () {
                if (!same) {
                  copyActivityConflict(project, byBusinessId);
                  report.conflicts.push(byBusinessId.title);
                }
                it.id = byBusinessId.id;
                it.cloud = { id: row.id, version: row.version, hash: itemHash(it) };
                replaceInPlace(byBusinessId, it); report.pulled++;
              });
            }
            // Deux fiches distantes différentes peuvent partager un id métier (ancien état).
            // Conserver les deux sans réécrire une fiche déjà synchronisée.
            if (byBusinessId) it.id = CSE.model.uid('fiche');
            return internPhotos(it, opts).then(function () {
              it.cloud = { id: row.id, version: row.version, hash: itemHash(it) };
              project.items.push(it); report.pulled++;
            });
          }
          var localChanged = itemHash(local) !== (local.cloud.hash || '');
          var remoteChanged = row.version !== local.cloud.version;
          if (remoteChanged) {
            var remote = fromRow(row);
            remote.id = local.id;
            return internPhotos(remote, opts).then(function () {
              if (localChanged) {
                // Conflit : la version en ligne est reprise, la version locale est conservée en copie.
                copyActivityConflict(project, local);
                report.conflicts.push(local.title);
              }
              remote.cloud = { id: row.id, version: row.version, hash: itemHash(remote) };
              replaceInPlace(local, remote);
              report.pulled++;
            });
          }
          if (localChanged) {
            if (!canEdit(role) && !(canApprove(role) && onlyStatusChanged(local, row))) { report.errors.push('« ' + local.title + ' » : modification locale non envoyée (rôle ' + role + ').'); return; }
            // Empreinte figée AVANT l'envoi : une modification faite pendant la requête restera « à envoyer ».
            var sentHash = itemHash(local);
            var body = canEdit(role) ? { title: local.title, payload: payloadOf(local, opts.embed), editorial_status: statusFor(local, role) } : { editorial_status: statusFor(local, role) };
            return api(ACT + '?id=eq.' + encodeURIComponent(row.id) + '&version=eq.' + row.version + '&select=id,version,editorial_status', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) }).then(function (res) {
              if (!res || !res.length) { report.conflicts.push(local.title); return; }
              if (itemHash(local) === sentHash) { local.editorialStatus = res[0].editorial_status; local.cloud = { id: row.id, version: res[0].version, hash: itemHash(local) }; }
              else local.cloud = { id: row.id, version: res[0].version, hash: sentHash };
              report.pushed++;
            }, function (e) { report.errors.push('« ' + local.title + ' » : ' + e.message); });
          }
        });
      });
      return chain.then(function () {
        // Fiches supprimées en ligne : conservées localement, simplement détachées.
        project.items.forEach(function (it) { if (it.cloud && it.cloud.id && !seen[it.cloud.id]) { it.cloud = { deleted: true }; report.orphaned++; } });
        if (!canEdit(role)) return;
        var news = project.items.filter(function (it) { return !it.cloud && !it.archived && String(it.title).trim() && !/\(version locale en conflit\)$/.test(it.title); });
        var c2 = Promise.resolve();
        news.forEach(function (it) {
          c2 = c2.then(function () {
            var sentHash = itemHash(it);
            return api(ACT + '?select=id,version,editorial_status', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ title: it.title, payload: payloadOf(it, opts.embed), editorial_status: statusFor(it, role) === 'approved' ? 'review' : statusFor(it, role) }) })
              .then(function (res) {
                if (!res || !res[0]) return;
                if (itemHash(it) === sentHash) { it.editorialStatus = res[0].editorial_status; it.cloud = { id: res[0].id, version: res[0].version, hash: itemHash(it) }; }
                else it.cloud = { id: res[0].id, version: res[0].version, hash: sentHash };
                report.created++;
              }, function (e) { report.errors.push('« ' + it.title + ' » : ' + e.message); });
          });
        });
        return c2;
      });
    }).then(function () { return report; });
  }
  function onlyStatusChanged(local, row) {
    var a = Object.assign({}, local); delete a.cloud; delete a.editorialStatus; delete a.updatedAt; delete a.version;
    var b = Object.assign({}, fromRow(row)); delete b.cloud; delete b.editorialStatus; delete b.updatedAt; delete b.version; b.id = a.id;
    return fnv(JSON.stringify(CSE.model.normalizeItem(a))) === fnv(JSON.stringify(CSE.model.normalizeItem(b)));
  }
  function internPhotos(it, opts) {
    if (!opts.intern) return Promise.resolve();
    return Promise.all((it.photos || []).map(function (p, i) {
      if (/^data:image\//.test(p)) return opts.intern(p).then(function (ref) { it.photos[i] = ref; }, function () { /* garde la data URL */ });
      return null;
    }));
  }

  /** Documents partagés : paramètres + catégories (administrateur) et MEL (rédacteurs). */
  function syncDocs(project, api, opts) {
    var role = opts.role, report = { pulled: 0, pushed: 0, conflicts: [], savedCopies: [], errors: [] };
    project.cloud = project.cloud || {};
    var meta = project.cloud.docs = project.cloud.docs || {};
    function localDocs() {
      var docs = { settings: { kind: 'settings', payload: { settings: project.settings, categories: project.categories } } };
      project.issues.forEach(function (is) {
        // Copie locale de récupération : visible dans Composer le MEL, jamais publiée sans décision.
        if (is.cloudConflict && is.cloudConflict.localOnly) return;
        docs['issue:' + is.id] = { kind: 'issue', payload: is };
      });
      return docs;
    }
    return api(DOC + '?select=id,kind,payload,version,updated_at&limit=500').then(function (rows) {
      rows = Array.isArray(rows) ? rows : [];
      var docs = localDocs(), chain = Promise.resolve();
      rows.forEach(function (row) {
        chain = chain.then(function () {
          var m = meta[row.id], loc = docs[row.id];
          var locHash = loc ? fnv(JSON.stringify(loc.payload)) : '';
          var localChanged = !!(m && loc && locHash !== m.hash);
          if (!m || !loc || row.version !== m.version) {
            // Cas 1 : deux postes se raccordent pour la première fois, avec le MÊME identifiant de MEL.
            // Cas 2 : la version distante a changé pendant que le bénévole travaillait.
            // Dans les deux cas, conserver une copie LOCALE avant toute substitution.
            var differs = !!(loc && fnv(JSON.stringify(row.payload)) !== locHash);
            if (differs && (!m || localChanged)) {
              preserveDocumentConflict(project, row, loc, report);
              report.conflicts.push(row.id === 'settings' ? 'Paramètres' : 'MEL ' + (loc.payload && loc.payload.week));
            }
            applyDoc(project, row);
            var updated = localDocs()[row.id];
            meta[row.id] = { version: row.version, hash: fnv(JSON.stringify(updated ? updated.payload : row.payload)) };
            report.pulled++;
            return;
          }
          if (localChanged && mayWrite(row.kind, role)) {
            return api(DOC + '?id=eq.' + encodeURIComponent(row.id) + '&version=eq.' + row.version + '&select=id,version', { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ payload: loc.payload }) })
              .then(function (res) { if (!res || !res.length) { report.conflicts.push(row.id + ' (modification locale conservée ; relancer la synchronisation)'); } else { meta[row.id] = { version: res[0].version, hash: locHash }; report.pushed++; } }, function (e) { report.errors.push(row.id + ' : ' + e.message); });
          }
        });
      });
      return chain.then(function () {
        var remoteIds = {}; rows.forEach(function (r) { remoteIds[r.id] = 1; });
        var c2 = Promise.resolve();
        Object.keys(localDocs()).forEach(function (id) {
          var d = localDocs()[id];
          if (remoteIds[id] || !mayWrite(d.kind, role)) return;
          c2 = c2.then(function () {
            return api(DOC + '?select=id,version', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: id, kind: d.kind, payload: d.payload }) })
              .then(function (res) { if (res && res[0]) { meta[id] = { version: res[0].version, hash: fnv(JSON.stringify(d.payload)) }; report.pushed++; } }, function (e) { report.errors.push(id + ' : ' + e.message); });
          });
        });
        return c2;
      });
    }).then(function () { return report; });
  }
  function mayWrite(kind, role) { return kind === 'settings' ? role === 'admin' : canEdit(role); }
  function applyDoc(project, row) {
    if (row.kind === 'settings' && row.payload) {
      if (row.payload.settings) project.settings = CSE.model.normalizeSettings(row.payload.settings);
      if (row.payload.categories) project.categories = CSE.model.normalizeCategories(row.payload.categories);
    } else if (row.kind === 'issue' && row.payload) {
      var is = CSE.model.normalizeIssue(row.payload);
      var i = project.issues.findIndex(function (x) { return x.id === is.id; });
      if (i >= 0) project.issues[i] = is; else project.issues.push(is);
    }
  }
  return { itemHash: itemHash, syncItems: syncItems, syncDocs: syncDocs, canEdit: canEdit, canApprove: canApprove, statusFor: statusFor, payloadOf: payloadOf };
});
