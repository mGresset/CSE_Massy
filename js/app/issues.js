/* CSE Studio V10 · « Mes MEL » : liste des numéros, duplication vers la semaine suivante,
 * rapport de différences, statuts (brouillon → publié figé), contrôle final avant export. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;
  var listState = { q: '', status: '' };

  function statusLabel(id) { return (C.compose.ISSUE_STATUS.find(function (s) { return s.id === id; }) || { label: id }).label; }
  function melTitle(is) { return (is.title || App.p().settings.melTitle || 'MEL du CSE') + ' · semaine ' + is.week + ' · ' + is.year; }

  App.views.issues = {
    title: 'Mes MEL',
    render: function (el) {
      var p = App.p();
      var latest = p.issues.slice().sort(function (a, b) { return b.refDate.localeCompare(a.refDate); })[0];
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Mes MEL'), h('p', { class: 'lead' }, 'Chaque semaine : repartir du MEL précédent, ne changer que ce qui évolue, contrôler, exporter.')),
        h('div', { class: 'btn-group' },
          App.undoButtons(),
          latest ? h('button', { class: 'btn primary', type: 'button', onclick: function () { App.duplicateIssueDialog(latest); } }, '⧉ Nouveau MEL à partir de la semaine ' + latest.week) : null,
          h('button', { class: 'btn', type: 'button', onclick: function () { App.newIssueDialog(); } }, '+ MEL vierge ou composé automatiquement'))));
      var q = h('input', { type: 'search', value: listState.q, placeholder: 'Rechercher : semaine, année, titre…', 'aria-label': 'Rechercher un MEL' });
      var stSel = ui.selectEl([{ id: '', label: 'Tous les statuts' }].concat(C.compose.ISSUE_STATUS), listState.status, { 'aria-label': 'Filtrer par statut' });
      el.appendChild(h('div', { class: 'card toolbar' }, h('div', { style: { flex: 2, minWidth: '220px' } }, q), h('div', { style: { flex: 1, minWidth: '160px' } }, stSel)));
      var box = h('div', { class: 'mel-list' });
      el.appendChild(box);
      function draw() {
        ui.clear(box);
        var n = listState.q.trim().toLocaleLowerCase('fr');
        var issues = p.issues.slice().sort(function (a, b) { return b.refDate.localeCompare(a.refDate); }).filter(function (is) {
          if (listState.status && is.status !== listState.status) return false;
          if (!n) return true;
          return (melTitle(is) + ' s' + is.week + ' ' + is.refDate + ' ' + D.fmtLong(is.refDate)).toLocaleLowerCase('fr').indexOf(n) >= 0;
        });
        if (!issues.length) { box.appendChild(h('div', { class: 'card empty' }, p.issues.length ? 'Aucun MEL ne correspond à la recherche.' : 'Aucun MEL pour l’instant. Créez le premier avec « MEL vierge ou composé automatiquement ».')); return; }
        issues.forEach(function (is) {
          var frozen = C.compose.isFrozen(is);
          var included = is.pages.filter(function (pg) { return pg.included; }).length;
          var alerts = C.compose.audit(p, is).filter(function (a) { return a.level !== 'info'; });
          var blocks = alerts.filter(function (a) { return a.level === 'block'; }).length;
          var cover = (is.pages.find(function (pg) { return pg.kind === 'cover'; }) || null);
          var thumb = h('div', { class: 'mini' });
          if (cover) { try { var s0 = C.templates.renderIssue(p, Object.assign({}, is, { pages: [cover] }))[0]; if (s0 && s0.slides[0]) thumb.appendChild(ui.slideFrame(s0.slides[0], { lazy: true, checkOverflow: false }).frame); } catch (e) { /* aperçu facultatif */ } }
          var row = h('article', { class: 'card mel-row' + (is.id === p.activeIssueId ? ' current' : '') },
            thumb,
            h('div', { class: 'grow' },
              h('h3', {}, h('a', { href: '#/mel/' + is.id }, melTitle(is))),
              h('p', { class: 'small muted', style: { margin: '2px 0 6px' } }, 'Référence ' + D.fmtLong(is.refDate) + ' · modifié le ' + new Date(is.updatedAt || is.createdAt).toLocaleDateString('fr-FR') + (is.sourceIssueId ? ' · repris de la semaine ' + ((p.issues.find(function (x) { return x.id === is.sourceIssueId; }) || {}).week || '?') : '')),
              h('div', { class: 'row' },
                h('span', { class: 'chip st-' + is.status }, statusLabel(is.status)),
                h('span', { class: 'chip' }, included + ' page(s)'),
                alerts.length ? h('span', { class: 'chip ' + (blocks ? 'closed' : 'last') }, (blocks ? blocks + ' bloquante(s) · ' : '') + alerts.length + ' alerte(s)') : h('span', { class: 'chip new' }, 'aucune alerte'),
                frozen ? h('span', { class: 'chip' }, 'figé le ' + new Date(is.snapshot.frozenAt).toLocaleDateString('fr-FR')) : null)),
            h('div', { class: 'btn-group mel-actions' },
              h('a', { class: 'btn small primary', href: '#/mel/' + is.id }, 'Ouvrir'),
              h('button', { class: 'btn small', type: 'button', onclick: function () { App.duplicateIssueDialog(is); } }, 'Dupliquer vers la semaine suivante'),
              h('button', { class: 'btn small', type: 'button', onclick: function () { rename(is); } }, 'Renommer'),
              h('button', { class: 'btn small', type: 'button', onclick: function () { App.fullscreen(App.issueEntries(is).map(function (e) { return e.slide; })); } }, 'Prévisualiser'),
              h('button', { class: 'btn small', type: 'button', onclick: function (e) { App.exportIssue(is, e.currentTarget); } }, 'Exporter'),
              is.status !== 'archived' ? h('button', { class: 'btn small', type: 'button', onclick: function () { App.changeIssueStatus(is, 'archived').then(draw); } }, 'Archiver') : h('button', { class: 'btn small', type: 'button', onclick: function () { App.changeIssueStatus(is, frozen ? 'published' : 'draft').then(draw); } }, 'Désarchiver'),
              h('button', { class: 'btn small danger', type: 'button', onclick: function () { remove(is); } }, 'Supprimer')));
          box.appendChild(row);
        });
      }
      function rename(is) {
        var inp = h('input', { value: is.title || '', placeholder: p.settings.melTitle || 'MEL DU CSE', maxlength: 120 });
        ui.dialog({ title: 'Renommer le MEL', body: ui.field('Titre affiché sur la couverture', inp, { help: 'Vide : titre par défaut des paramètres (' + (p.settings.melTitle || 'MEL DU CSE') + ').' }), buttons: [{ label: 'Annuler', value: false }, { label: 'Renommer', kind: 'primary', value: true }] }).then(function (ok) {
          if (!ok) return; is.title = inp.value.trim(); is.updatedAt = new Date().toISOString(); App.save('issues'); draw();
        });
      }
      function remove(is) {
        ui.confirm('Supprimer le MEL', '« ' + melTitle(is) + ' » sera supprimé de cet appareil (les fiches de la bibliothèque ne sont pas touchées). Un instantané de sécurité est créé ; ↶ annule aussi la suppression.', 'Supprimer', true).then(function (ok) {
          if (!ok) return;
          C.store.snapshot('Avant suppression du MEL semaine ' + is.week);
          p.issues.splice(p.issues.indexOf(is), 1);
          if (p.activeIssueId === is.id) p.activeIssueId = (p.issues[p.issues.length - 1] || {}).id || '';
          App.save('issues'); draw(); ui.toast('MEL supprimé (instantané de sécurité disponible dans Sauvegardes & exports).');
        });
      }
      q.addEventListener('input', ui.debounce(function () { listState.q = q.value; draw(); }, 150));
      stSel.addEventListener('change', function () { listState.status = stSel.value; draw(); });
      draw();
    }
  };

  /** Nouveau MEL : vierge (couverture + permanences + règlement), composé automatiquement, ou repris d'une semaine. */
  App.newIssueDialog = function () {
    var p = App.p();
    var ref = h('input', { type: 'date', value: App.defaultRefDate() });
    var wk = h('p', { class: 'small muted' });
    function upd() { var w = D.isoWeek(ref.value); wk.textContent = w ? 'Semaine ' + w.week + ' de ' + w.year : 'Date invalide'; }
    ref.addEventListener('input', upd); upd();
    var latest = p.issues.slice().sort(function (a, b) { return b.refDate.localeCompare(a.refDate); })[0];
    var modes = [{ id: 'auto', label: 'Composer automatiquement depuis la bibliothèque' }, { id: 'empty', label: 'MEL vierge : couverture, permanences et règlement' }];
    if (latest) modes.unshift({ id: 'copy', label: 'Reprendre le MEL de la semaine ' + latest.week + ' (recommandé)' });
    var mode = ui.selectEl(modes, latest ? 'copy' : 'auto');
    ui.dialog({ title: 'Nouveau MEL', body: h('div', {}, ui.field('Date de référence (lundi de diffusion)', ref), wk, ui.field('Point de départ', mode),
      h('p', { class: 'small muted' }, 'Les MEL précédents restent intacts et exportables. La reprise conserve pages fixes, personnalisations et exclusions, puis recalcule les rubriques à la nouvelle date.')),
    buttons: [{ label: 'Annuler', value: false }, { label: 'Créer', kind: 'primary', value: true, validate: function () { return D.isValid(ref.value); } }] }).then(function (ok) {
      if (!ok) return;
      if (mode.value === 'copy' && latest) { createFrom(latest, ref.value); return; }
      var is = C.model.blankIssue(ref.value);
      is.numbering = !!p.settings.numbering;
      if (mode.value === 'auto') is.pages = C.compose.autoCompose(p, is);
      else {
        var keep = p.items.filter(function (it) { return !it.archived && (it.type === 'calendar' || it.type === 'rules'); });
        is.pages = [C.model.blankPage('cover')].concat(keep.map(function (it) { return C.model.blankPage('item', { itemId: it.id }); }));
        is.pages = C.compose.enforceOrder(is.pages, p, is);
      }
      p.issues.push(is); p.activeIssueId = is.id;
      App.save('issues');
      App.go('#/mel/' + is.id);
      ui.toast('MEL de la semaine ' + is.week + ' créé.', 'ok');
    });
  };
  function createFrom(source, refDate) {
    var p = App.p();
    var dup = p.issues.some(function (x) { return x.refDate === refDate; });
    (dup ? ui.confirm('MEL déjà existant', 'Un MEL existe déjà pour le ' + D.fmtLong(refDate) + '. En créer un second quand même ?', 'Créer quand même') : Promise.resolve(true)).then(function (ok) { if (ok) doCreate(source, refDate); });
  }
  function doCreate(source, refDate) {
    var p = App.p();
    var r = C.compose.duplicateIssue(p, source, refDate);
    p.issues.push(r.issue); p.activeIssueId = r.issue.id;
    App.save('issues');
    App.go('#/mel/' + r.issue.id);
    App.reportDialog(r.issue);
  }
  /** Dupliquer vers la semaine suivante (ou une date choisie). Le MEL source n'est jamais modifié. */
  App.duplicateIssueDialog = function (source) {
    var ref = h('input', { type: 'date', value: C.compose.nextWeekRef(source.refDate) });
    var wk = h('p', { class: 'small muted' });
    function upd() { var w = D.isoWeek(ref.value); wk.textContent = w ? 'Nouvelle édition : semaine ' + w.week + ' de ' + w.year : 'Date invalide'; }
    ref.addEventListener('input', upd); upd();
    ui.dialog({ title: 'Créer le MEL suivant à partir de la semaine ' + source.week, body: h('div', {}, ui.field('Date de référence du nouveau MEL', ref), wk,
      h('ul', { class: 'small' },
        h('li', {}, 'Repris : couverture, permanences, informations permanentes, règlement, personnalisations, exclusions, modèles.'),
        h('li', {}, 'Recalculé à la nouvelle date : dernières chances, nouveautés (sans réannoncer une nouveauté au-delà de ' + App.p().settings.newMaxWeeks + ' semaine(s)), inscriptions en cours.'),
        h('li', {}, 'Retiré : activités expirées, closes ou annulées (elles restent dans le MEL d’origine).'),
        h('li', {}, 'Le MEL de la semaine ' + source.week + ' reste intact, consultable et exportable.')),
      C.compose.isFrozen(source) ? h('p', { class: 'small' }, 'Le MEL source est publié : les fiches modifiées depuis sa publication seront signalées.') : null),
    buttons: [{ label: 'Annuler', value: false }, { label: 'Créer le nouveau MEL', kind: 'primary', value: true, validate: function () { return D.isValid(ref.value); } }] }).then(function (ok) {
      if (ok) createFrom(source, ref.value);
    });
  };
  /** Rapport de différences produit par la duplication. */
  App.reportDialog = function (issue) {
    var r = issue.diffReport;
    if (!r) return;
    var secLabel = function (id) { var s = C.compose.SECTIONS.find(function (x) { return x.id === id; }); return s ? s.label.replace(/^\d+ · /, '') : id; };
    function block(title, list, fmt, cls) {
      if (!list.length) return null;
      return h('section', { class: 'report-block ' + (cls || '') }, h('h3', {}, title + ' (' + list.length + ')'), h('ul', { class: 'small' }, list.map(function (x) {
        return h('li', {}, fmt(x), x.pageId ? h('button', { class: 'linklike', type: 'button', onclick: function () { App.composerSelect = x.pageId; var d = document.querySelector('dialog'); if (d) d.close(); App.go('#/mel/' + issue.id); } }, ' → voir') : null);
      })));
    }
    var body = h('div', { class: 'report' },
      h('p', {}, 'MEL semaine ' + issue.week + ' créé à partir de la semaine ' + r.source.week + ' (' + D.fmtLong(r.source.refDate) + '), qui reste inchangée.'),
      block('À vérifier', r.review, function (x) { return '« ' + x.label + ' » : ' + x.reason; }, 'warn'),
      block('Déplacées dans une autre rubrique', r.moved, function (x) { return '« ' + x.label + ' » : ' + secLabel(x.from) + ' → ' + secLabel(x.to); }),
      block('Nouvelles pages', r.added, function (x) { return '« ' + x.label + ' » (' + secLabel(x.section) + ')'; }, 'ok'),
      block('Retirées (restent dans le MEL précédent)', r.removed, function (x) { return '« ' + x.label + ' » : ' + x.reason; }),
      block('Ne sont plus des nouveautés', r.notNewAnymore, function (x) { return '« ' + x.label + ' » (annoncée depuis le ' + D.fmtLong(x.since) + ')'; }),
      block('Conservées exclues', r.excluded, function (x) { return '« ' + x.label + ' »'; }),
      block('Conservées à l’identique', r.kept, function (x) { return '« ' + x.label + ' »'; }, 'muted'));
    ui.dialog({ title: 'Rapport de différences · semaine ' + issue.week, body: body, buttons: [{ label: 'Fermer', kind: 'primary', value: true }] }).then(function () { issue.diffReportSeen = true; App.save('issues'); });
  };
  /** Changement de statut ; « Publié » fige le MEL (instantané), « Brouillon » le rouvre. */
  App.changeIssueStatus = function (issue, status) {
    var p = App.p();
    var ask = Promise.resolve(true);
    if (status === 'published' && !C.compose.isFrozen(issue)) ask = ui.confirm('Publier et figer le MEL', 'Le MEL semaine ' + issue.week + ' sera figé tel quel : fiches, sélections, textes et photos. Les modifications ultérieures de la bibliothèque ne le changeront plus. Vous pourrez le rouvrir en brouillon si nécessaire.', 'Publier et figer');
    else if (C.compose.isFrozen(issue) && (status === 'draft' || status === 'review' || status === 'validated')) ask = ui.confirm('Rouvrir le MEL', 'Le MEL redevient modifiable et suit à nouveau la bibliothèque. L’instantané publié est conservé dans l’historique du MEL (3 derniers).', 'Rouvrir');
    return ask.then(function (ok) {
      if (!ok) return false;
      C.compose.setIssueStatus(p, issue, status);
      App.save('issues');
      ui.toast('Statut : ' + statusLabel(status) + '.', 'ok');
      return true;
    });
  };

  /** Contrôle final : toutes les pages, ordre, images, validations ; retour direct à une page ; export sélectif. */
  App.finalCheckDialog = function (issue, onSelect) {
    var p = App.p();
    var rendered = C.templates.renderIssue(p, issue, { all: true });
    var audit = C.compose.audit(p, issue);
    var images = audit.filter(function (a) { return a.code === 'image'; });
    var view = C.compose.issueView(p, issue);
    var sel = {}, n = 0, grid = h('div', { class: 'final-grid' });
    var statuses = { approved: 0, review: 0, draft: 0 }, seen = {};
    rendered.forEach(function (r) {
      var pg = r.page;
      if (pg.kind === 'item') { var it = C.compose.findItem(view.project, pg.itemId); if (it && !seen[it.id] && pg.included) { seen[it.id] = 1; statuses[it.editorialStatus] = (statuses[it.editorialStatus] || 0) + 1; } }
      sel[pg.id] = pg.included;
      r.slides.forEach(function (s, i) {
        if (pg.included) n++;
        var bad = s.overflow || s.warnings.some(function (w) { return w.level === 'block'; });
        var warn = !bad && s.warnings.some(function (w) { return w.level === 'warn'; });
        var cb = h('input', { type: 'checkbox', checked: pg.included, 'aria-label': 'Exporter « ' + App.pageLabel(pg) + ' »' });
        cb.addEventListener('change', function () { sel[pg.id] = cb.checked; grid.querySelectorAll('input[data-page="' + pg.id + '"]').forEach(function (x) { x.checked = cb.checked; }); });
        cb.dataset.page = pg.id;
        var fig = h('figure', { class: 'final-cell' + (pg.included ? '' : ' excluded') },
          ui.slideFrame(s, { lazy: true, checkOverflow: false }).frame,
          h('figcaption', {}, i === 0 ? cb : null, h('span', { class: 'grow' }, (pg.included ? n + '. ' : '— ') + App.pageLabel(pg) + (r.slides.length > 1 ? ' (' + (i + 1) + '/' + r.slides.length + ')' : '')),
            bad ? h('span', { class: 'chip closed' }, '⚠ à corriger') : warn ? h('span', { class: 'chip last' }, '!') : h('span', { class: 'chip new' }, '✓'),
            onSelect && !C.compose.isFrozen(issue) ? h('button', { class: 'btn small', type: 'button', onclick: function () { var d = document.querySelector('dialog'); if (d) d.close(); onSelect(pg.id); } }, 'Modifier') : null));
        grid.appendChild(fig);
      });
    });
    var blocks = audit.filter(function (a) { return a.level === 'block'; }), warns = audit.filter(function (a) { return a.level === 'warn'; });
    var rulesLast = (function () { var inc = view.issue.pages.filter(function (pg) { return pg.included; }); var last = inc[inc.length - 1]; var it = last && last.kind === 'item' ? C.compose.findItem(view.project, last.itemId) : null; return !it || it.type === 'rules' ? true : !inc.some(function (pg) { var x = pg.kind === 'item' ? C.compose.findItem(view.project, pg.itemId) : null; return x && x.type === 'rules'; }); })();
    var summary = h('div', { class: 'final-summary' },
      h('div', { class: 'kpi' }, h('b', {}, String(n)), h('span', {}, 'diapositives')),
      h('div', { class: 'kpi' }, h('b', {}, String(images.length)), h('span', {}, 'photo(s) non intégrable(s)')),
      h('div', { class: 'kpi' }, h('b', {}, String(blocks.length)), h('span', {}, 'point(s) bloquant(s)')),
      h('div', { class: 'kpi' }, h('b', {}, String(statuses.approved || 0) + ' / ' + Object.keys(seen).length), h('span', {}, 'fiches validées')));
    var ul = h('ul', { class: 'issues' });
    ul.appendChild(h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', {}, 'Date de référence : ' + D.fmtLong(issue.refDate) + ' · semaine ' + issue.week + ' · statut « ' + statusLabel(issue.status) + ' ».')));
    ul.appendChild(h('li', { class: rulesLast ? 'ok' : 'warn' }, h('span', { class: 'ic' }, rulesLast ? '✓' : '!'), h('span', {}, rulesLast ? 'Ordre éditorial respecté : couverture en tête, règlement en fin.' : 'Le règlement n’est pas en dernière position.')));
    ul.appendChild(h('li', { class: 'ok' }, h('span', { class: 'ic' }, '↗'), h('span', {}, 'Lien « Plus d’infos » par défaut : ' + (p.settings.portalUrl || C.model.PORTAL))));
    blocks.concat(warns).slice(0, 30).forEach(function (a) {
      ul.appendChild(h('li', { class: a.level }, h('span', { class: 'ic' }, a.level === 'block' ? '✕' : '!'), h('span', {}, a.msg),
        a.pageId && onSelect && !C.compose.isFrozen(issue) ? h('button', { class: 'btn small act', type: 'button', onclick: function () { var d = document.querySelector('dialog'); if (d) d.close(); onSelect(a.pageId); } }, 'Corriger') : null));
    });
    if ((statuses.review || 0) + (statuses.draft || 0)) ul.appendChild(h('li', { class: 'warn' }, h('span', { class: 'ic' }, '!'), h('span', {}, (statuses.review || 0) + ' fiche(s) à relire et ' + (statuses.draft || 0) + ' brouillon(s) : validation interne non sécurisée en mode local (indicative).')));
    var exportSel = h('button', { class: 'btn', type: 'button', onclick: function (e) {
      var ids = Object.keys(sel).filter(function (k) { return sel[k]; });
      if (!ids.length) return ui.toast('Aucune page sélectionnée.', 'error');
      App.exportPptx(function (o) { return App.issueEntries(issue, Object.assign({ pageIds: ids }, o)); }, App.melFileName(issue, 'selection'), e.currentTarget);
    } }, '↓ Exporter la sélection');
    var exportAll = h('button', { class: 'btn primary', type: 'button', onclick: function (e) { App.exportIssue(issue, e.currentTarget); } }, '↓ Exporter tout le MEL');
    ui.dialog({ title: 'Contrôle final · semaine ' + issue.week, full: true, body: h('div', { class: 'final' }, summary, ul,
      h('div', { class: 'row', style: { margin: '10px 0' } }, exportAll, exportSel, h('button', { class: 'btn', type: 'button', onclick: function () { App.print(App.issueEntries(issue).map(function (x) { return x.slide; })); } }, '🖨 PDF'), h('span', { class: 'small muted' }, 'Cochez / décochez les pages pour un export partiel (sans modifier le MEL).')),
      grid) });
  };

  /** Export du MEL complet avec contrôle préalable (images, textes tronqués, validations). */
  App.exportIssue = function (issue, btn) {
    return App.exportPptx(function (o) { return App.issueEntries(issue, o); }, App.melFileName(issue), btn);
  };
})(window);
