/* CSE Studio V9 · Vues : tableau de bord, bibliothèque, modèles, paramètres, sauvegardes & exports. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;

  function itemSlides(it, opts) { return C.templates.renderItem(it, App.p(), Object.assign({ refDate: App.refDate() }, opts || {})); }
  function newItemDialog() {
    var body = h('div', { class: 'grid cols-2' });
    return ui.dialog({
      title: 'Créer une fiche', body: body, onOpen: function (d, close) {
        C.model.TYPES.forEach(function (t) {
          body.appendChild(h('button', { class: 'card', type: 'button', style: { textAlign: 'left', cursor: 'pointer' }, onclick: function () { close(t.id); } }, h('h3', {}, t.label), h('p', { class: 'muted small', style: { margin: 0 } }, t.hint)));
        });
      }
    }).then(function (type) { if (type) App.go('#/fiche/nouvelle/' + type); });
  }
  App.newItemDialog = newItemDialog;

  /* =============== TABLEAU DE BORD =============== */
  App.views.dashboard = {
    title: 'Tableau de bord',
    render: function (el) {
      var p = App.p(), issue = App.activeIssue(), ref = issue ? issue.refDate : App.defaultRefDate();
      var live = p.items.filter(function (it) { return !it.archived; });
      var cls = {}; live.forEach(function (it) { cls[it.id] = C.compose.classify(it, ref, p.settings); });
      var last = live.filter(function (it) { return cls[it.id].rubric === 'last'; }).sort(C.compose.byDeadline);
      var news = live.filter(function (it) { return cls[it.id].isNew && !cls[it.id].expired; });
      var audit = C.compose.audit(p, issue);
      live.forEach(function (it) { C.compose.checkItem(it, p, ref).forEach(function (x) { if (x[0] === 'block') audit.push({ level: 'block', msg: '« ' + (it.title || 'Sans titre') + ' » : ' + x[1], itemId: it.id }); }); });
      var expiredLive = live.filter(function (it) { return cls[it.id].rubric === 'expired'; });

      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Tableau de bord'), h('p', { class: 'lead' }, 'Préparez les fiches, composez le MEL de la semaine et exportez un PowerPoint modifiable pour Canva.')),
        h('div', { class: 'btn-group' }, h('button', { class: 'btn', type: 'button', onclick: newItemDialog }, '+ Nouvelle fiche'), h('a', { class: 'btn primary', href: '#/mel' }, 'Composer le MEL'))));

      if (p.migration && !p.migration.dismissed) {
        el.appendChild(h('div', { class: 'alert info' },
          h('b', {}, 'Mise à jour V9 : vos données ont été reprises. '), 'Sources : ' + (p.migration.from || []).join(', ') + '. ',
          (p.migration.notes || []).join(' '), ' Les données d’origine restent intactes dans ce navigateur (voir Sauvegardes & exports). ',
          h('button', { class: 'btn small', type: 'button', onclick: function () { p.migration.dismissed = true; App.save(); App.refresh(); } }, 'Compris')));
      }
      if (!p.items.length) {
        el.appendChild(h('div', { class: 'card', style: { marginBottom: '14px' } },
          h('h2', {}, 'Bienvenue dans CSE Studio'),
          h('p', {}, 'Saisissez chaque activité une seule fois dans la bibliothèque : le MEL de chaque semaine se compose ensuite automatiquement (nouveautés, dernières chances, activités en cours, programmes, règlement en fin de MEL).'),
          h('div', { class: 'btn-group' },
            h('button', { class: 'btn primary', type: 'button', onclick: newItemDialog }, 'Créer une première fiche'),
            h('button', { class: 'btn', type: 'button', onclick: function () { App.loadDemo(); } }, 'Charger la démonstration (fictive)'),
            h('a', { class: 'btn', href: '#/exports' }, 'Importer une sauvegarde'))));
      }
      // MEL en préparation
      var heroBody = h('div');
      if (issue) {
        var included = issue.pages.filter(function (pg) { return pg.included; }).length;
        var mon = D.isoWeekMonday(issue.week, issue.year);
        heroBody.appendChild(h('div', {},
          h('h2', {}, 'MEL en préparation · semaine ' + issue.week),
          h('p', { class: 'muted', style: { margin: '0 0 10px' } }, 'Semaine du ' + D.fmtRange(mon, D.addDays(mon, 4)).replace(/^Du /, '') + ' · date de référence ' + D.fmtLong(issue.refDate) + ' · ' + included + ' page(s) incluse(s)'),
          h('div', { class: 'row' }, h('a', { class: 'btn primary', href: '#/mel' }, 'Ouvrir le compositeur'),
            h('button', { class: 'btn', type: 'button', onclick: function (e) { App.exportPptx(App.issueEntries(issue), 'CSE_MEL_S' + issue.week + '_' + issue.year + '.pptx', e.currentTarget); } }, '↓ Exporter le MEL (.pptx)'))));
      } else {
        heroBody.appendChild(h('div', {}, h('h2', {}, 'Aucun MEL en préparation'), h('p', { class: 'muted' }, 'Créez le MEL de la semaine : il sera composé automatiquement à partir de la bibliothèque.'),
          h('button', { class: 'btn primary', type: 'button', onclick: function () { App.newIssue(); App.go('#/mel'); } }, 'Créer le MEL de la semaine ' + D.isoWeek(App.defaultRefDate()).week)));
      }
      var heroThumb = h('div');
      if (issue) {
        var cover = issue.pages.find(function (pg) { return pg.kind === 'cover'; });
        if (cover) heroThumb.appendChild(ui.slideFrame(C.templates.renderPage(cover, p, issue)[0], { checkOverflow: false }).frame);
      }
      el.appendChild(h('div', { class: 'card hero', style: { marginBottom: '14px' } }, heroBody, heroThumb));

      el.appendChild(h('div', { class: 'kpis' },
        kpi(live.length, 'fiches actives'), kpi(news.length, 'nouveautés'), kpi(last.length, 'dernières chances (J−' + p.settings.lastDays + ')'),
        kpi(audit.filter(function (a) { return a.level !== 'info'; }).length, 'alertes de contenu')));
      function kpi(n, label) { return h('div', { class: 'kpi' }, h('b', {}, String(n)), h('span', {}, label)); }

      var grid = h('div', { class: 'grid cols-2' });
      grid.appendChild(listCard('Dernières chances', last, function (it) { return [h('span', { class: 'chip last' }, D.countdown(it.regEnd, ref)), ' ', D.fmtShort(it.regEnd, true)]; }, 'Aucune clôture d’inscription dans les ' + p.settings.lastDays + ' jours suivant le ' + D.fmtLong(ref) + '.'));
      grid.appendChild(listCard('Nouveautés', news, function (it) { return ui.catChip(p, it); }, 'Aucune nouveauté. Marquez une fiche « Nouveauté » ou créez-en une.'));
      var soon = live.filter(function (it) { var d = it.regEnd ? D.diffDays(it.regEnd, ref) : null; return d !== null && d > p.settings.lastDays && d <= 30; }).sort(C.compose.byDeadline);
      grid.appendChild(listCard('Échéances des 30 prochains jours', soon, function (it) { return h('span', { class: 'chip ongoing' }, D.fmtShort(it.regEnd, true)); }, 'Aucune autre échéance proche.'));
      var recent = p.items.slice().sort(function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); }).slice(0, 6);
      grid.appendChild(listCard('Fiches récemment modifiées', recent, function (it) { return h('span', { class: 'muted small' }, new Date(it.updatedAt).toLocaleDateString('fr-FR')); }, 'Aucune fiche.'));
      var alerts = h('div', { class: 'card' }, h('h3', {}, 'Alertes de contenu'));
      var ul = h('ul', { class: 'issues' });
      audit.filter(function (a) { return a.level !== 'info'; }).slice(0, 12).forEach(function (a) {
        ul.appendChild(h('li', { class: a.level }, h('span', { class: 'ic' }, a.level === 'block' ? '✕' : '!'), h('span', {}, a.msg), a.itemId ? h('a', { class: 'btn small act', href: '#/fiche/' + a.itemId }, 'Corriger') : null));
      });
      if (expiredLive.length) ul.appendChild(h('li', { class: 'warn' }, h('span', { class: 'ic' }, '!'), h('span', {}, expiredLive.length + ' fiche(s) expirée(s) encore active(s) : pensez à les archiver.'), h('a', { class: 'btn small act', href: '#/bibliotheque?rubric=expired' }, 'Voir')));
      if (!ul.children.length) ul.appendChild(h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', {}, 'Aucune alerte.')));
      alerts.appendChild(ul);
      grid.appendChild(alerts);
      el.appendChild(grid);
      function listCard(title, items, extra, empty) {
        var c = h('div', { class: 'card' }, h('h3', {}, title + (items.length ? ' (' + items.length + ')' : '')));
        if (!items.length) { c.appendChild(h('p', { class: 'muted small', style: { margin: 0 } }, empty)); return c; }
        var l = h('ul', { class: 'list' });
        items.slice(0, 6).forEach(function (it) { l.appendChild(h('li', {}, h('span', { class: 'grow' }, h('a', { class: 'title', href: '#/fiche/' + it.id }, it.title || 'Sans titre')), extra(it))); });
        c.appendChild(l);
        return c;
      }
    }
  };

  /* =============== BIBLIOTHÈQUE =============== */
  var libState = { q: '', type: '', cat: '', rubric: '', status: '', archived: false, sort: 'date' };
  App.views.library = {
    title: 'Bibliothèque',
    render: function (el) {
      var qs = new URLSearchParams((location.hash.split('?')[1] || ''));
      if (qs.get('rubric')) libState.rubric = qs.get('rubric');
      var p = App.p(), ref = App.refDate();
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Bibliothèque des fiches'), h('p', { class: 'lead' }, 'Chaque fiche est saisie une fois et réutilisée dans tous les MEL. Statuts calculés au ' + D.fmtLong(ref) + ' (date du MEL en cours).')),
        h('div', { class: 'btn-group' }, h('button', { class: 'btn primary', type: 'button', onclick: newItemDialog }, '+ Nouvelle fiche'))));
      var q = h('input', { type: 'search', value: libState.q, placeholder: 'Titre, lieu, description…', 'aria-label': 'Rechercher' });
      var typeSel = ui.selectEl([{ id: '', label: 'Tous les types' }].concat(C.model.TYPES), libState.type);
      var catSel = ui.selectEl([{ id: '', label: 'Toutes les catégories' }].concat(p.categories.map(function (c) { return { id: c.id, label: c.name }; })), libState.cat);
      var rubSel = ui.selectEl([{ id: '', label: 'Toutes les rubriques' }].concat(Object.keys(C.compose.RUBRICS).filter(function (k) { return k !== 'archived'; }).map(function (k) { return { id: k, label: C.compose.RUBRICS[k].label }; })), libState.rubric);
      var stSel = ui.selectEl([{ id: '', label: 'Toutes validations' }, { id: 'draft', label: 'Brouillons' }, { id: 'review', label: 'À relire' }, { id: 'approved', label: 'Validées' }], libState.status);
      var sortSel = ui.selectEl([{ id: 'date', label: 'Date de l’activité' }, { id: 'deadline', label: 'Date limite' }, { id: 'updated', label: 'Dernière modification' }, { id: 'title', label: 'Titre' }], libState.sort);
      var arch = h('input', { type: 'checkbox', checked: libState.archived });
      var bar = h('div', { class: 'toolbar' }, ui.field('Rechercher', q, { className: 'grow' }), ui.field('Type', typeSel), ui.field('Catégorie', catSel), ui.field('Rubrique', rubSel), ui.field('Validation', stSel), ui.field('Trier par', sortSel),
        h('label', { class: 'check', style: { marginBottom: '8px' } }, arch, 'Afficher les archives'));
      el.appendChild(bar);
      var count = h('p', { class: 'muted small' });
      el.appendChild(count);
      var list = h('div', { class: 'cards' });
      el.appendChild(list);
      function draw() {
        libState.q = q.value; libState.type = typeSel.value; libState.cat = catSel.value; libState.rubric = rubSel.value; libState.status = stSel.value; libState.archived = arch.checked; libState.sort = sortSel.value;
        var needle = libState.q.trim().toLocaleLowerCase('fr');
        var items = p.items.filter(function (it) {
          if (it.archived && !libState.archived) return false;
          if (libState.type && it.type !== libState.type) return false;
          if (libState.cat && it.categoryId !== libState.cat) return false;
          if (libState.status && it.editorialStatus !== libState.status) return false;
          if (libState.rubric && C.compose.classify(it, ref, p.settings).rubric !== libState.rubric) return false;
          if (needle && [it.title, it.subtitle, it.location, it.summary, it.description].join(' ').toLocaleLowerCase('fr').indexOf(needle) < 0) return false;
          return true;
        });
        items.sort(libState.sort === 'deadline' ? C.compose.byDeadline : libState.sort === 'updated' ? function (a, b) { return String(b.updatedAt).localeCompare(String(a.updatedAt)); } : libState.sort === 'title' ? function (a, b) { return String(a.title).localeCompare(String(b.title), 'fr'); } : C.compose.byDate);
        ui.clear(list);
        count.textContent = items.length + ' fiche(s) affichée(s) sur ' + p.items.length + '.';
        if (!items.length) { list.appendChild(h('div', { class: 'empty', style: { gridColumn: '1 / -1' } }, p.items.length ? 'Aucune fiche ne correspond aux filtres.' : 'La bibliothèque est vide : créez une fiche ou chargez la démonstration depuis le tableau de bord.')); return; }
        items.forEach(function (it) { list.appendChild(card(it)); });
      }
      function card(it) {
        var cls = C.compose.classify(it, ref, p.settings);
        var thumb = h('div', { class: 'thumb', role: 'link', tabindex: '0', 'aria-label': 'Modifier ' + it.title, onclick: function () { App.go('#/fiche/' + it.id); }, onkeydown: function (e) { if (e.key === 'Enter') App.go('#/fiche/' + it.id); } });
        thumb.appendChild(ui.slideFrame(itemSlides(it)[0], { lazy: true, checkOverflow: false }).frame);
        var dates = it.type === 'activity' ? D.fmtRangeShort(it.dateStart, it.dateEnd) : it.type === 'calendar' ? D.monthLabel(it.calendar.month) : '';
        var c = h('article', { class: 'fcard' + (it.archived ? ' archived' : '') }, thumb,
          h('div', { class: 'body' },
            h('div', { class: 'row', style: { gap: '6px' } }, ui.catChip(p, it), ui.rubricChip(cls), it.editorialStatus === 'approved' ? h('span', { class: 'chip ok' }, 'Validée') : it.editorialStatus === 'review' ? h('span', { class: 'chip warn' }, 'À relire') : null),
            h('h3', {}, it.title || 'Sans titre'),
            h('div', { class: 'meta' }, [ui.typeLabel(it.type), dates, it.regEnd ? 'inscriptions jusqu’au ' + D.fmtShort(it.regEnd, true) : ''].filter(Boolean).join(' · '))),
          h('div', { class: 'actions' },
            h('a', { class: 'btn small primary', href: '#/fiche/' + it.id }, 'Modifier'),
            h('button', { class: 'btn small', type: 'button', onclick: function () { App.addToIssue(it); } }, '+ MEL'),
            h('button', { class: 'btn small', type: 'button', onclick: function () { var copy = App.duplicateItem(it); App.go('#/fiche/' + copy.id); } }, 'Dupliquer'),
            h('button', { class: 'btn small', type: 'button', onclick: function () { it.archived = !it.archived; it.updatedAt = new Date().toISOString(); App.save('items'); draw(); ui.toast(it.archived ? 'Fiche archivée (réutilisable à tout moment).' : 'Fiche réactivée.'); } }, it.archived ? 'Désarchiver' : 'Archiver'),
            h('button', { class: 'btn small danger', type: 'button', onclick: function () { App.deleteItem(it).then(function (ok) { if (ok) draw(); }); } }, 'Supprimer')));
        return c;
      }
      [q].forEach(function (x) { x.addEventListener('input', ui.debounce(draw, 150)); });
      [typeSel, catSel, rubSel, stSel, sortSel, arch].forEach(function (x) { x.addEventListener('change', draw); });
      draw();
    }
  };
  App.duplicateItem = function (it) {
    var copy = C.model.normalizeItem(JSON.parse(JSON.stringify(it)));
    copy.id = C.model.uid('fiche'); copy.title = (it.title || 'Fiche') + ' (copie)'; copy.archived = false; copy.editorialStatus = 'draft';
    copy.createdAt = copy.updatedAt = new Date().toISOString(); delete copy.legacy;
    App.p().items.push(copy); App.save('items');
    ui.toast('Fiche dupliquée.');
    return copy;
  };
  App.deleteItem = function (it) {
    var p = App.p();
    var uses = p.issues.filter(function (is) { return is.pages.some(function (pg) { return pg.itemId === it.id; }); }).length;
    return ui.confirm('Supprimer la fiche', '« ' + (it.title || 'Sans titre') + ' » sera placée dans la corbeille (restauration possible depuis « Sauvegardes & exports »).' + (uses ? '\n\nAttention : elle est utilisée dans ' + uses + ' MEL. Préférez « Archiver » pour la conserver.' : ''), 'Mettre à la corbeille', true).then(function (ok) {
      if (!ok) return false;
      C.store.trashItem(it.id);
      ui.toast('Fiche placée dans la corbeille.');
      return true;
    });
  };
  App.addToIssue = function (it) {
    var issue = App.ensureIssue();
    if (issue.pages.some(function (pg) { return pg.itemId === it.id; })) { ui.toast('Cette fiche figure déjà dans le MEL de la semaine ' + issue.week + '.'); return; }
    issue.pages.push(C.model.blankPage('item', { itemId: it.id }));
    issue.pages = C.compose.enforceOrder(issue.pages, App.p());
    App.save('issues');
    ui.toast('Ajoutée au MEL de la semaine ' + issue.week + '.', 'ok');
  };

  /* =============== MODÈLES =============== */
  var sample = null;
  function sampleProject() {
    if (sample) return sample;
    var photo = function (t) { return C.images.putTemp('img:demo-' + t, C.demoArt.paint(t, 900, 600)); };
    sample = C.demo.build(App.defaultRefDate(), photo);
    return sample;
  }
  App.views.templates = {
    title: 'Modèles',
    render: function (el) {
      el.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Modèles de diapositives'),
        h('p', { class: 'lead' }, '13 modèles construits sur un moteur commun : les blocs absents (photo, tarifs, points, contacts…) libèrent leur place automatiquement. Exemples ci-dessous avec des données fictives.'))));
      var sp = sampleProject(), issue = sp.issues[0];
      var gal = h('div', { class: 'tgal' });
      C.templates.TEMPLATES.forEach(function (t) {
        var page = samplePage(sp, issue, t);
        var slide = page ? C.templates.renderPage(page, sp, issue)[0] : null;
        var actions = h('div', { class: 'btn-group' });
        if (['cover', 'news', 'last', 'upcoming-list', 'upcoming-table'].indexOf(t.id) >= 0) {
          actions.appendChild(h('button', { class: 'btn small primary', type: 'button', onclick: function () { App.addSpecialPage(t.id); } }, 'Ajouter au MEL'));
        } else {
          var type = t.for[0];
          actions.appendChild(h('button', { class: 'btn small primary', type: 'button', onclick: function () { App.go('#/fiche/nouvelle/' + type + '/' + t.id); } }, 'Nouvelle fiche avec ce modèle'));
        }
        if (slide) actions.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { App.fullscreen([slide]); } }, 'Agrandir'));
        gal.appendChild(h('article', { class: 'tcard' }, slide ? ui.slideFrame(slide, { lazy: true, checkOverflow: false }).frame : h('div', { class: 'empty' }, 'Aperçu indisponible'),
          h('div', { class: 'b' }, h('h3', {}, t.name), h('p', {}, t.desc), h('p', { class: 'small' }, h('b', {}, 'Famille : '), t.family), actions)));
      });
      el.appendChild(gal);
    }
  };
  function samplePage(sp, issue, t) {
    var M = C.model;
    if (t.id === 'cover') return issue.pages.find(function (p) { return p.kind === 'cover'; });
    if (t.id === 'news' || t.id === 'last') return M.blankPage(t.id);
    if (t.id === 'upcoming-list') return M.blankPage('upcoming');
    if (t.id === 'upcoming-table') return M.normalizePage({ kind: 'upcoming', opts: { style: 'table', categoryId: (sp.categories.find(function (c) { return c.name === 'Sorties culturelles'; }) || {}).id, title: 'Prévision des sorties culturelles' } });
    var pick = { calendar: 'calendar', rules: 'rules', partner: 'partner', info: 'info' }[t.id];
    var it = pick ? sp.items.find(function (x) { return x.type === pick; }) : null;
    if (!it && t.id === 'classic') it = sp.items.find(function (x) { return /Jura/.test(x.title); });
    if (!it && t.id === 'immersive') it = sp.items.find(function (x) { return /Ludoth/.test(x.title); });
    if (!it && t.id === 'poster') it = sp.items.find(function (x) { return /Karting/.test(x.title); });
    if (!it && t.id === 'animation') it = sp.items.find(function (x) { return /Concert/.test(x.title); });
    return it ? M.blankPage('item', { itemId: it.id, template: t.id }) : null;
  }
  App.addSpecialPage = function (tid) {
    var issue = App.ensureIssue();
    var M = C.model, pg;
    if (tid === 'cover') { if (issue.pages.some(function (x) { return x.kind === 'cover'; })) { ui.toast('Ce MEL a déjà une couverture.'); App.go('#/mel'); return; } pg = M.blankPage('cover'); }
    else if (tid === 'news' || tid === 'last') pg = M.blankPage(tid);
    else pg = M.normalizePage({ kind: 'upcoming', opts: { style: tid === 'upcoming-table' ? 'table' : 'list' } });
    issue.pages.push(pg);
    issue.pages = C.compose.enforceOrder(issue.pages, App.p());
    App.composerSelect = pg.id;
    App.save('issues');
    App.go('#/mel');
  };

  /* =============== PARAMÈTRES =============== */
  App.views.settings = {
    title: 'Paramètres',
    render: function (el) {
      var p = App.p(), s = p.settings;
      el.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Paramètres du CSE'), h('p', { class: 'lead' }, 'Réglages communs à toutes les fiches et à tous les MEL de cet appareil. Enregistrement automatique.'))));
      var nav = h('nav', { class: 'subnav', 'aria-label': 'Sections des paramètres' });
      var content = h('div');
      el.appendChild(h('div', { class: 'settings' }, nav, content));
      function section(id, title, nodes) {
        nav.appendChild(h('a', { href: '#/parametres', onclick: function (e) { e.preventDefault(); document.getElementById('set-' + id).scrollIntoView({ behavior: 'smooth' }); } }, title));
        content.appendChild(h('section', { class: 'card', id: 'set-' + id }, h('h2', {}, title), nodes));
      }
      function text(key, label, opts) {
        opts = opts || {};
        var inp = h('input', { type: opts.type || 'text', value: s[key] || '' });
        inp.addEventListener('input', function () { s[key] = inp.value; App.save('settings'); });
        inp.addEventListener('change', function () { if (opts.type === 'url' && inp.value && !C.compose.validUrl(inp.value)) ui.toast('Adresse invalide : elle doit commencer par https://', 'error'); });
        return ui.field(label, inp, opts);
      }
      section('identite', 'Identité et liens', [
        h('div', { class: 'cols' }, text('orgName', 'Nom du CSE'), text('melTitle', 'Titre du MEL', { help: 'Ex. « MEL DU CSE » → « MEL DU CSE – SEMAINE 46 ».' })),
        text('portalUrl', 'Portail CSE (lien par défaut des boutons)', { type: 'url', help: 'Up Expert / Kalidea. Le lien mène à l’accueil du portail : les inscriptions restent gérées dans Kalidea.' }),
        text('planningUrl', 'Lien « vue d’ensemble des activités » (couverture, facultatif)', { type: 'url' }),
        text('planningLabel', 'Texte de ce lien'),
        text('canvaUrl', 'Présentation Canva du MEL (ouverture)', { type: 'url' }),
        text('footerNote', 'Mention en bas de chaque diapositive (facultatif)')
      ]);
      // Règles éditoriales
      var newDays = h('input', { type: 'number', min: 0, max: 90, value: s.newDays });
      newDays.addEventListener('change', function () { s.newDays = Math.max(0, Math.min(90, parseInt(newDays.value, 10) || 0)); App.save('settings'); });
      var lastDays = h('input', { type: 'number', min: 1, max: 31, value: s.lastDays });
      lastDays.addEventListener('change', function () { s.lastDays = Math.max(1, Math.min(31, parseInt(lastDays.value, 10) || 7)); App.save('settings'); });
      var dens = ui.selectEl(C.model.DENSITIES, s.defaultDensity);
      dens.addEventListener('change', function () { s.defaultDensity = dens.value; App.save('settings'); });
      var num = h('input', { type: 'checkbox', checked: s.numbering });
      num.addEventListener('change', function () { s.numbering = num.checked; App.save('settings'); });
      section('regles', 'Règles éditoriales', [
        h('div', { class: 'cols' },
          ui.field('Nouveauté automatique (jours après création)', newDays, { help: '0 = uniquement les fiches marquées « Nouveauté ».' }),
          ui.field('Fenêtre « Dernière semaine » (jours)', lastDays, { help: 'Clôture entre la date du MEL et J+' + s.lastDays + ' inclus.' }),
          ui.field('Densité par défaut', dens)),
        h('label', { class: 'check' }, num, 'Numéroter les pages par défaut dans les nouveaux MEL')
      ]);
      // Tarifs
      var mod = h('input', { type: 'checkbox', checked: s.pricingModule });
      mod.addEventListener('change', function () { s.pricingModule = mod.checked; App.save('settings'); ui.toast(mod.checked ? 'Module Tarifs CSE affiché.' : 'Module Tarifs CSE masqué partout (les montants restent enregistrés).'); });
      var rates = h('div', { class: 'rates' });
      var example = h('p', { class: 'small muted' });
      function exampleText() {
        var r = C.pricing.fromPricing({ enabled: true, mode: 'tranches', outside: 2400 }, s);
        example.textContent = 'Contrôle : prix extérieur 2 400 € → ' + r.rows.map(function (x) { return x.label + ' ' + C.pricing.money(x.price); }).join(' · ');
      }
      s.rates.forEach(function (v, i) {
        var inp = h('input', { type: 'number', min: 0, max: 100, step: 0.5, value: v, 'aria-label': 'Subvention T' + (i + 1) + ' en %' });
        inp.addEventListener('change', function () { s.rates[i] = Math.max(0, Math.min(100, Number(inp.value) || 0)); App.save('settings'); exampleText(); });
        rates.appendChild(h('label', {}, 'T' + (i + 1) + ' · subvention %', inp));
      });
      var stepSel = ui.selectEl(C.pricing.ROUNDINGS, s.rounding.step);
      var modeSel = ui.selectEl([{ id: 'nearest', label: 'Au plus proche' }, { id: 'down', label: 'Inférieur' }, { id: 'up', label: 'Supérieur' }], s.rounding.mode);
      [stepSel, modeSel].forEach(function (x) { x.addEventListener('change', function () { s.rounding = { step: stepSel.value, mode: modeSel.value }; App.save('settings'); exampleText(); }); });
      exampleText();
      section('tarifs', 'Tarifs CSE', [
        h('label', { class: 'check' }, mod, 'Afficher le module « Tarifs CSE » (fiches et diapositives)'),
        h('div', { class: 'alert warn small' }, 'Barème de départ (70 % → 25 %) fourni à titre indicatif : à confirmer par le CSE avant diffusion. Prix salarié = prix extérieur × (1 − taux), arrondi ci-dessous.'),
        rates, h('div', { class: 'cols', style: { marginTop: '10px' } }, ui.field('Arrondi', stepSel), ui.field('Sens de l’arrondi', modeSel)), example
      ]);
      section('categories', 'Catégories', [categoriesEditor(p)]);
      section('referents', 'Référents enregistrés', [referentsEditor(p)]);
      var mCal = h('input', { value: s.mentions.calendar || '' });
      mCal.addEventListener('input', function () { s.mentions.calendar = mCal.value; App.save('settings'); });
      var mUp = h('input', { value: s.mentions.upcoming || '' });
      mUp.addEventListener('input', function () { s.mentions.upcoming = mUp.value; App.save('settings'); });
      section('mentions', 'Mentions récurrentes', [ui.field('Sous les calendriers', mCal), ui.field('Sous les programmes à venir', mUp)]);
      section('partage', 'Espace partagé (Supabase, facultatif)', [App.cloud && App.cloud.settingsPanel ? App.cloud.settingsPanel() : h('p', {}, 'Module indisponible.')]);
      section('canva', 'Canva', [canvaPanel(s)]);
    }
  };
  function canvaPanel(s) {
    return h('div', {},
      h('p', {}, 'CSE Studio exporte un PowerPoint (.pptx) aux textes modifiables, prêt à importer dans Canva.'),
      h('ol', { class: 'small' },
        h('li', {}, 'Dans « Composer le MEL », cliquer sur « Exporter le MEL (.pptx) » (ou exporter une seule diapositive).'),
        h('li', {}, 'Dans Canva : Créer un design → Importer un fichier → choisir le .pptx. Canva crée une présentation modifiable.'),
        h('li', {}, 'Pour compléter la présentation partagée : sélectionner les pages importées, Copier, puis les Coller dans la présentation du MEL.')),
      h('div', { class: 'alert info small' }, h('b', {}, 'Pourquoi pas d’ajout automatique ? '), 'Un lien Canva « modifiable » ne donne aucune autorisation à une application tierce. L’API officielle Canva Connect permet d’importer un PPTX, et l’insertion de pages dans un design existant (API « merges ») est encore en préversion ; elle exige une application Canva autorisée, des crédits API de l’équipe et un serveur sécurisé. Le dossier supabase/functions/canva-publish contient une ébauche serveur NON démontrée : voir le README.'),
      s.canvaUrl ? h('a', { class: 'btn', href: s.canvaUrl, target: '_blank', rel: 'noopener noreferrer' }, '↗ Ouvrir la présentation Canva') : null);
  }
  function categoriesEditor(p) {
    var box = h('div');
    function used(id) { return p.items.filter(function (it) { return it.categoryId === id; }).length; }
    function draw() {
      ui.clear(box);
      box.appendChild(h('p', { class: 'small muted' }, '« Informations » reste toujours en premier. Renommer une catégorie met à jour toutes ses fiches. Une catégorie utilisée ne peut être supprimée qu’après reclassement explicite de ses fiches.'));
      p.categories.forEach(function (c, i) {
        var name = h('input', { value: c.name, 'aria-label': 'Nom de la catégorie' });
        name.addEventListener('change', function () {
          var v = name.value.trim().replace(/\s+/g, ' ').slice(0, 45);
          if (!v) { name.value = c.name; return; }
          if (p.categories.some(function (x) { return x !== c && x.name.toLocaleLowerCase('fr') === v.toLocaleLowerCase('fr'); })) { ui.toast('Ce nom existe déjà.', 'error'); name.value = c.name; return; }
          c.name = v; App.save('settings'); ui.toast('Catégorie renommée (' + used(c.id) + ' fiche(s) concernée(s)).');
        });
        var color = h('input', { type: 'color', value: c.color, 'aria-label': 'Couleur de ' + c.name });
        color.addEventListener('change', function () { c.color = color.value.toUpperCase(); App.save('settings'); });
        var up = h('button', { class: 'btn small icon', type: 'button', 'aria-label': 'Monter ' + c.name, disabled: i <= 1 || c.name === 'Informations', onclick: function () { var t = p.categories[i - 1]; p.categories[i - 1] = c; p.categories[i] = t; App.save('settings'); draw(); } }, '↑');
        var down = h('button', { class: 'btn small icon', type: 'button', 'aria-label': 'Descendre ' + c.name, disabled: i === 0 || i === p.categories.length - 1, onclick: function () { var t = p.categories[i + 1]; p.categories[i + 1] = c; p.categories[i] = t; App.save('settings'); draw(); } }, '↓');
        var del = h('button', { class: 'btn small danger', type: 'button', disabled: c.name === 'Informations', onclick: function () { removeCat(c); } }, 'Supprimer');
        box.appendChild(h('div', { class: 'cat-row' }, h('span', { class: 'muted small' }, String(i + 1)), color, name, h('span', { class: 'muted small' }, used(c.id) + ' fiche(s)'), h('div', { class: 'btn-group' }, up, down, del)));
      });
      var nn = h('input', { placeholder: 'Nouvelle catégorie…', maxlength: 45 });
      var add = h('button', { class: 'btn primary', type: 'button', onclick: function () {
        var v = nn.value.trim().replace(/\s+/g, ' ');
        if (!v) return ui.toast('Saisir un nom.', 'error');
        if (p.categories.some(function (x) { return x.name.toLocaleLowerCase('fr') === v.toLocaleLowerCase('fr'); })) return ui.toast('Cette catégorie existe déjà.', 'error');
        var id = 'cat-' + C.model.slug(v); while (p.categories.some(function (x) { return x.id === id; })) id += '-b';
        p.categories.push({ id: id, name: v, color: C.model.PALETTE[p.categories.length % C.model.PALETTE.length] });
        App.save('settings'); draw(); ui.toast('Catégorie ajoutée.');
      } }, '+ Ajouter');
      nn.addEventListener('keydown', function (e) { if (e.key === 'Enter') add.click(); });
      box.appendChild(h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', { style: { flex: 1, minWidth: '200px' } }, nn), add));
    }
    function removeCat(c) {
      var n = used(c.id);
      if (!n) { ui.confirm('Supprimer la catégorie', 'Supprimer « ' + c.name + ' » ? Aucune fiche ne l’utilise.', 'Supprimer', true).then(function (ok) { if (!ok) return; p.categories = p.categories.filter(function (x) { return x !== c; }); App.save('settings'); draw(); }); return; }
      var target = ui.selectEl(p.categories.filter(function (x) { return x !== c; }), 'cat-informations');
      ui.dialog({ title: 'Reclasser avant suppression', body: h('div', {}, h('p', {}, n + ' fiche(s) utilisent « ' + c.name + ' ». Choisir la catégorie qui les accueillera :'), ui.field('Nouvelle catégorie', target)),
        buttons: [{ label: 'Annuler', value: false }, { label: 'Reclasser et supprimer', kind: 'danger', value: true }] }).then(function (ok) {
        if (!ok) return;
        p.items.forEach(function (it) { if (it.categoryId === c.id) { it.categoryId = target.value; it.updatedAt = new Date().toISOString(); } });
        p.issues.forEach(function (is) { is.pages.forEach(function (pg) { if (pg.opts && pg.opts.categoryId === c.id) pg.opts.categoryId = target.value; }); });
        p.categories = p.categories.filter(function (x) { return x !== c; });
        App.save('settings'); draw(); ui.toast(n + ' fiche(s) reclassée(s), catégorie supprimée.');
      });
    }
    draw();
    return box;
  }
  function referentsEditor(p) {
    var box = h('div');
    function draw() {
      ui.clear(box);
      box.appendChild(h('p', { class: 'small muted' }, 'Référents réutilisables dans les fiches (bouton « Ajouter un référent enregistré »). Tous les champs sont facultatifs. Ne saisir que des coordonnées destinées à être diffusées.'));
      p.settings.referents.forEach(function (r, i) {
        var row = h('div', { class: 'contact-row' });
        ['name', 'email', 'phone', 'role'].forEach(function (k) {
          var inp = h('input', { type: k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text', value: r[k] || '', placeholder: { name: 'Nom', email: 'E-mail', phone: 'Téléphone', role: 'Fonction' }[k], 'aria-label': { name: 'Nom', email: 'E-mail', phone: 'Téléphone', role: 'Fonction' }[k] });
          inp.addEventListener('input', function () { r[k] = inp.value; App.save('settings'); });
          row.appendChild(inp);
        });
        row.appendChild(h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Retirer', onclick: function () { p.settings.referents.splice(i, 1); App.save('settings'); draw(); } }, '✕'));
        box.appendChild(row);
      });
      box.appendChild(h('button', { class: 'btn', type: 'button', onclick: function () { p.settings.referents.push({ name: '', email: '', phone: '', role: '' }); App.save('settings'); draw(); } }, '+ Ajouter un référent'));
    }
    draw();
    return box;
  }

  /* =============== SAUVEGARDES & EXPORTS =============== */
  App.views.exports = {
    title: 'Sauvegardes & exports',
    render: function (el) {
      var p = App.p();
      el.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Sauvegardes & exports'), h('p', { class: 'lead' }, 'Les données sont enregistrées dans ce navigateur. Téléchargez régulièrement une sauvegarde JSON (avec les images) : elle permet de changer d’ordinateur ou de partager la bibliothèque.'))));
      var grid = h('div', { class: 'grid cols-2' });
      el.appendChild(grid);
      grid.appendChild(h('div', { class: 'card' }, h('h2', {}, 'Sauvegarde complète'),
        h('p', { class: 'small muted' }, 'Fiches, catégories, paramètres, MEL et images. Format « ' + C.model.SCHEMA + ' ».'),
        h('div', { class: 'btn-group' },
          h('button', { class: 'btn primary', type: 'button', onclick: function () { ui.download(JSON.stringify(C.store.backupObject(), null, 1), 'CSE_Studio_sauvegarde_' + App.today() + '.json', 'application/json'); ui.toast('Sauvegarde téléchargée.', 'ok'); } }, '↓ Télécharger la sauvegarde (.json)'),
          h('button', { class: 'btn', type: 'button', onclick: importDialog }, '↑ Restaurer / importer un fichier'))));
      grid.appendChild(h('div', { class: 'card' }, h('h2', {}, 'Exports'),
        h('div', { class: 'btn-group' },
          h('button', { class: 'btn', type: 'button', onclick: function (e) { var is = App.activeIssue(); if (!is) return ui.toast('Aucun MEL.', 'error'); App.exportPptx(App.issueEntries(is), 'CSE_MEL_S' + is.week + '_' + is.year + '.pptx', e.currentTarget); } }, '↓ MEL en cours (.pptx)'),
          h('button', { class: 'btn', type: 'button', onclick: function () { var is = App.activeIssue(); if (!is) return ui.toast('Aucun MEL.', 'error'); App.print(App.issueEntries(is).map(function (x) { return x.slide; })); } }, '🖨 MEL en PDF (impression)'),
          h('button', { class: 'btn', type: 'button', onclick: exportCsv }, '↓ Bibliothèque (.csv)')),
        h('p', { class: 'small muted' }, 'Le CSV (séparateur « ; », UTF-8) s’ouvre dans un tableur. Pour l’impression PDF, choisir « Enregistrer au format PDF » et « Paysage ».')));
      // Instantanés
      var snaps = C.store.snapshots();
      var sc = h('div', { class: 'card' }, h('h2', {}, 'Instantanés automatiques'), h('p', { class: 'small muted' }, 'Créés avant chaque migration, import ou remplacement (3 derniers conservés, sans les images).'));
      if (!snaps.length) sc.appendChild(h('p', { class: 'small' }, 'Aucun instantané.'));
      var sl = h('ul', { class: 'list' });
      snaps.forEach(function (s, i) {
        sl.appendChild(h('li', {}, h('span', { class: 'grow' }, h('b', {}, new Date(s.at).toLocaleString('fr-FR')), ' — ', s.reason, h('br'), h('span', { class: 'small muted' }, (s.project.items || []).length + ' fiche(s), ' + (s.project.issues || []).length + ' MEL')),
          h('button', { class: 'btn small', type: 'button', onclick: function () { ui.confirm('Restaurer cet instantané', 'L’état actuel sera lui-même sauvegardé dans un instantané avant restauration.', 'Restaurer').then(function (ok) { if (ok && C.store.restoreSnapshot(i)) ui.toast('Instantané restauré.', 'ok'); }); } }, 'Restaurer')));
      });
      sc.appendChild(sl);
      grid.appendChild(sc);
      // Corbeille
      var trash = p.trash || [];
      var tc = h('div', { class: 'card' }, h('h2', {}, 'Corbeille (' + trash.length + ')'));
      var tl = h('ul', { class: 'list' });
      trash.forEach(function (e, i) {
        tl.appendChild(h('li', {}, h('span', { class: 'grow' }, h('span', { class: 'title' }, e.item.title || 'Sans titre'), h('span', { class: 'small muted' }, 'Supprimée le ' + new Date(e.at).toLocaleString('fr-FR'))),
          h('button', { class: 'btn small', type: 'button', onclick: function () { C.store.restoreTrash(i); ui.toast('Fiche restaurée.', 'ok'); App.refresh(); } }, 'Restaurer')));
      });
      tc.appendChild(trash.length ? tl : h('p', { class: 'small muted' }, 'La corbeille est vide.'));
      if (trash.length) tc.appendChild(h('button', { class: 'btn danger small', type: 'button', onclick: function () { ui.confirm('Vider la corbeille', 'Les ' + trash.length + ' fiche(s) seront définitivement supprimées de ce navigateur.', 'Vider définitivement', true).then(function (ok) { if (ok) { C.store.emptyTrash(); App.refresh(); } }); } }, 'Vider la corbeille'));
      grid.appendChild(tc);
      // Anciennes versions
      var leg = C.store.legacyPresent();
      grid.appendChild(h('div', { class: 'card' }, h('h2', {}, 'Données des versions précédentes'),
        leg.length ? h('div', {}, h('p', { class: 'small' }, 'Clés V6–V8 présentes et conservées dans ce navigateur : ', leg.join(', '), '.'),
          h('div', { class: 'btn-group' },
            h('button', { class: 'btn', type: 'button', onclick: function () { ui.download(JSON.stringify(C.store.legacyDump(), null, 1), 'CSE_Studio_donnees_V6-V8_' + App.today() + '.json', 'application/json'); } }, '↓ Télécharger les données brutes'),
            h('button', { class: 'btn', type: 'button', onclick: reimportLegacy }, 'Réimporter dans la V9'))) : h('p', { class: 'small muted' }, 'Aucune donnée V6–V8 dans ce navigateur. Les fichiers JSON de ces versions s’importent avec « Restaurer / importer ».')));
      // Stockage
      var u = C.store.storageUsage();
      grid.appendChild(h('div', { class: 'card' }, h('h2', {}, 'Stockage'),
        h('p', { class: 'small' }, 'Données texte : ' + Math.round(u.localBytes / 1024) + ' Ko (limite navigateur ≈ 5 Mo). Images : ' + u.images.count + ' (' + Math.round(u.images.bytes / 1024) + ' Ko) ' + (u.images.persistent ? 'dans IndexedDB.' : '— IndexedDB indisponible : images conservées seulement pendant la session.'))));
    }
  };
  function exportCsv() {
    var p = App.p(), ref = App.refDate();
    var cols = ['Titre', 'Type', 'Catégorie', 'Rubrique au ' + ref, 'Début', 'Fin', 'Horaires', 'Lieu', 'Ouverture inscriptions', 'Clôture inscriptions', 'Résumé', 'Contacts', 'Participants min', 'Participants max', 'Points', 'Compteur', 'Tarifs', 'Lien', 'Validation', 'Archivée'];
    var esc = function (v) { return '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"'; };
    var rows = p.items.map(function (it) {
      var pr = C.pricing.fromPricing(it.pricing, p.settings);
      return [it.title, C.ui.typeLabel(it.type), C.model.categoryName(p, it), (C.compose.RUBRICS[C.compose.classify(it, ref, p.settings).rubric] || {}).label, it.dateStart, it.dateEnd, [it.timeStart, it.timeEnd].filter(Boolean).join('-'), it.location, it.regStart, it.regEnd, it.summary,
        C.templates.contactText(it), it.minPart, it.maxPart, it.points.value, it.points.counter, pr.rows.map(function (r) { return r.label + ' ' + r.price; }).join(' / '), C.compose.linkOf(it, p.settings), it.editorialStatus, it.archived ? 'oui' : ''].map(esc).join(';');
    });
    ui.download('﻿' + cols.map(esc).join(';') + '\r\n' + rows.join('\r\n') + '\r\n', 'CSE_Studio_bibliotheque_' + App.today() + '.csv', 'text/csv;charset=utf-8');
  }
  function importDialog() {
    ui.pickFile('.json,application/json').then(function (files) {
      var f = files[0]; if (!f) return;
      if (f.size > 80 * 1024 * 1024) return ui.toast('Fichier trop volumineux (80 Mo maximum).', 'error');
      ui.readFileText(f).then(function (txt) {
        var obj; try { obj = JSON.parse(txt); } catch (e) { throw Error('Ce fichier n’est pas un JSON valide.'); }
        var pre = C.migrate.fromBackup(obj, App.p());
        var body = h('div', {}, h('p', {}, 'Fichier : ', h('b', {}, f.name)), h('p', {}, 'Format détecté : ', h('b', {}, pre.kind), ' · ', pre.report.items + ' fiche(s), ' + pre.report.issues + ' MEL.'),
          pre.report.notes.length ? h('p', { class: 'small muted' }, pre.report.notes.join(' ')) : null,
          h('div', { class: 'alert info small' }, '« Fusionner » ajoute ces éléments sans rien effacer. « Remplacer » remplace toutes les données de ce navigateur (un instantané est créé avant).'));
        return ui.dialog({ title: 'Importer une sauvegarde', body: body, buttons: [{ label: 'Annuler', value: null }, { label: 'Remplacer tout', kind: 'danger', value: 'replace' }, { label: 'Fusionner (recommandé)', kind: 'primary', value: 'merge' }] }).then(function (mode) {
          if (!mode) return;
          return C.store.importBackup(obj, mode).then(function (rep) { ui.toast('Import terminé : ' + rep.items + ' fiche(s), ' + rep.issues + ' MEL' + (rep.images ? ', ' + rep.images + ' image(s)' : '') + '.', 'ok'); });
        });
      }).catch(function (e) { ui.toast('Import impossible : ' + e.message, 'error'); });
    });
  }
  function reimportLegacy() {
    var r = C.migrate.fromLegacyStorage(localStorage);
    if (!r) return ui.toast('Aucune donnée ancienne lisible.', 'error');
    ui.confirm('Réimporter les données V6–V8', r.report.items + ' fiche(s) et ' + r.report.issues + ' MEL seront AJOUTÉS à la bibliothèque actuelle (aucune suppression). Des doublons peuvent apparaître : ils seront signalés.', 'Ajouter').then(function (ok) {
      if (!ok) return;
      C.store.snapshot('Avant réimport des données V6–V8');
      var merged = C.migrate.merge(App.p(), r.project);
      C.store.internImages(merged).then(function () { C.store.set(merged, 'replace'); ui.toast('Données anciennes ajoutées.', 'ok'); });
    });
  }
})(window);
