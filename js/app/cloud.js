/* CSE Studio V9.2 · Espace partagé Supabase (facultatif). Sans configuration, l'application reste 100 % locale.
 * Seules des valeurs PUBLIQUES sont utilisées ici (URL du projet, clé publishable/anon). Jamais de clé service_role. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  var CONFIG_KEY = 'cse-studio-massy:v9:cloud-config', SESSION_KEY = 'cse-studio-massy:v9:cloud-session';
  var config = null, session = null, user = null, role = null, lastReport = null, busy = false, notice = '';
  var ROLE_LABEL = { editor: 'Rédacteur', reviewer: 'Relecteur', admin: 'Administrateur' };

  function readJSON(store, k) { try { return JSON.parse(store.getItem(k) || 'null'); } catch (e) { return null; } }
  function validOrigin(u) { try { var x = new URL(u); return x.protocol === 'https:' && !x.username && !x.password ? x.origin : ''; } catch (e) { return ''; } }
  function loadConfig() {
    var c = root.CSE_CLOUD_CONFIG || readJSON(localStorage, CONFIG_KEY);
    config = c && validOrigin(c.url) && c.key ? { url: validOrigin(c.url), key: String(c.key) } : null;
    session = readJSON(sessionStorage, SESSION_KEY);
  }
  function headers(auth) { var hd = { apikey: config.key, 'Content-Type': 'application/json' }; if (auth !== false && session && session.access_token) hd.Authorization = 'Bearer ' + session.access_token; return hd; }
  function parse(res) {
    return res.text().then(function (t) {
      var body = t; try { body = t ? JSON.parse(t) : null; } catch (e) { /* texte brut */ }
      if (!res.ok) throw Error(body && typeof body === 'object' ? (body.message || body.error_description || body.error || body.hint || 'Erreur ' + res.status) : 'Erreur HTTP ' + res.status);
      return body;
    });
  }
  function setSession(s) {
    session = { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (Number(s.expires_in) || 3600) };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  function refresh() {
    if (!session || !session.refresh_token) return Promise.reject(Error('Session expirée : reconnectez-vous.'));
    return fetch(config.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: headers(false), body: JSON.stringify({ refresh_token: session.refresh_token }) }).then(parse).then(setSession);
  }
  function api(path, opts) {
    opts = opts || {};
    if (!config) return Promise.reject(Error('Espace partagé non configuré.'));
    if (!session) return Promise.reject(Error('Connexion requise.'));
    var pre = (session.expires_at || 0) < Math.floor(Date.now() / 1000) + 60 ? refresh() : Promise.resolve();
    return pre.then(function () { return fetch(config.url + path, { method: opts.method || 'GET', headers: Object.assign(headers(), opts.headers || {}), body: opts.body }); }).then(parse);
  }
  /** Lien magique reçu : #access_token=…&refresh_token=… (à traiter avant la navigation). */
  function consumeHash() {
    loadConfig();
    var hs = location.hash.replace(/^#/, '');
    if (!/access_token=|error_description=/.test(hs)) return false;
    var p = new URLSearchParams(hs);
    if (p.get('access_token') && p.get('refresh_token')) { setSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') }); notice = 'Lien de connexion reçu : vérification des droits…'; }
    if (p.get('error_description')) notice = 'Authentification : ' + p.get('error_description');
    history.replaceState(null, '', location.pathname + location.search + '#/parametres');
    return true;
  }
  function whoami() {
    if (!config || !session) return Promise.resolve(null);
    return api('/auth/v1/user').then(function (u) {
      user = u;
      return api('/rest/v1/cse_members?select=role&user_id=eq.' + encodeURIComponent(u.id));
    }).then(function (rows) {
      role = Array.isArray(rows) && rows[0] ? rows[0].role : null;
      if (!role) { notice = 'Compte reconnu mais non autorisé : un administrateur doit l’ajouter dans cse_members.'; }
      return role;
    }).catch(function (e) { notice = 'Connexion impossible : ' + e.message; signOut(true); });
  }
  function signIn(email) {
    var redirect = location.origin + location.pathname;
    return fetch(config.url + '/auth/v1/otp?redirect_to=' + encodeURIComponent(redirect), { method: 'POST', headers: headers(false), body: JSON.stringify({ email: email, create_user: false }) }).then(parse);
  }
  function signOut(silent) { session = null; user = null; role = null; sessionStorage.removeItem(SESSION_KEY); if (!silent) notice = 'Déconnecté. Les données locales restent disponibles.'; }

  function embed(ref) { return C.images.url(ref); }
  function intern(dataUrl) { return C.images.put(dataUrl); }
  /** Synchronisation complète : fiches puis documents (paramètres, catégories, MEL). */
  function syncNow() {
    if (busy) return Promise.resolve(lastReport);
    if (!role) return Promise.reject(Error('Connectez-vous avec un compte autorisé.'));
    busy = true;
    var p = App.p();
    C.store.snapshot('Avant synchronisation avec l’espace partagé');
    var rep = {};
    return C.cloudSync.syncItems(p, api, { role: role, embed: embed, intern: intern }).then(function (r1) {
      rep.items = r1;
      return C.cloudSync.syncDocs(p, api, { role: role });
    }).then(function (r2) {
      rep.docs = r2;
      p.cloud = p.cloud || {}; p.cloud.lastSync = new Date().toISOString();
      C.store.set(p, 'replace');
      lastReport = rep;
      var conflicts = rep.items.conflicts.length + rep.docs.conflicts.length;
      ui.toast('Synchronisation : ' + (rep.items.pulled + rep.docs.pulled) + ' reçu(s), ' + (rep.items.pushed + rep.items.created + rep.docs.pushed) + ' envoyé(s)' + (conflicts ? ', ' + conflicts + ' conflit(s) — voir Paramètres' : '') + '.', conflicts ? 'error' : 'ok', 7000);
      return rep;
    }).finally(function () { busy = false; });
  }

  function canShareIssue(r) { return r === 'editor' || r === 'admin'; }
  function settingsPanel() {
    loadConfig();
    var box = h('div');
    function draw() {
      ui.clear(box);
      box.appendChild(h('p', { class: 'small muted' }, 'Facultatif. Permet à plusieurs bénévoles de partager fiches, catégories et MEL, avec des rôles Rédacteur / Relecteur / Administrateur vérifiés par le serveur (RLS Supabase). Sans configuration, tout reste enregistré sur cet appareil.'));
      if (notice) box.appendChild(h('div', { class: 'alert info small' }, notice));
      var url = h('input', { type: 'url', value: config ? config.url : '', placeholder: 'https://votre-projet.supabase.co' });
      var key = h('input', { value: config ? config.key : '', placeholder: 'sb_publishable_… ou clé anon publique' });
      var save = h('button', { class: 'btn', type: 'button', onclick: function () {
        var o = validOrigin(url.value.trim()), k = key.value.trim();
        if (!o || !k) return ui.toast('URL HTTPS et clé publique requises.', 'error');
        if (/service_role|sb_secret_/i.test(k)) return ui.toast('Clé refusée : n’utilisez JAMAIS la clé service_role / secrète dans le navigateur.', 'error');
        localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: o, key: k }));
        loadConfig(); signOut(true); notice = 'Configuration enregistrée sur cet appareil.'; draw();
      } }, 'Enregistrer la configuration');
      box.appendChild(h('details', { open: !config }, h('summary', {}, 'Configuration (administrateur)'),
        h('div', { style: { marginTop: '10px' } }, ui.field('URL du projet Supabase', url), ui.field('Clé publique (publishable / anon)', key, { help: 'Clé publique uniquement. Appliquer d’abord supabase/schema.sql puis supabase/v9_migration.sql (voir README).' }), save,
          config ? h('button', { class: 'btn ghost', type: 'button', onclick: function () { localStorage.removeItem(CONFIG_KEY); signOut(true); loadConfig(); notice = 'Configuration supprimée.'; draw(); } }, 'Retirer') : null)));
      if (!config) { renderRecovery(); return; }
      if (!session) {
        var email = h('input', { type: 'email', placeholder: 'prenom.nom@…', autocomplete: 'email' });
        box.appendChild(h('div', { class: 'row', style: { marginTop: '12px' } }, h('div', { style: { flex: 1, minWidth: '220px' } }, ui.field('Adresse e-mail d’un bénévole autorisé', email)),
          h('button', { class: 'btn primary', type: 'button', onclick: function (e) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return ui.toast('Adresse e-mail invalide.', 'error');
            e.currentTarget.disabled = true;
            signIn(email.value.trim()).then(function () { notice = 'Lien de connexion envoyé : ouvrez l’e-mail sur cet appareil.'; draw(); }, function (err) { ui.toast('Envoi impossible : ' + err.message, 'error'); draw(); });
          } }, '✉ Recevoir un lien de connexion')));
        renderRecovery();
        return;
      }
      box.appendChild(h('div', { class: 'row', style: { marginTop: '12px' } },
        h('span', { class: 'chip ' + (role ? 'ok' : 'warn') }, user ? (user.email || 'Connecté') + (role ? ' · ' + ROLE_LABEL[role] : ' · non autorisé') : 'Vérification…'),
        role ? h('button', { class: 'btn primary', type: 'button', onclick: function (e) { var b = e.currentTarget; b.disabled = true; b.textContent = 'Synchronisation…'; syncNow().then(draw, function (err) { ui.toast(err.message, 'error'); draw(); }); } }, '☁ Synchroniser maintenant') : null,
        h('button', { class: 'btn ghost', type: 'button', onclick: function () { signOut(); draw(); } }, 'Se déconnecter')));
      var p = App.p();
      if (p.cloud && p.cloud.lastSync) box.appendChild(h('p', { class: 'small muted' }, 'Dernière synchronisation : ' + new Date(p.cloud.lastSync).toLocaleString('fr-FR')));
      if (lastReport) {
        var r = lastReport;
        box.appendChild(h('ul', { class: 'issues' },
          h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', {}, 'Fiches : ' + r.items.pulled + ' reçue(s), ' + (r.items.pushed + r.items.created) + ' envoyée(s)' + (r.items.orphaned ? ', ' + r.items.orphaned + ' supprimée(s) en ligne (conservées ici)' : '') + '. Documents : ' + r.docs.pulled + ' reçu(s), ' + r.docs.pushed + ' envoyé(s).')),
          r.items.conflicts.map(function (c) { return h('li', { class: 'warn' }, h('span', { class: 'ic' }, '!'), h('span', {}, 'Fiche « ' + c + ' » en conflit : retrouvez sa version locale dans la Bibliothèque, sous « (version locale en conflit) ».')); }),
          r.docs.conflicts.map(function (c) { return h('li', { class: 'warn' }, h('span', { class: 'ic' }, '!'), h('span', {}, 'Document « ' + c + ' » en conflit : consultez les copies locales ci-dessous. Si le serveur a refusé l’envoi, les changements restent locaux jusqu’à la prochaine synchronisation.')); }),
          r.items.errors.concat(r.docs.errors).map(function (c) { return h('li', { class: 'block' }, h('span', { class: 'ic' }, '✕'), h('span', {}, c)); })));
      }
      renderRecovery();
      if (!user) whoami().then(draw);
    }
    function renderRecovery() {
      var p = App.p();
      // Les versions de récupération ne doivent jamais être envoyées en arrière-plan.
      // L'utilisateur peut les consulter et décider explicitement de leur publication.
      var localCopies = (p.issues || []).filter(function (is) { return is.cloudConflict && is.cloudConflict.localOnly; });
      if (localCopies.length) {
        var recover = h('div', { class: 'card', style: { marginTop: '12px', padding: '12px' } },
          h('h3', {}, 'MEL locaux récupérés après conflit'),
          h('p', { class: 'small muted' }, 'Ces copies sont conservées sur cet appareil et incluses dans les sauvegardes JSON. Elles ne sont pas envoyées à Supabase tant que vous ne choisissez pas de les partager.'));
        localCopies.forEach(function (is) {
          recover.appendChild(h('div', { class: 'row', style: { marginBottom: '8px' } },
            h('a', { href: '#/mel/' + encodeURIComponent(is.id), class: 'btn small' }, 'Ouvrir : ' + (is.title || 'MEL')), 
            canShareIssue(role) ? h('button', { class: 'btn small', type: 'button', onclick: function () {
              ui.confirm('Partager cette copie comme un nouveau MEL ?', 'Le MEL original en ligne ne sera pas remplacé. Cette copie sera envoyée comme un document distinct lors de la prochaine synchronisation.', 'Autoriser le partage').then(function (ok) {
                if (!ok) return;
                delete is.cloudConflict;
                C.store.set(p, 'replace');
                notice = 'Copie prête pour la prochaine synchronisation. Elle sera publiée comme un nouveau MEL.';
                draw();
              });
            } }, 'Autoriser le partage') : null));
        });
        box.appendChild(recover);
      }
      var settingsBackups = p.cloud && p.cloud.settingsBackups || [];
      if (settingsBackups.length) {
        var settingsRecover = h('div', { class: 'card', style: { marginTop: '12px', padding: '12px' } },
          h('h3', {}, 'Paramètres locaux récupérés après conflit'),
          h('p', { class: 'small muted' }, 'La version distante reste active. Choisissez une sauvegarde pour rétablir localement les anciens paramètres et catégories. Une synchronisation administrateur pourra ensuite les envoyer.'));
        settingsBackups.forEach(function (entry) {
          settingsRecover.appendChild(h('div', { class: 'row', style: { marginBottom: '8px' } },
            h('span', { class: 'small' }, 'Copie du ' + new Date(entry.savedAt).toLocaleString('fr-FR')),
            h('button', { class: 'btn small', type: 'button', onclick: function () {
              ui.confirm('Restaurer les paramètres locaux ?', 'Les paramètres et catégories actuels de cet appareil seront remplacés par cette copie. Un instantané de sécurité sera créé avant la restauration.', 'Restaurer').then(function (ok) {
                if (!ok) return;
                C.store.snapshot('Avant restauration des paramètres locaux après conflit');
                p.settings = C.model.normalizeSettings(entry.settings);
                p.categories = C.model.normalizeCategories(entry.categories);
                C.store.set(p, 'replace');
                notice = 'Paramètres restaurés sur cet appareil. Aucune donnée n’a été publiée automatiquement.';
                draw();
              });
            } }, 'Restaurer ici')));
        });
        box.appendChild(settingsRecover);
      }
    }
    draw();
    return box;
  }
  App.cloud = {
    consumeHash: consumeHash,
    init: function () { loadConfig(); if (config && session) whoami(); },
    settingsPanel: settingsPanel,
    sync: syncNow,
    state: function () { return { configured: !!config, connected: !!role, role: role }; }
  };
})(window);
