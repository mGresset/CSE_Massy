/* CSE Studio V9 · Démarrage, navigation et actions communes (exports, plein écran, impression). */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h;
  var App = C.app = C.app || {};
  App.views = App.views || {};
  var mainEl = function () { return document.getElementById('main'); };

  App.p = function () { return C.store.get(); };
  App.save = function (kind) { C.store.changed(kind); };
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

  /** Diapositives d'un MEL prêtes à l'export (pages incluses, dans l'ordre). */
  App.issueEntries = function (issue) {
    var p = App.p(), out = [];
    C.templates.renderIssue(p, issue).forEach(function (r) {
      if (r.excluded) return;
      var it = r.page.kind === 'item' ? App.item(r.page.itemId) : null;
      r.slides.forEach(function (s) {
        out.push({ slide: s, page: r.page, title: it ? it.title : App.pageLabel(r.page), notes: App.notesFor(r.page, it, s) });
      });
    });
    return out;
  };
  App.pageLabel = function (pg) {
    var it = pg.kind === 'item' ? App.item(pg.itemId) : null;
    if (it) return pg.opts && pg.opts.useOverrides && pg.opts.override && Object.prototype.hasOwnProperty.call(pg.opts.override, 'title') ? (pg.opts.override.title || 'Sans titre') : (it.title || 'Sans titre');
    return { cover: 'Couverture', news: (pg.opts && pg.opts.title) || 'Nouveautés', last: (pg.opts && pg.opts.title) || 'Dernières chances', upcoming: (pg.opts && pg.opts.title) || 'Programme à venir' }[pg.kind] || pg.kind;
  };
  App.notesFor = function (pg, it, s) {
    var lines = ['CSE Studio V9.4.5 · ' + (C.templates.TEMPLATES.find(function (t) { return t.id === s.templateId; }) || { name: s.templateId }).name];
    if (it) lines.push('Fiche : ' + App.pageLabel(pg) + (it.regEnd ? ' · inscriptions jusqu’au ' + C.dates.fmtLong(it.regEnd) : ''));
    var link = it ? C.compose.linkOf(it, App.p().settings) : '';
    if (link) lines.push('Lien : ' + link);
    return lines.join('\n');
  };
  /** Export PPTX avec contrôle préalable des textes tronqués et des erreurs bloquantes. */
  App.exportPptx = function (entries, fileName, btn) {
    if (!entries.length) { ui.toast('Aucune diapositive à exporter.', 'error'); return Promise.resolve(); }
    var blocks = [], cut = [];
    entries.forEach(function (e, i) {
      e.slide.warnings.forEach(function (w) {
        if (w.code === 'overflow') cut.push('Diapo ' + (i + 1) + ' « ' + e.title + ' » : ' + w.field);
        else if (w.level === 'block') blocks.push('Diapo ' + (i + 1) + ' « ' + e.title + ' » : ' + w.msg);
      });
    });
    var ask = Promise.resolve(true);
    if (blocks.length || cut.length) {
      var msg = (cut.length ? 'Texte tronqué (ne tient pas, même en police minimale) :\n• ' + cut.slice(0, 8).join('\n• ') + (cut.length > 8 ? '\n…' : '') + '\n\n' : '') +
        (blocks.length ? 'Points bloquants :\n• ' + blocks.slice(0, 8).join('\n• ') + '\n\n' : '') + 'Exporter quand même ? (Conseil : scinder les fiches concernées ou raccourcir le texte.)';
      ask = ui.confirm('Vérifier avant export', msg, 'Exporter quand même');
    }
    return ask.then(function (ok) {
      if (!ok) return;
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Génération…'; }
      return C.pptx.toBlob(entries.map(function (e) { return { slide: e.slide, title: e.title, notes: e.notes }; }), {
        title: fileName.replace(/\.pptx$/, ''),
        onProgress: function (n, total) { if (btn) btn.textContent = 'Génération ' + n + '/' + total + '…'; }
      }).then(function (r) {
        ui.download(r.blob, fileName);
        ui.toast('PowerPoint créé : ' + entries.length + ' diapositive(s).' + (r.warnings.length ? ' ' + r.warnings.length + ' image(s) indisponible(s).' : ''), 'ok');
        if (r.warnings.length) ui.toast(r.warnings.slice(0, 3).join(' · '), 'error');
      }).catch(function (e) { console.error(e); ui.toast('Export impossible : ' + e.message, 'error'); })
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
  /** Impression / PDF : une page 16:9 par diapositive. */
  App.print = function (slides) {
    var rootEl = document.getElementById('printRoot') || document.body.appendChild(h('div', { id: 'printRoot', class: 'cse-print' }));
    ui.clear(rootEl);
    slides.forEach(function (s) { var pg = h('div', { class: 'print-page' }); rootEl.appendChild(pg); C.renderHTML.render(s, pg, { checkOverflow: false }); });
    setTimeout(function () { window.print(); }, 300);
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

  /* ---------- Navigation ---------- */
  var ROUTES = { 'tableau-de-bord': 'dashboard', bibliotheque: 'library', fiche: 'editor', mel: 'composer', modeles: 'templates', parametres: 'settings', exports: 'exports' };
  var currentView = null;
  function route() {
    var raw = location.hash.replace(/^#\/?/, '').split('?')[0];
    var parts = raw.split('/').map(decodeURIComponent);
    var name = parts[0] || document.body.dataset.defaultRoute || 'tableau-de-bord';
    if (!ROUTES[name]) name = 'tableau-de-bord';
    document.querySelectorAll('[data-nav]').forEach(function (a) { if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (currentView && currentView.leave) currentView.leave();
    var view = App.views[ROUTES[name]];
    var el = mainEl();
    ui.clear(el);
    currentView = view;
    try { view.render(el, parts.slice(1)); }
    catch (e) { console.error(e); el.appendChild(h('div', { class: 'alert error' }, 'Erreur d’affichage : ' + e.message)); }
    document.title = (view.title || 'CSE Studio') + ' · CSE Studio V9.4.5';
    el.focus({ preventScroll: true });
  }
  App.refresh = function () { route(); };
  App.route = route;

  function boot() {
    var st = document.getElementById('saveStatus');
    C.store.onStatus(function (s, msg) {
      if (C.store.isVolatile()) { st.className = 'save-status pending'; st.textContent = 'Démonstration : rien n’est enregistré'; return; }
      st.className = 'save-status ' + (s === 'pending' ? 'pending' : s === 'error' ? 'error' : '');
      st.textContent = s === 'pending' ? '● Enregistrement…' : s === 'error' ? '⚠ ' + (msg || 'Erreur de sauvegarde') : '✓ Enregistré sur cet appareil';
      if (s === 'error') ui.toast(msg || 'Sauvegarde impossible', 'error');
    });
    C.store.on(function (kind) { if (kind === 'replace' && currentView) route(); });
    if (App.cloud && App.cloud.consumeHash) App.cloud.consumeHash();
    var demoMode = /[?&]demo(=|&|$)/.test(location.search);
    var start = demoMode ? C.images.init().then(function () {
      // Mode démonstration (lien « ?demo ») : données fictives en mémoire, aucune écriture locale.
      C.store.setVolatile(true);
      var photo = function (t) { return C.images.putTemp('img:demo-' + t, C.demoArt.paint(t, 1200, 800)); };
      return C.store.load().then(function () { C.store.set(C.demo.build(App.defaultRefDate(), photo), 'demo'); return { demo: true }; });
    }) : C.images.init().then(C.store.load);
    start.then(function (res) {
      st.textContent = demoMode ? 'Démonstration : rien n’est enregistré' : '✓ Enregistré sur cet appareil';
      if (demoMode) { st.className = 'save-status pending'; ui.toast('Mode démonstration : données fictives, aucune modification n’est conservée.', '', 6000); }
      if (res.migrated) ui.toast('Données V6/V8 importées dans la V9 (les anciennes données sont conservées).', 'ok', 7000);
      if (C.store.lastError()) ui.toast(C.store.lastError(), 'error');
      window.addEventListener('hashchange', route);
      route();
      if (App.cloud && App.cloud.init) App.cloud.init();
    }).catch(function (e) {
      console.error(e);
      mainEl().replaceChildren(h('div', { class: 'alert error' }, 'Démarrage impossible : ' + e.message));
    });
    window.addEventListener('beforeunload', function () { C.store.saveNow(); });
    window.addEventListener('error', function (e) { if (e && e.message && !/ResizeObserver/.test(e.message)) ui.toast('Erreur inattendue : ' + e.message, 'error'); });
    window.addEventListener('unhandledrejection', function (e) { ui.toast('Erreur inattendue : ' + ((e.reason && e.reason.message) || e.reason), 'error'); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
