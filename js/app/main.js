/* CSE Studio V10 · Démarrage, navigation et actions communes (exports, plein écran, impression, annuler). */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h;
  var App = C.app = C.app || {};
  App.views = App.views || {};
  App.VERSION = 'V10';
  var mainEl = function () { return document.getElementById('main'); };

  App.p = function () { return C.store.get(); };
  App.save = function (kind) {
    var is = kind === 'issues' ? App.activeIssue() : null;
    if (is) is.updatedAt = new Date().toISOString();
    C.store.changed(kind);
    updateUndo();
  };
  App.go = function (hash) { if (location.hash === hash) route(); else location.hash = hash; };
  App.today = function () { return C.dates.todayParis(); };
  /** Date de référence par défaut d'un nouveau MEL : lundi de la semaine (ou lundi suivant à partir du mercredi). */
  App.defaultRefDate = function () {
    var t = App.today(), wd = C.dates.weekday(t);
    if (wd === 1) return t;
    var mon = C.dates.monday(t);
    return wd === 2 ? mon : C.dates.addDays(mon, 7);
  };
  App.activeIssue = function () {
    var p = App.p();
    return p.issues.find(function (i) { return i.id === p.activeIssueId; }) || p.issues[p.issues.length - 1] || null;
  };
  App.refDate = function () { var is = App.activeIssue(); return is ? is.refDate : App.today(); };
  App.newIssue = function (ref, auto) {
    var p = App.p();
    var is = C.model.blankIssue(ref || App.defaultRefDate());
    if (auto !== false) is.pages = C.compose.autoCompose(p, is);
    p.issues.push(is);
    p.activeIssueId = is.id;
    App.save('issues');
    return is;
  };
  App.ensureIssue = function () { return App.activeIssue() || App.newIssue(); };
  App.item = function (id) { return C.compose.findItem(App.p(), id); };

  /** Diapositives d'un MEL prêtes à l'export (pages incluses, dans l'ordre).
   *  opts : onlyPage (une page), pageIds (sélection), skipImages (photos explicitement écartées). */
  App.issueEntries = function (issue, opts) {
    opts = opts || {};
    var p = App.p(), view = C.compose.issueView(p, issue), out = [];
    C.templates.renderIssue(p, issue, { skipImages: opts.skipImages }).forEach(function (r) {
      if (r.excluded) return;
      if (opts.onlyPage && r.page.id !== opts.onlyPage) return;
      if (opts.pageIds && opts.pageIds.indexOf(r.page.id) < 0) return;
      var src = r.page.kind === 'item' ? C.compose.findItem(view.project, r.page.itemId) : null;
      var it = src ? C.compose.effectiveItem(r.page, src) : null;
      r.slides.forEach(function (s) {
        out.push({ slide: s, page: r.page, item: it, issue: issue, title: it ? it.title : App.pageLabel(r.page), notes: App.notesFor(r.page, it, s) });
      });
    });
    return out;
  };
  App.pageLabel = function (pg) {
    if (pg.kind === 'item') {
      var it = App.item(pg.itemId);
      var is = App.activeIssue();
      if (!it && is && C.compose.isFrozen(is)) it = (is.snapshot.items || []).find(function (x) { return x.id === pg.itemId; });
      if (!it) return 'Fiche supprimée';
      return C.compose.effectiveItem(pg, it).title || 'Sans titre';
    }
    return { cover: 'Couverture', news: (pg.opts && pg.opts.title) || 'Nouveautés', last: (pg.opts && pg.opts.title) || 'Dernières chances', upcoming: (pg.opts && pg.opts.title) || 'Programme à venir' }[pg.kind] || pg.kind;
  };
  App.notesFor = function (pg, it, s) {
    var lines = ['CSE Studio ' + App.VERSION + ' · ' + (C.templates.TEMPLATES.find(function (t) { return t.id === s.templateId; }) || { name: s.templateId }).name];
    if (it) lines.push('Fiche : ' + (it.title || 'Sans titre') + (it.regEnd ? ' · inscriptions jusqu’au ' + C.dates.fmtLong(it.regEnd) : ''));
    var link = it ? C.compose.linkOf(it, App.p().settings) : '';
    if (link) lines.push('Lien : ' + link);
    return lines.join('\n');
  };
  /** Nom de fichier explicite : CSE_MEL_2026_Semaine_46.pptx (+ suffixe éventuel). */
  App.melFileName = function (issue, suffix) {
    var w = ('0' + issue.week).slice(-2);
    return 'CSE_MEL_' + issue.year + '_Semaine_' + w + (suffix ? '_' + ui.slug(suffix) : '') + '.pptx';
  };
  App.downloadBackup = function (name) {
    C.store.saveNow();
    var data = C.store.backupObject();
    ui.download(JSON.stringify(data), name || 'CSE_Studio_Sauvegarde_' + App.today() + '.json', 'application/json');
    var missing = data.backupWarnings && data.backupWarnings.length;
    ui.toast(missing ? 'Sauvegarde téléchargée, mais certaines photos sont manquantes : ' + data.backupWarnings.join(' ') : 'Sauvegarde JSON complète téléchargée (fiches, MEL, réglages et photos).', missing ? 'error' : 'ok', 7000);
  };

  /** Export PPTX avec contrôle préalable.
   *  entriesOrFn : liste d'entrées, ou fonction (opts) → entrées (permet de recomposer sans les photos écartées).
   *  1. Photos non intégrables (lien Web non importé, introuvable) : export BLOQUÉ, sauf choix explicite
   *     « Exporter sans ces photos » (la composition se recalcule sans elles ; jamais de cadre gris).
   *  2. Textes tronqués, points bloquants, fiches non validées : confirmation explicite.
   *  3. Après génération : contrôle de l'archive (diapositives et médias réellement présents). */
  App.exportPptx = function (entriesOrFn, fileName, btn) {
    var make = typeof entriesOrFn === 'function' ? entriesOrFn : function () { return entriesOrFn; };
    var entries = make({});
    if (!entries.length) { ui.toast('Aucune diapositive à exporter.', 'error'); return Promise.resolve(); }
    var imgs = [], seenImg = {};
    entries.forEach(function (e, i) { e.slide.warnings.forEach(function (w) { if (w.code === 'image' && !seenImg[w.src + '|' + e.title]) { seenImg[w.src + '|' + e.title] = 1; imgs.push({ src: w.src, status: w.status, title: e.title, n: i + 1 }); } }); });
    var step = Promise.resolve(entries);
    if (imgs.length) {
      var canSkip = typeof entriesOrFn === 'function';
      step = ui.dialog({ title: 'Photos non intégrables au PowerPoint', body: h('div', {},
        h('p', {}, imgs.length + ' photo(s) ne peuvent pas être intégrées. Pour ne pas produire de cadre gris, l’export est arrêté.'),
        h('ul', { class: 'small' }, imgs.slice(0, 12).map(function (x) { return h('li', {}, 'Diapo ' + x.n + ' « ' + x.title + ' » : ' + (x.status === 'remote' ? 'lien Web non importé (le site bloque la récupération : CORS)' : 'photo introuvable dans le stockage local')); })),
        h('p', { class: 'small muted' }, 'Pour corriger : ouvrez la page, puis « Remplacer par un fichier » ou collez l’image (Ctrl+V) dans l’étape Visuels.' + (canSkip ? ' Vous pouvez aussi exporter en retirant ces photos : la composition se recalcule sans elles.' : ''))),
        buttons: [{ label: 'Annuler', value: false }].concat(canSkip ? [{ label: 'Exporter sans ces photos', kind: 'primary', value: true }] : []) }).then(function (ok) {
        if (!ok) return null;
        var skip = imgs.map(function (x) { return x.src; });
        var again = make({ skipImages: skip });
        // Contrôle : plus aucune image non intégrable après recomposition.
        if (again.some(function (e) { return e.slide.warnings.some(function (w) { return w.code === 'image'; }); })) { ui.toast('Export arrêté : une photo reste non intégrable après recomposition.', 'error', 8000); return null; }
        return again;
      });
    }
    return step.then(function (list) {
      if (!list) return null;
      entries = list;
      var blocks = [], cut = [], editorial = [], checked = {};
      entries.forEach(function (e, i) {
        var related = [];
        var pg = e.page, issue = e.issue || App.activeIssue();
        if (e.item) related.push(e.item);
        else if (pg && issue && (pg.kind === 'news' || pg.kind === 'last')) related = C.compose.selection(pg, App.p(), issue);
        else if (pg && issue && pg.kind === 'cover') { var featured = C.compose.coverData(pg, App.p(), issue); related = featured.news.concat(featured.last); }
        related.forEach(function (it) {
          if (checked[it.id]) return;
          checked[it.id] = true;
          if (it.editorialStatus !== 'approved') editorial.push('« ' + (it.title || 'Sans titre') + ' » : ' + (it.editorialStatus === 'review' ? 'à relire' : 'brouillon'));
          C.compose.checkItem(it, App.p(), issue ? issue.refDate : App.refDate()).forEach(function (w) { if (w[0] === 'block') blocks.push('« ' + (it.title || 'Sans titre') + ' » : ' + w[1]); });
        });
        e.slide.warnings.forEach(function (w) {
          if (w.code === 'overflow') cut.push('Diapo ' + (i + 1) + ' « ' + e.title + ' » : ' + w.field);
          else if (w.level === 'block' && w.code !== 'image') blocks.push('Diapo ' + (i + 1) + ' « ' + e.title + ' » : ' + w.msg);
        });
      });
      if (!blocks.length && !cut.length && !editorial.length) return true;
      var msg = (editorial.length ? 'Fiches non validées pour diffusion (' + editorial.length + ') :\n• ' + editorial.slice(0, 8).join('\n• ') + (editorial.length > 8 ? '\n…' : '') + '\n\n' : '') +
        (cut.length ? 'Texte tronqué (ne tient pas, même en police minimale) :\n• ' + cut.slice(0, 8).join('\n• ') + (cut.length > 8 ? '\n…' : '') + '\n\n' : '') +
        (blocks.length ? 'Points bloquants :\n• ' + blocks.slice(0, 8).join('\n• ') + '\n\n' : '') + 'Exporter quand même ? (Conseil : utilisez le « Contrôle final » pour corriger chaque page.)';
      return ui.confirm('Vérifier avant export', msg, 'Exporter quand même');
    }).then(function (ok) {
      if (!ok) return;
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }
      var t0 = Date.now();
      return C.pptx.toBlob(entries.map(function (e) { return { slide: e.slide, title: e.title, notes: e.notes }; }), {
        title: fileName.replace(/\.pptx$/, ''),
        onProgress: function (n, total) { if (btn) btn.textContent = 'Génération ' + n + '/' + total + '…'; }
      }).then(function (r) {
        ui.download(r.blob, fileName);
        var c = r.check;
        var verified = c && c.media !== null ? ' Vérifié : ' + c.slides + ' diapositive(s), ' + (c.media - 1) + ' photo(s) intégrée(s) + bandeau.' : '';
        ui.toast('PowerPoint « ' + fileName + ' » créé en ' + Math.max(1, Math.round((Date.now() - t0) / 100) / 10) + ' s.' + verified, c && !c.ok ? 'error' : 'ok', 8000);
        if (c && !c.ok) ui.toast('Contrôle du fichier : nombre de médias inattendu (' + c.media + ' pour ' + c.expectedImages + ' photo(s)). Vérifiez le PowerPoint avant diffusion.', 'error', 10000);
      }).catch(function (e) { console.error(e); ui.toast('Export interrompu : ' + e.message, 'error', 10000); })
        .then(function () { if (btn) { btn.disabled = false; btn.textContent = label; } });
    });
  };
  /** Diaporama plein écran (flèches clavier). */
  App.fullscreen = function (slides, start) {
    if (!slides.length) return;
    var i = Math.max(0, Math.min(start || 0, slides.length - 1));
    var holder = h('div', { class: 'show-frame' });
    var counter = h('span', { class: 'muted', style: { color: '#CBD5E1' } });
    function show() { ui.clear(holder); var f = ui.slideFrame(slides[i], { checkOverflow: false }); holder.appendChild(f.frame); counter.textContent = (i + 1) + ' / ' + slides.length; }
    var prev = h('button', { class: 'btn', type: 'button', onclick: function () { if (i > 0) { i--; show(); } } }, '‹ Précédente');
    var next = h('button', { class: 'btn', type: 'button', onclick: function () { if (i < slides.length - 1) { i++; show(); } } }, 'Suivante ›');
    function key(e) { if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next.click(); } if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev.click(); } }
    var body = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' } }, holder, h('div', { class: 'row' }, prev, counter, next));
    document.addEventListener('keydown', key);
    show();
    return ui.dialog({ title: 'Aperçu plein écran', body: body, full: true, onOpen: function () { setTimeout(function () { ui.fitAll(holder); }, 50); } }).then(function () { document.removeEventListener('keydown', key); });
  };
  /** Impression / PDF : attend le chargement des images pour ne pas produire de pages vides. */
  App.print = function (slides) {
    if (!slides.length) { ui.toast('Aucune diapositive à imprimer.', 'error'); return Promise.resolve(); }
    var rootEl = document.getElementById('printRoot') || document.body.appendChild(h('div', { id: 'printRoot', class: 'cse-print' }));
    ui.clear(rootEl);
    slides.forEach(function (s) { var pg = h('div', { class: 'print-page' }); rootEl.appendChild(pg); C.renderHTML.render(s, pg, { checkOverflow: false }); });
    var imgs = Array.prototype.slice.call(rootEl.querySelectorAll('img'));
    var pending = imgs.filter(function (img) { return !img.complete; });
    if (pending.length) ui.toast('Préparation du PDF : chargement des images…', '', 2500);
    var finished = Promise.all(pending.map(function (img) {
      return new Promise(function (resolve) { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); });
    }));
    return Promise.race([finished, new Promise(function (resolve) { setTimeout(resolve, 4000); })]).then(function () {
      return new Promise(function (resolve) { requestAnimationFrame(function () { requestAnimationFrame(resolve); }); });
    }).then(function () {
      window.addEventListener('afterprint', function () { ui.clear(rootEl); }, { once: true });
      window.print();
    });
  };
  App.loadDemo = function () {
    var themes = {};
    var photo = function (t) { if (!themes[t]) themes[t] = C.images.put(C.demoArt.paint(t, 1200, 800)); return t; };
    var p0 = C.demo.build(App.defaultRefDate(), photo);
    var keys = Object.keys(themes);
    return Promise.all(keys.map(function (k) { return themes[k]; })).then(function (refs) {
      var map = {}; keys.forEach(function (k, i) { map[k] = refs[i]; });
      p0.items.forEach(function (it) { it.photos = it.photos.map(function (t) { return map[t] || t; }); });
      var p = App.p();
      C.store.snapshot('Avant chargement de la démonstration');
      var merged = C.migrate.merge(p, p0);
      merged.activeIssueId = merged.issues[merged.issues.length - 1].id;
      C.store.set(merged, 'replace');
      ui.toast('Démonstration fictive chargée : ' + p0.items.length + ' fiches et un MEL complet.', 'ok');
    });
  };

  /* ---------- Annuler / rétablir ---------- */
  var undoEls = [];
  function updateUndo() {
    setTimeout(function () {
      undoEls = undoEls.filter(function (x) { return x.u.isConnected; });
      undoEls.forEach(function (x) { x.u.disabled = !C.store.canUndo(); x.r.disabled = !C.store.canRedo(); });
    }, 950);
  }
  App.undoButtons = function () {
    var u = h('button', { class: 'btn icon', type: 'button', title: 'Annuler la dernière modification (Ctrl+Z)', 'aria-label': 'Annuler', onclick: function () { doUndo(); } }, '↶');
    var r = h('button', { class: 'btn icon', type: 'button', title: 'Rétablir (Ctrl+Y)', 'aria-label': 'Rétablir', onclick: function () { doRedo(); } }, '↷');
    u.disabled = !C.store.canUndo(); r.disabled = !C.store.canRedo();
    undoEls.push({ u: u, r: r });
    return h('span', { class: 'undo-group' }, u, r);
  };
  function doUndo() { if (C.store.undo()) ui.toast('Modification annulée.'); else ui.toast('Rien à annuler.'); }
  function doRedo() { if (C.store.redo()) ui.toast('Modification rétablie.'); else ui.toast('Rien à rétablir.'); }

  /* ---------- Navigation ---------- */
  var ROUTES = { 'tableau-de-bord': 'dashboard', bibliotheque: 'library', fiche: 'editor', mels: 'issues', mel: 'composer', modeles: 'templates', parametres: 'settings', exports: 'exports' };
  var currentView = null;
  function route() {
    var raw = location.hash.replace(/^#\/?/, '').split('?')[0];
    var parts = raw.split('/').map(decodeURIComponent);
    var name = parts[0] || document.body.dataset.defaultRoute || 'tableau-de-bord';
    if (!ROUTES[name]) name = 'tableau-de-bord';
    document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.dataset.nav === name || (name === 'mel' && a.dataset.nav === 'mels')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (currentView && currentView.leave) currentView.leave();
    var view = App.views[ROUTES[name]];
    var el = mainEl();
    var keepY = window.__keepScroll ? window.scrollY : null;
    ui.clear(el);
    currentView = view;
    try { view.render(el, parts.slice(1)); }
    catch (e) { console.error(e); el.appendChild(h('div', { class: 'alert error' }, 'Erreur d’affichage : ' + e.message)); }
    document.title = (view.title || 'CSE Studio') + ' · CSE Studio ' + App.VERSION;
    el.focus({ preventScroll: true });
    if (keepY !== null) { window.scrollTo(0, keepY); window.__keepScroll = false; }
  }
  App.refresh = function () { window.__keepScroll = true; route(); };
  App.route = route;

  function boot() {
    var st = document.getElementById('saveStatus');
    C.store.onStatus(function (s, msg) {
      if (C.store.isVolatile()) { st.className = 'save-status pending'; st.textContent = 'Démonstration : rien n’est enregistré'; return; }
      st.className = 'save-status ' + (s === 'pending' ? 'pending' : s === 'error' ? 'error' : '');
      st.textContent = s === 'pending' ? '● Enregistrement…' : s === 'error' ? '⚠ ' + (msg || 'Erreur de sauvegarde') : '✓ Enregistré sur cet appareil';
      if (s === 'error') ui.toast(msg || 'Sauvegarde impossible', 'error');
    });
    C.store.on(function (kind) { if (kind === 'replace' && currentView) { window.__keepScroll = true; route(); } });
    if (App.cloud && App.cloud.consumeHash) App.cloud.consumeHash();
    var demoMode = /[?&]demo(=|&|$)/.test(location.search);
    var start = demoMode ? C.images.init().then(function () {
      // Mode démonstration (lien « ?demo ») : données fictives en mémoire, aucune écriture locale.
      C.store.setVolatile(true);
      var photo = function (t) { return C.images.putTemp('img:demo-' + t, C.demoArt.paint(t, 1200, 800)); };
      return C.store.load().then(function () { C.store.set(C.demo.build(App.defaultRefDate(), photo), 'demo'); return { demo: true }; });
    }) : C.images.init().then(C.store.load);
    start.then(function (res) {
      C.store.checkpoint();
      st.textContent = demoMode ? 'Démonstration : rien n’est enregistré' : '✓ Enregistré sur cet appareil';
      if (demoMode) { st.className = 'save-status pending'; ui.toast('Mode démonstration : données fictives, aucune modification n’est conservée.', '', 6000); }
      if (res.migrated) ui.toast('Données des versions précédentes importées (les anciennes données sont conservées).', 'ok', 7000);
      if (C.store.lastError()) ui.toast(C.store.lastError(), 'error');
      window.addEventListener('hashchange', route);
      route();
      if (App.cloud && App.cloud.init) App.cloud.init();
    }).catch(function (e) {
      console.error(e);
      mainEl().replaceChildren(h('div', { class: 'alert error' }, 'Démarrage impossible : ' + e.message));
    });
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase(), mod = (e.ctrlKey || e.metaKey) && !e.altKey;
      if (mod && k === 's') {
        e.preventDefault();
        if (C.store.saveNow()) ui.toast('Fiches et MEL enregistrés sur cet appareil. Pour changer de poste, exportez également une sauvegarde JSON.', 'ok', 4500);
        else ui.toast('Enregistrement impossible : utilisez Sauvegardes & exports.', 'error');
        return;
      }
      // Annuler / rétablir global, sauf dans un champ de saisie (qui garde son propre historique).
      var inField = /^(input|textarea|select)$/i.test((document.activeElement || {}).tagName || '') || (document.activeElement && document.activeElement.isContentEditable);
      if (mod && !inField && !document.querySelector('dialog[open]')) {
        if (k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
        else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); doRedo(); }
      }
    });
    window.addEventListener('pagehide', function () { C.store.saveNow(); });
    window.addEventListener('beforeunload', function () { C.store.saveNow(); });
    window.addEventListener('error', function (e) { if (e && e.message && !/ResizeObserver/.test(e.message)) ui.toast('Erreur inattendue : ' + e.message, 'error'); });
    window.addEventListener('unhandledrejection', function (e) { ui.toast('Erreur inattendue : ' + ((e.reason && e.reason.message) || e.reason), 'error'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
