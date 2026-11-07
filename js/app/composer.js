/* CSE Studio V10 · Composer le MEL : pages (ordre éditorial), grand aperçu 16:9, panneau de propriétés.
 * Toutes les pages sont modifiables ici, avant comme après composition :
 *  - fiche source (« toutes les semaines ») ou cette diapositive uniquement (« cette semaine ») ;
 *  - couverture, mosaïques, programmes : options et textes propres au MEL.
 * Un MEL publié est figé (instantané) : il reste consultable et exportable tel que diffusé. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;
  var scopeByPage = {};

  App.views.composer = {
    title: 'Composer le MEL',
    render: function (el, args) {
      var p = App.p();
      if (args[0]) { var target = p.issues.find(function (i) { return i.id === args[0]; }); if (target && p.activeIssueId !== target.id) { p.activeIssueId = target.id; App.save('issues'); } }
      var issue = App.activeIssue();
      if (!issue) { renderEmpty(el); return; }
      var frozen = C.compose.isFrozen(issue);
      if (!frozen) {
        if (!issue.pages.some(function (pg) { return pg.kind === 'cover' && !(pg.opts || {}).extraCover; })) { issue.pages.unshift(C.model.blankPage('cover')); App.save('issues'); }
        var mandatoryCover = issue.pages.find(function (pg) { return pg.kind === 'cover' && !(pg.opts || {}).extraCover; });
        if (mandatoryCover && !mandatoryCover.included) { mandatoryCover.included = true; App.save('issues'); }
        var orderedPages = C.compose.enforceOrder(issue.pages, p, issue);
        if (orderedPages.some(function (pg, idx) { return pg !== issue.pages[idx]; })) { issue.pages = orderedPages; App.save('issues'); }
      }
      // Vue de rendu : bibliothèque vivante (brouillon) ou instantané (MEL publié).
      function view() { return C.compose.issueView(App.p(), issue); }
      function pagesOf() { return view().issue.pages; }
      var selected = App.composerSelect && pagesOf().some(function (pg) { return pg.id === App.composerSelect; }) ? App.composerSelect : (pagesOf()[0] && pagesOf()[0].id);
      App.composerSelect = null;

      /* ---------- En-tête ---------- */
      var st = C.compose.ISSUE_STATUS.find(function (s) { return s.id === issue.status; }) || C.compose.ISSUE_STATUS[0];
      var statusSel = ui.selectEl(C.compose.ISSUE_STATUS, issue.status, { 'aria-label': 'Statut du MEL' });
      statusSel.addEventListener('change', function () { App.changeIssueStatus(issue, statusSel.value).then(function () { App.refresh(); }); });
      var issueSel = ui.selectEl(p.issues.slice().sort(function (a, b) { return b.refDate.localeCompare(a.refDate); }).map(function (is) { return { id: is.id, label: 'S' + is.week + ' · ' + is.year + ' (' + D.fmtShort(is.refDate, true) + ')' + (C.compose.isFrozen(is) ? ' · publié' : '') + (is.cloudConflict && is.cloudConflict.localOnly ? ' · COPIE LOCALE EN CONFLIT' : '') }; }), issue.id, { 'aria-label': 'MEL affiché' });
      issueSel.addEventListener('change', function () { App.go('#/mel/' + issueSel.value); });
      var exportBtn = h('button', { class: 'btn primary', type: 'button', onclick: function (e) { App.exportIssue(issue, e.currentTarget); } }, '↓ Exporter le MEL (.pptx)');
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('p', { class: 'muted small', style: { margin: 0 } }, h('a', { href: '#/mels' }, '← Mes MEL')),
          h('h1', {}, (issue.title || p.settings.melTitle || 'MEL du CSE') + ' · semaine ' + issue.week + ' · ' + issue.year),
          h('p', { class: 'lead' }, 'Semaine du ' + D.fmtRange(D.isoWeekMonday(issue.week, issue.year), D.addDays(D.isoWeekMonday(issue.week, issue.year), 4)).replace(/^Du /, '') + ' · date de référence ' + D.fmtLong(issue.refDate) + ' · ', h('span', { class: 'chip st-' + issue.status }, st.label))),
        h('div', { class: 'btn-group' },
          App.undoButtons(),
          h('div', { style: { minWidth: '190px' } }, issueSel),
          h('div', { style: { minWidth: '150px' } }, statusSel),
          h('button', { class: 'btn', type: 'button', title: 'Créer le MEL de la semaine suivante à partir de celui-ci (celui-ci reste intact)', onclick: function () { App.duplicateIssueDialog(issue); } }, '⧉ Semaine suivante'),
          h('button', { class: 'btn', type: 'button', onclick: function () { finalCheck(); } }, '✓ Contrôle final'),
          h('button', { class: 'btn', type: 'button', onclick: function () { App.fullscreen(App.issueEntries(issue).map(function (e) { return e.slide; })); } }, '⤢ Diaporama'),
          h('button', { class: 'btn', type: 'button', onclick: function () { App.print(App.issueEntries(issue).map(function (e) { return e.slide; })); } }, '🖨 PDF'),
          h('button', { class: 'btn', type: 'button', title: 'Sauvegarder fiches, MEL et photos dans un fichier JSON', onclick: function () { App.downloadBackup('CSE_Studio_Sauvegarde_' + issue.year + '_S' + issue.week + '.json'); } }, '↓ Sauvegarde'),
          C.compose.validUrl(p.settings.canvaUrl) && p.settings.canvaUrl ? h('a', { class: 'btn', href: p.settings.canvaUrl, target: '_blank', rel: 'noopener noreferrer', title: 'Ouvrir la présentation Canva ; y importer ensuite le .pptx exporté' }, '↗ Ouvrir Canva') : null,
          exportBtn)));
      if (frozen) {
        el.appendChild(h('div', { class: 'alert info frozen-banner' }, h('b', {}, 'MEL publié et figé'), ' le ' + new Date(issue.snapshot.frozenAt).toLocaleDateString('fr-FR') + ' : il reste consultable et exportable exactement tel que diffusé, même si les fiches de la bibliothèque changent. ',
          h('button', { class: 'btn small primary', type: 'button', onclick: function () { App.duplicateIssueDialog(issue); } }, 'Créer la semaine suivante à partir de ce MEL'), ' ',
          h('button', { class: 'btn small', type: 'button', onclick: function () { App.changeIssueStatus(issue, 'draft').then(function () { App.refresh(); }); } }, 'Rouvrir en brouillon')));
      }
      if (issue.diffReport && !issue.diffReportSeen) {
        el.appendChild(h('div', { class: 'alert info' }, 'MEL créé à partir de la semaine ' + issue.diffReport.source.week + ' : ' + issue.diffReport.review.length + ' point(s) à vérifier. ',
          h('button', { class: 'btn small', type: 'button', onclick: function () { App.reportDialog(issue); } }, 'Voir le rapport de différences'), ' ',
          h('button', { class: 'btn small ghost', type: 'button', onclick: function () { issue.diffReportSeen = true; App.save('issues'); App.refresh(); } }, 'Masquer')));
      }

      var left = h('div', { class: 'card pages-col' }), center = h('div', { class: 'card stage-col' }), right = h('div', { class: 'opts-col' });
      el.appendChild(h('div', { class: 'composer' }, left, center, right));

      /* ---------- Paramètres du numéro ---------- */
      var refIn = h('input', { type: 'date', value: issue.refDate, disabled: frozen });
      var titleIn = h('input', { value: issue.title || '', placeholder: p.settings.melTitle || 'MEL DU CSE', disabled: frozen, maxlength: 120 });
      var numChk = h('input', { type: 'checkbox', checked: issue.numbering, disabled: frozen });
      refIn.addEventListener('change', function () {
        if (!D.isValid(refIn.value)) return;
        issue.refDate = refIn.value; var w = D.isoWeek(refIn.value); issue.week = w.week; issue.year = w.year;
        issue.pages = C.compose.enforceOrder(issue.pages, p, issue);
        App.save('issues'); App.refresh(); ui.toast('Date de référence modifiée : rubriques, échéances et ordre actualisés.');
      });
      titleIn.addEventListener('input', ui.debounce(function () { issue.title = titleIn.value.trim(); App.save('issues'); invalidate(); refreshAll(); }, 400));
      numChk.addEventListener('change', function () { issue.numbering = numChk.checked; App.save('issues'); invalidate(); refreshAll(); });
      left.appendChild(h('div', { class: 'cols' }, ui.field('Date de référence', refIn, { help: 'Lundi de diffusion en général : sert aux rubriques et J−x.' }), ui.field('Titre du MEL', titleIn)));
      left.appendChild(h('label', { class: 'check' }, numChk, 'Numéroter les pages'));
      if (!frozen) left.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('button', { class: 'btn small', type: 'button', onclick: addPageDialog }, '+ Ajouter une page'),
        h('button', { class: 'btn small', type: 'button', onclick: regenerate, title: 'Ajoute les nouvelles fiches de la semaine sans rien effacer' }, '↻ Actualiser depuis la bibliothèque')));
      var count = h('p', { class: 'small muted', style: { margin: '0 0 6px' } });
      left.appendChild(count);
      var reviewSummary = h('p', { class: 'mel-review small', 'aria-live': 'polite' });
      left.appendChild(reviewSummary);
      var list = h('ol', { class: 'pages', 'aria-label': 'Pages du MEL' });
      left.appendChild(list);
      left.appendChild(h('p', { class: 'small muted' }, 'Les rubriques ont un ordre fixe (couverture, ouvertures, informations… règlement). Glissez-déposez ou utilisez ↑ ↓ (Alt+flèches) dans une même rubrique.'));

      /* ---------- Rendu mis en cache (le travail sur une page ne recalcule pas tout le MEL) ---------- */
      var memo = {}, counts = {};
      function invalidate() { memo = {}; }
      function pageKey(pg, v) {
        var it = pg.kind === 'item' ? C.compose.findItem(v.project, pg.itemId) : null;
        return JSON.stringify([pg, it, v.issue.refDate, v.issue.numbering, v.issue.newSeen, it ? C.model.categoryOf(v.project, it) : null]);
      }
      function slidesOf(pg, number) {
        var v = view();
        if (pg.kind === 'item' && !number) {
          var k = pageKey(pg, v), m = memo[pg.id];
          if (m && m.key === k) return m.slides;
          var s = C.templates.renderPage(pg, v.project, v.issue, {});
          memo[pg.id] = { key: k, slides: s };
          return s;
        }
        return C.templates.renderPage(pg, v.project, v.issue, { pageNumber: number || 0 });
      }

      /* ---------- Liste des pages ---------- */
      var dragId = null;
      var isMainCover = function (pg) { return pg.kind === 'cover' && !(pg.opts || {}).extraCover; };
      function drawList() {
        var savedScroll = list.scrollTop;
        ui.clear(list);
        var v = view(), pages = v.issue.pages;
        var n = 1, totalSlides = 0, lastSection = '';
        pages.forEach(function (pg, idx) {
          var section = C.compose.sectionForPage(pg, v.project, v.issue);
          if (section !== lastSection) {
            var sec = C.compose.SECTIONS.find(function (s) { return s.id === section; });
            list.appendChild(h('li', { class: 'section-heading', role: 'presentation' }, sec ? sec.label : section));
            lastSection = section;
          }
          var slides = slidesOf(pg);
          var nb = slides.length;
          counts[pg.id] = nb;
          var label = pg.included ? (nb > 1 ? n + '–' + (n + nb - 1) : String(n)) : '—';
          if (pg.included) { n += nb; totalSlides += nb; }
          var it = pg.kind === 'item' ? C.compose.findItem(v.project, pg.itemId) : null;
          var tpl = C.templates.TEMPLATES.find(function (t) { return t.id === (slides[0] && slides[0].templateId); });
          var custom = C.compose.hasOverrides(pg);
          var sub = (tpl ? tpl.name : '') + (nb > 1 ? ' · ' + nb + ' diapos' : '') + (custom ? ' · personnalisée' : '');
          var warn = slides.some(function (s) { return s.overflow || s.warnings.some(function (w) { return w.level === 'block'; }); });
          var mini = h('div', { class: 'mini' });
          if (slides[0]) mini.appendChild(ui.slideFrame(slides[0], { lazy: true, checkOverflow: false }).frame);
          var canMoveUp = !frozen && idx > 0 && C.compose.sectionForPage(pages[idx - 1], v.project, v.issue) === section;
          var canMoveDown = !frozen && idx < pages.length - 1 && C.compose.sectionForPage(pages[idx + 1], v.project, v.issue) === section;
          var li = h('li', { class: 'pg' + (pg.id === selected ? ' active' : '') + (pg.included ? '' : ' excluded'), draggable: !frozen && section !== 'cover', dataset: { id: pg.id }, tabindex: '0', 'aria-label': 'Page ' + label + ' : ' + App.pageLabel(pg) + (pg.included ? '' : ' (exclue)') },
            h('span', { class: 'num' }, label), mini,
            h('div', { class: 'txt' }, h('b', {}, (warn ? '⚠ ' : '') + App.pageLabel(pg)), h('small', {}, sub + (it && it.archived ? ' · archivée' : ''))),
            frozen ? h('div') : h('div', { class: 'ops' },
              h('button', { type: 'button', disabled: isMainCover(pg), title: isMainCover(pg) ? 'La couverture reste toujours en première page' : pg.included ? 'Exclure du MEL (sans supprimer)' : 'Réinclure dans le MEL', 'aria-label': pg.included ? 'Exclure la page' : 'Inclure la page', onclick: function (e) { e.stopPropagation(); if (isMainCover(pg)) return; pg.included = !pg.included; App.save('issues'); refreshAll(); } }, pg.included ? '👁' : '◌'),
              h('button', { type: 'button', disabled: !canMoveUp, title: 'Monter dans cette rubrique', 'aria-label': 'Monter la page', onclick: function (e) { e.stopPropagation(); move(idx, -1); } }, '↑'),
              h('button', { type: 'button', disabled: !canMoveDown, title: 'Descendre dans cette rubrique', 'aria-label': 'Descendre la page', onclick: function (e) { e.stopPropagation(); move(idx, 1); } }, '↓'),
              h('button', { type: 'button', disabled: isMainCover(pg), title: 'Retirer du MEL (la fiche reste dans la bibliothèque)', 'aria-label': 'Retirer la page', onclick: function (e) { e.stopPropagation(); removePage(pg); } }, '✕')));
          li.addEventListener('click', function () { select(pg.id); });
          li.addEventListener('keydown', function (e) { if (e.key === 'Enter') select(pg.id); if (!frozen && e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(idx, -1); } if (!frozen && e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(idx, 1); } });
          if (!frozen) {
            li.addEventListener('dragstart', function (e) { if (section === 'cover') { e.preventDefault(); return; } dragId = pg.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', pg.id); });
            li.addEventListener('dragend', function () { li.classList.remove('dragging'); list.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); });
            li.addEventListener('dragover', function (e) {
              var source = issue.pages.find(function (x) { return x.id === dragId; });
              if (!source || C.compose.sectionForPage(source, p, issue) !== section) return;
              e.preventDefault(); list.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); li.classList.add('drop-before');
            });
            li.addEventListener('drop', function (e) {
              e.preventDefault();
              var from = issue.pages.findIndex(function (x) { return x.id === dragId; }), to = issue.pages.findIndex(function (x) { return x.id === pg.id; });
              if (from < 0 || to < 0 || from === to) return;
              if (C.compose.sectionForPage(issue.pages[from], p, issue) !== C.compose.sectionForPage(pg, p, issue)) { ui.toast('Le déplacement est limité à une même rubrique. Modifiez le placement éditorial de la fiche pour changer sa rubrique.'); return; }
              if (C.compose.moveWithinSection(issue.pages, from, to, p, issue)) afterReorder();
            });
          }
          list.appendChild(li);
        });
        list.ondragover = function (e) { e.preventDefault(); };
        list.ondrop = function (e) { if (e.target !== list) return; e.preventDefault(); ui.toast('Déplacez les pages sur une autre page de la même rubrique.'); };
        count.textContent = pages.filter(function (x) { return x.included; }).length + ' page(s) incluse(s) sur ' + pages.length + ' · ' + totalSlides + ' diapositive(s) exportée(s)';
        var ids = {}, drafts = 0, reviews = 0, approved = 0;
        pages.forEach(function (pg) {
          if (!pg.included || pg.kind !== 'item' || ids[pg.itemId]) return;
          ids[pg.itemId] = true;
          var it = C.compose.findItem(v.project, pg.itemId);
          if (!it) return;
          if (it.editorialStatus === 'approved') approved++; else if (it.editorialStatus === 'review') reviews++; else drafts++;
        });
        var alerts = C.compose.audit(p, issue).filter(function (a) { return a.level !== 'info'; }).length;
        reviewSummary.className = 'mel-review small' + (drafts || reviews || alerts ? ' pending' : ' complete');
        ui.clear(reviewSummary);
        reviewSummary.appendChild(document.createTextNode('Fiches : ' + approved + ' validée(s)' + (reviews || drafts ? ' · ' + reviews + ' à relire · ' + drafts + ' brouillon(s)' : '') + ' · ' + (alerts ? alerts + ' alerte(s) ' : 'aucune alerte ')));
        reviewSummary.appendChild(h('button', { class: 'linklike', type: 'button', onclick: finalCheck }, 'Contrôle final →'));
        list.scrollTop = savedScroll;
      }
      function afterReorder() {
        var before = issue.pages.map(function (x) { return x.id; }).join();
        issue.pages = C.compose.enforceOrder(issue.pages, p, issue);
        if (before !== issue.pages.map(function (x) { return x.id; }).join()) ui.toast('Ordre éditorial rétabli automatiquement.');
        App.save('issues'); drawList();
      }
      function move(idx, delta) {
        var j = idx + delta;
        if (j < 0 || j >= issue.pages.length) return;
        if (C.compose.sectionForPage(issue.pages[idx], p, issue) !== C.compose.sectionForPage(issue.pages[j], p, issue)) return ui.toast('Les rubriques ont un ordre fixe.');
        var t = issue.pages[idx]; issue.pages[idx] = issue.pages[j]; issue.pages[j] = t;
        afterReorder();
        var li = list.querySelector('[data-id="' + t.id + '"]'); if (li) li.focus();
      }
      function removePage(pg) {
        if (isMainCover(pg)) return ui.toast('La couverture est obligatoire et doit rester la première page.');
        ui.confirm('Retirer la page', '« ' + App.pageLabel(pg) + ' » sera retirée de ce MEL. ' + (pg.kind === 'item' ? 'La fiche reste dans la bibliothèque.' : '') + (C.compose.hasOverrides(pg) ? '\nSa personnalisation pour cette semaine sera perdue (annulable avec ↶).' : '') + '\nAstuce : « Exclure » (👁) la garde sans la publier.', 'Retirer', true).then(function (ok) {
          if (!ok) return;
          var i = issue.pages.indexOf(pg);
          issue.pages.splice(i, 1);
          issue.suppressed = issue.suppressed || [];
          var key = C.compose.pageKey(pg);
          if (issue.suppressed.indexOf(key) < 0) issue.suppressed.push(key);
          if (selected === pg.id) selected = (issue.pages[Math.min(i, issue.pages.length - 1)] || {}).id;
          App.save('issues'); refreshAll();
        });
      }
      function select(id) { selected = id; list.querySelectorAll('.pg').forEach(function (li) { li.classList.toggle('active', li.dataset.id === id); }); drawCenter(); drawOptions(); }

      /* ---------- Aperçu central ---------- */
      function currentPage() { return pagesOf().find(function (x) { return x.id === selected; }); }
      function firstNumber(pg) {
        var n = 1, pages = pagesOf();
        for (var i = 0; i < pages.length; i++) { var x = pages[i]; if (x === pg) return n; if (x.included) n += counts[x.id] || slidesOf(x).length; }
        return n;
      }
      var formApi = null;
      function drawCenter() {
        ui.clear(center);
        var pg = currentPage();
        if (!pg) { center.appendChild(h('div', { class: 'empty' }, 'Ce MEL ne contient aucune page. Utilisez « Actualiser depuis la bibliothèque » ou « Ajouter une page ».')); return; }
        var slides = issue.numbering ? slidesOf(pg, firstNumber(pg)) : slidesOf(pg);
        var pages = pagesOf(), idx = pages.indexOf(pg);
        center.appendChild(h('div', { class: 'stage-head' },
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Page précédente', disabled: idx <= 0, onclick: function () { select(pages[idx - 1].id); } }, '‹'),
          h('h2', {}, App.pageLabel(pg)),
          pg.included ? null : h('span', { class: 'chip closed' }, 'Exclue de l’export'),
          C.compose.hasOverrides(pg) ? h('span', { class: 'chip ov' }, 'Personnalisée cette semaine') : null,
          h('button', { class: 'btn small', type: 'button', onclick: function () { App.fullscreen(slides); } }, '⤢ Plein écran'),
          h('button', { class: 'btn small', type: 'button', onclick: function (e) { App.exportPptx(function (o) { return App.issueEntries(issue, Object.assign({ onlyPage: pg.id }, o)); }, App.melFileName(issue, App.pageLabel(pg)), e.currentTarget); } }, '↓ Cette page (.pptx)'),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Page suivante', disabled: idx >= pages.length - 1, onclick: function () { select(pages[idx + 1].id); } }, '›')));
        var strip = h('div', { class: 'slides-strip' });
        slides.forEach(function (s, i) {
          if (slides.length > 1) strip.appendChild(h('div', { class: 'part-label' }, 'Diapositive ' + (i + 1) + ' / ' + slides.length));
          strip.appendChild(ui.slideFrame(s, { onAction: frozen ? null : function (a) { onAction(pg, a); }, onField: frozen ? null : function (field) { focusField(pg, field); } }).frame);
        });
        center.appendChild(strip);
        if (!frozen) center.appendChild(h('p', { class: 'small muted', style: { margin: '6px 0 0' } }, 'Cliquez sur un élément de la diapositive pour le modifier dans le panneau de droite.'));
        var v = view(), it = pg.kind === 'item' ? C.compose.effectiveItem(pg, C.compose.findItem(v.project, pg.itemId)) : null;
        var r = C.templates.readability(slides);
        var ul = h('ul', { class: 'issues', style: { marginTop: '10px' } });
        ul.appendChild(h('li', { class: r.level === 'bad' ? 'block' : r.level === 'dense' ? 'warn' : 'ok' }, h('span', { class: 'ic' }, r.level === 'bad' ? '✕' : r.level === 'dense' ? '!' : '✓'), h('span', {}, 'Lisibilité : ' + r.label + (r.min ? ' (police minimale ' + Math.round(r.min * 0.8 * 10) / 10 + ' pt)' : ''))));
        var seen = {};
        slides.forEach(function (s) { s.warnings.forEach(function (w) {
          if (seen[w.msg]) return; seen[w.msg] = 1;
          var act = null;
          if (!frozen && w.code === 'compact-fits' && pg.kind === 'item') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { pg.density = 'compact'; App.save('issues'); refreshAll(); } }, 'Passer en compact (cette semaine)');
          if (!frozen && w.code === 'suggest-split' && pg.kind === 'item') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { pg.split = 'auto'; App.save('issues'); refreshAll(); } }, 'Suite automatique');
          if (!frozen && w.code === 'image') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { focusField(pg, 'photo'); } }, 'Corriger la photo');
          ul.appendChild(h('li', { class: w.level }, h('span', { class: 'ic' }, w.level === 'block' ? '✕' : w.level === 'info' ? 'i' : '!'), h('span', {}, w.msg), act));
        }); });
        if (it) C.compose.checkItem(it, v.project, v.issue.refDate).forEach(function (x) { if (!seen[x[1]]) ul.appendChild(h('li', { class: x[0] }, h('span', { class: 'ic' }, x[0] === 'block' ? '✕' : '!'), h('span', {}, x[1]))); });
        center.appendChild(ul);
      }
      function onAction(pg, a) {
        if (a.type !== 'calendar-day' || pg.kind !== 'item') return;
        var src = App.item(pg.itemId); if (!src) return;
        if (scopeOf(pg) === 'page') {
          var draft = currentDraft && currentDraft.page === pg ? currentDraft.item : JSON.parse(JSON.stringify(C.compose.effectiveItem(pg, src)));
          C.model.cycleCalendarDay(draft.calendar, a.date, '');
          C.compose.setOverrides(pg, src, draft); App.save('issues');
        } else {
          C.model.cycleCalendarDay(src.calendar, a.date, '');
          src.updatedAt = new Date().toISOString(); App.save('items');
        }
        pageChanged(pg, true);
      }
      function focusField(pg, field) {
        if (formApi && formApi.focusField(field)) return;
        var el2 = right.querySelector('[data-key="' + field + '"]');
        if (el2) { el2.scrollIntoView({ block: 'center', behavior: 'smooth' }); el2.classList.add('flash'); setTimeout(function () { el2.classList.remove('flash'); }, 1400); var inp = el2.querySelector('input,textarea,select'); if (inp) inp.focus({ preventScroll: true }); }
      }
      /** Après une saisie : aperçu et miniature de CETTE page seulement (liste complète si le nombre de diapositives change). */
      var pending = null;
      function pageChanged(pg, now) {
        clearTimeout(pending);
        var run = function () {
          delete memo[pg.id];
          var before = counts[pg.id];
          drawCenter();
          var after = slidesOf(pg).length;
          if (before !== after) { drawList(); return; }
          var li = list.querySelector('[data-id="' + pg.id + '"] .mini');
          if (li) { ui.clear(li); var s0 = slidesOf(pg)[0]; if (s0) li.appendChild(ui.slideFrame(s0, { checkOverflow: false }).frame); }
        };
        if (now) run(); else pending = setTimeout(run, 160);
      }

      /* ---------- Panneau de propriétés ---------- */
      var currentDraft = null;
      function scopeOf(pg) {
        if (!scopeByPage[pg.id]) scopeByPage[pg.id] = C.compose.hasOverrides(pg) ? 'page' : 'item';
        return scopeByPage[pg.id];
      }
      function drawOptions() {
        ui.clear(right);
        formApi = null; currentDraft = null;
        var pg = currentPage();
        var card = h('div', { class: 'card props' });
        right.appendChild(card);
        if (!pg) return;
        var v = view();
        var sec = C.compose.SECTIONS.find(function (s) { return s.id === C.compose.sectionForPage(pg, v.project, v.issue); });
        card.appendChild(h('div', { class: 'props-head' }, h('h2', {}, 'Propriétés de la page'), h('span', { class: 'small muted' }, sec ? 'Rubrique ' + sec.label : '')));
        if (frozen) {
          card.appendChild(h('p', { class: 'small' }, 'Ce MEL est publié (figé) : ses pages ne sont plus modifiables. Rouvrez-le en brouillon ou créez la semaine suivante pour continuer.'));
          return;
        }
        var inc = h('input', { type: 'checkbox', checked: pg.included, disabled: isMainCover(pg) });
        inc.addEventListener('change', function () { if (isMainCover(pg)) return; pg.included = inc.checked; App.save('issues'); refreshAll(); });
        card.appendChild(h('label', { class: 'check' }, inc, 'Inclure dans le MEL exporté'));
        (OPTS[pg.kind] || function () { })(card, pg);
      }
      function changed() { App.save('issues'); var pg = currentPage(); if (pg) { delete memo[pg.id]; } drawCenter(); drawList(); }
      var changedDeb = ui.debounce(changed, 300);
      var OPTS = {
        item: function (card, pg) {
          var src = App.item(pg.itemId);
          if (!src) { card.appendChild(h('div', { class: 'alert error' }, 'Fiche introuvable : retirez cette page ou restaurez la fiche depuis la corbeille (Sauvegardes & exports).')); return; }
          // Disposition propre à ce MEL.
          var layout = h('details', { class: 'layout-opts', open: false }, h('summary', {}, 'Disposition de la diapositive (modèle, densité, texte long)'));
          var opts = [{ id: 'auto', label: 'Celui de la fiche (' + (C.templates.TEMPLATES.find(function (t) { return t.id === C.templates.templateIdFor(C.model.blankPage('item', { itemId: src.id }), src, App.p()); }) || {}).name + ')' }]
            .concat((C.templates.ITEM_TEMPLATES[src.type] || []).map(function (id) { return { id: id, label: C.templates.TEMPLATES.find(function (t) { return t.id === id; }).name }; }));
          var tpl = ui.selectEl(opts, pg.template);
          tpl.addEventListener('change', function () { pg.template = tpl.value; changed(); });
          layout.appendChild(ui.field('Modèle pour ce MEL', tpl, { help: 'Prévisualiser les modèles : menu « Modèles ».' }));
          var dens = ui.selectEl([{ id: 'auto', label: 'Celle de la fiche' }].concat(C.model.DENSITIES.slice(1)), pg.density);
          dens.addEventListener('change', function () { pg.density = dens.value; changed(); });
          layout.appendChild(ui.field('Densité', dens, { help: 'Automatique : corps ≥ 12 pt. Aéré : marges et police plus grandes. Compact : corps ≥ 11 pt, photos réduites.' }));
          if (['classic', 'immersive', 'info'].indexOf(C.templates.templateIdFor(pg, src, App.p())) >= 0) {
            var sp = ui.selectEl([{ id: 'auto', label: 'Automatique : suite seulement si le texte ne tient pas à 12 pt' }, { id: 'force', label: 'Toujours 2 diapositives' }, { id: 'off', label: 'Jamais (texte tronqué et signalé)' }], pg.split || 'auto');
            sp.addEventListener('change', function () { pg.split = sp.value; changed(); });
            layout.appendChild(ui.field('Texte long', sp));
          }
          card.appendChild(layout);
          // Portée de la modification : fiche source ou cette diapositive uniquement.
          var scope = scopeOf(pg);
          var uses = App.p().issues.filter(function (is) { return is.pages.some(function (x) { return x.itemId === src.id; }); }).length;
          var sw = h('div', { class: 'scope-switch', role: 'radiogroup', 'aria-label': 'Portée des modifications' },
            h('button', { type: 'button', role: 'radio', 'aria-checked': String(scope === 'item'), class: scope === 'item' ? 'on' : '', onclick: function () { scopeByPage[pg.id] = 'item'; drawOptions(); } }, h('b', {}, 'Fiche source'), h('small', {}, 'toutes les semaines · ' + uses + ' MEL')),
            h('button', { type: 'button', role: 'radio', 'aria-checked': String(scope === 'page'), class: scope === 'page' ? 'on' : '', onclick: function () { scopeByPage[pg.id] = 'page'; drawOptions(); } }, h('b', {}, 'Cette semaine uniquement'), h('small', {}, 'MEL semaine ' + issue.week)));
          card.appendChild(sw);
          var host = h('div', { class: 'props-form' });
          if (scope === 'item') {
            card.appendChild(h('div', { class: 'scope-banner scope-item' }, h('b', {}, 'Modification de la fiche (toutes les semaines)'), ' : se répercute dans les MEL en brouillon qui l’utilisent ; les MEL publiés restent figés. ',
              h('a', { href: '#/fiche/' + src.id + '?mel=' + encodeURIComponent(issue.id) + '&page=' + encodeURIComponent(pg.id) }, 'Ouvrir la fiche en grand')));
            card.appendChild(host);
            formApi = App.itemForm.mount(host, src, {
              project: App.p(), scope: 'item',
              touch: function () { src.updatedAt = new Date().toISOString(); if (src.editorialStatus === 'approved') { src.editorialStatus = 'review'; ui.toast('Fiche modifiée : statut repassé à « À relire ».'); } App.save('items'); },
              render: function () { pageChanged(pg); }
            });
          } else {
            var draft = JSON.parse(JSON.stringify(C.compose.effectiveItem(pg, src)));
            delete draft.overridden;
            currentDraft = { page: pg, item: draft };
            var n = Object.keys((pg.opts && pg.opts.override) || {}).length;
            var countEl = h('span', {}, n ? n + ' champ(s) personnalisé(s), marqués « cette semaine ».' : 'Aucun champ personnalisé pour l’instant.');
            card.appendChild(h('div', { class: 'scope-banner scope-page' }, h('b', {}, 'Modification de cette diapositive uniquement'), ' (MEL semaine ' + issue.week + ') : la fiche de la bibliothèque et les autres MEL ne changent pas. ', countEl,
              n ? h('button', { class: 'btn small', type: 'button', onclick: function () {
                ui.confirm('Annuler la personnalisation', 'Tous les champs personnalisés de cette page reprendront les valeurs de la fiche « ' + src.title + ' ».', 'Annuler la personnalisation', true).then(function (ok) {
                  if (!ok) return; C.compose.resetOverride(pg); App.save('issues'); drawOptions(); pageChanged(pg, true); ui.toast('Personnalisation annulée : la page suit à nouveau la fiche.', 'ok');
                });
              } }, '↺ Tout annuler') : null));
            card.appendChild(host);
            formApi = App.itemForm.mount(host, draft, {
              project: App.p(), scope: 'page',
              touch: function () { var ov = C.compose.setOverrides(pg, src, draft); App.save('issues'); var k = Object.keys(ov).length; countEl.textContent = k ? k + ' champ(s) personnalisé(s), marqués « cette semaine ».' : 'Aucun champ personnalisé pour l’instant.'; },
              render: function () { pageChanged(pg); },
              isOverridden: function (key) { return !!(pg.opts && pg.opts.useOverrides && pg.opts.override && Object.prototype.hasOwnProperty.call(pg.opts.override, key)); },
              resetField: function (key) { C.compose.resetOverride(pg, key); draft[key] = JSON.parse(JSON.stringify(src[key] === undefined ? null : src[key])); App.save('issues'); pageChanged(pg, true); }
            });
          }
          var cls = C.compose.classify(src, issue.refDate, App.p().settings, issue);
          var chips = h('div', { class: 'row' }); ui.rubricChip(cls).forEach(function (x) { chips.appendChild(x); });
          card.appendChild(h('div', { class: 'field', style: { marginTop: '12px' } }, h('span', { class: 'label' }, 'Rubrique au ' + D.fmtShort(issue.refDate, true)), chips));
        },
        cover: function (card, pg) {
          var o = pg.opts;
          o.important = o.important || { label: 'Important', title: '', text: '' };
          o.mustSee = o.mustSee || { auto: true, text: '' };
          var t1 = h('input', { value: o.important.title || '', placeholder: 'Ex. Demande de subvention' });
          t1.addEventListener('input', function () { o.important.title = t1.value; changedDeb(); });
          var t2 = h('textarea', { rows: 3, placeholder: 'Message prioritaire de la semaine (facultatif)' }); t2.value = o.important.text || '';
          t2.addEventListener('input', function () { o.important.text = t2.value; changedDeb(); });
          var lab = h('input', { value: o.important.label || 'Important', maxlength: 22 });
          lab.addEventListener('input', function () { o.important.label = lab.value; changedDeb(); });
          card.appendChild(keyed(h('fieldset', {}, h('legend', {}, 'Message important'), ui.field('Étiquette', lab), ui.field('Titre', t1), ui.field('Texte', t2)), 'message important'));
          var auto = h('input', { type: 'checkbox', checked: o.mustSee.auto !== false });
          var must = h('textarea', { rows: 2, placeholder: 'Texte personnalisé' }); must.value = o.mustSee.text || '';
          must.disabled = o.mustSee.auto !== false;
          auto.addEventListener('change', function () { o.mustSee.auto = auto.checked; must.disabled = auto.checked; changed(); });
          must.addEventListener('input', function () { o.mustSee.text = must.value; changedDeb(); });
          card.appendChild(keyed(h('fieldset', {}, h('legend', {}, 'À ne pas manquer'), h('label', { class: 'check' }, auto, 'Automatique (dernières chances de la semaine)'), ui.field('Texte manuel', must)), 'à ne pas manquer'));
          card.appendChild(pickBlock('Nouveautés en couverture (4 max)', o, 'newsAuto', 'newsIds', 4, function (it) { return C.compose.classify(it, issue.refDate, App.p().settings, issue).isNew; }, 'nouveautés'));
          o.extraNotes = Array.isArray(o.extraNotes) ? o.extraNotes : [];
          var noteWrap = keyed(h('fieldset', {}, h('legend', {}, 'Informations complémentaires (encart libre)')), 'information complémentaire');
          var noteRows = h('div');
          function drawCoverNotes() {
            ui.clear(noteRows);
            o.extraNotes.forEach(function (txt, i) {
              var inp = h('textarea', { rows: 2, maxlength: 280, 'aria-label': 'Information complémentaire ' + (i + 1) });
              inp.value = txt;
              inp.addEventListener('input', function () { o.extraNotes[i] = inp.value; changedDeb(); });
              noteRows.appendChild(h('div', { class: 'row', style: { alignItems: 'flex-start', marginBottom: '6px' } },
                h('div', { style: { flex: '1' } }, ui.field('Information ' + (i + 1), inp)),
                h('button', { type: 'button', class: 'btn small danger', onclick: function () { o.extraNotes.splice(i, 1); changed(); drawCoverNotes(); } }, 'Supprimer')));
            });
          }
          drawCoverNotes();
          noteWrap.appendChild(noteRows);
          noteWrap.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { if (o.extraNotes.length >= 4) return ui.toast('4 informations complémentaires maximum.', 'error'); o.extraNotes.push(''); changed(); drawCoverNotes(); } }, '+ Ajouter une information'));
          noteWrap.appendChild(h('p', { class: 'small muted' }, 'Si la couverture est trop chargée, les informations en trop passent sur une diapositive lisible juste après.'));
          card.appendChild(noteWrap);
          var ed = h('input', { value: o.editorial || '', placeholder: 'Ex. Bonne semaine à toutes et à tous !' });
          ed.addEventListener('input', function () { o.editorial = ed.value; changedDeb(); });
          card.appendChild(keyed(ui.field('Ligne éditoriale (bas de couverture)', ed), 'message éditorial'));
          var pl = h('input', { type: 'checkbox', checked: o.showPlanning !== false });
          pl.addEventListener('change', function () { o.showPlanning = pl.checked; changed(); });
          card.appendChild(h('label', { class: 'check' }, pl, 'Afficher le lien « vue d’ensemble des activités »'));
          card.appendChild(h('p', { class: 'small muted' }, 'Titre du MEL et semaine : colonne de gauche. Le libellé du lien se règle dans Paramètres.'));
        },
        news: function (card, pg) { mosaicOptions(card, pg, 'new'); },
        last: function (card, pg) { mosaicOptions(card, pg, 'last'); },
        upcoming: function (card, pg) {
          var o = pg.opts;
          var style = ui.selectEl([{ id: 'list', label: 'Liste chronologique' }, { id: 'table', label: 'Tableau' }], o.style);
          style.addEventListener('change', function () { o.style = style.value; changed(); });
          var title = h('input', { value: o.title || '' }); title.addEventListener('input', function () { o.title = title.value; changedDeb(); });
          var sub = h('input', { value: o.subtitle || '', placeholder: 'Ex. 1er semestre 2027' }); sub.addEventListener('input', function () { o.subtitle = sub.value; changedDeb(); });
          card.appendChild(ui.field('Présentation', style)); card.appendChild(keyed(ui.field('Titre', title), 'titre')); card.appendChild(keyed(ui.field('Sous-titre', sub), 'sous-titre'));
          var auto = h('input', { type: 'checkbox', checked: o.auto !== false });
          auto.addEventListener('change', function () { o.auto = auto.checked; changed(); drawOptions(); });
          card.appendChild(h('label', { class: 'check' }, auto, 'Alimenter automatiquement depuis la bibliothèque'));
          if (o.auto !== false) {
            var cat = ui.selectEl([{ id: '', label: 'Toutes les catégories' }].concat(App.p().categories.map(function (c) { return { id: c.id, label: c.name }; })), o.categoryId || '');
            cat.addEventListener('change', function () { o.categoryId = cat.value; changed(); });
            var from = h('input', { type: 'date', value: o.from || '' }), to = h('input', { type: 'date', value: o.to || '' });
            from.addEventListener('change', function () { o.from = from.value; changed(); }); to.addEventListener('change', function () { o.to = to.value; changed(); });
            card.appendChild(ui.field('Catégorie', cat)); card.appendChild(h('div', { class: 'cols' }, ui.field('Du', from), ui.field('Au', to)));
            card.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { o.rows = C.compose.upcomingRows(pg, App.p(), issue).map(function (r) { return { date: r.date, title: r.title, location: r.location, type: r.type }; }); o.auto = false; changed(); drawOptions(); ui.toast('Lignes copiées : vous pouvez maintenant les modifier pour ce MEL.'); } }, 'Copier en lignes modifiables'));
          } else {
            var rows = keyed(h('div'), 'activité');
            (o.rows || []).forEach(function (r, i) {
              var d = h('input', { type: 'date', value: r.date || '', 'aria-label': 'Date ligne ' + (i + 1) });
              var t = h('input', { value: r.title || '', placeholder: 'Activité', 'aria-label': 'Activité ligne ' + (i + 1) });
              var l = h('input', { value: r.location || '', placeholder: 'Lieu', 'aria-label': 'Lieu ligne ' + (i + 1) });
              var ty = h('input', { value: r.type || '', placeholder: 'Type / statut', 'aria-label': 'Type ligne ' + (i + 1) });
              [[d, 'date'], [t, 'title'], [l, 'location'], [ty, 'type']].forEach(function (pair) { pair[0].addEventListener('input', function () { r[pair[1]] = pair[0].value; changedDeb(); }); });
              rows.appendChild(h('div', { class: 'upc-row' }, h('div', { class: 'cols' }, d, t), h('div', { class: 'cols', style: { marginTop: '4px' } }, l, ty),
                h('button', { class: 'btn small danger', type: 'button', style: { marginTop: '4px' }, onclick: function () { o.rows.splice(i, 1); changed(); drawOptions(); } }, 'Supprimer la ligne')));
            });
            card.appendChild(rows);
            card.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { o.rows = o.rows || []; o.rows.push({ date: '', title: '', location: '', type: '' }); changed(); drawOptions(); } }, '+ Ajouter une ligne'));
          }
          var note = h('input', { value: o.note || '', placeholder: App.p().settings.mentions.upcoming });
          note.addEventListener('input', function () { o.note = note.value; changedDeb(); });
          card.appendChild(keyed(ui.field('Mention (facultatif)', note), 'mention'));
        }
      };
      function keyed(elm, key) { elm.dataset.key = key; return elm; }
      function mosaicOptions(card, pg, rubric) {
        var o = pg.opts;
        var title = h('input', { value: o.title || '' }); title.addEventListener('input', function () { o.title = title.value; changedDeb(); });
        var sub = h('input', { value: o.subtitle || '', placeholder: 'Automatique' }); sub.addEventListener('input', function () { o.subtitle = sub.value; changedDeb(); });
        card.appendChild(keyed(ui.field('Titre de la rubrique', title), 'titre')); card.appendChild(keyed(ui.field('Sous-titre / annotation', sub), 'sous-titre'));
        var cat = ui.selectEl([{ id: '', label: 'Toutes les catégories' }].concat(App.p().categories.map(function (c) { return { id: c.id, label: c.name }; })), o.categoryId || '');
        cat.addEventListener('change', function () { o.categoryId = cat.value; changed(); });
        card.appendChild(ui.field('Filtrer une catégorie (mode automatique)', cat));
        card.appendChild(pickBlock(rubric === 'last' ? 'Activités (dernière semaine)' : 'Activités (nouveautés)', o, 'auto', 'ids', 24, function (it) { var c = C.compose.classify(it, issue.refDate, App.p().settings, issue); return rubric === 'last' ? c.rubric === 'last' : c.isNew; }, 'titre de carte'));
        card.appendChild(h('p', { class: 'small muted' }, 'De 1 à 6 cartes par diapositive ; au-delà, des diapositives supplémentaires sont créées automatiquement.'));
      }
      /** Sélection automatique ou manuelle d'activités, avec ordre des cartes modifiable. */
      function pickBlock(title, o, autoKey, idsKey, max, suggested, key) {
        var fs = keyed(h('fieldset', {}, h('legend', {}, title)), key);
        var auto = h('input', { type: 'checkbox', checked: o[autoKey] !== false });
        auto.addEventListener('change', function () {
          o[autoKey] = auto.checked;
          if (!auto.checked && !(o[idsKey] || []).length) {
            var pg = currentPage(), cur = pg && pg.kind === 'cover' ? C.compose.coverData(pg, App.p(), issue).news : pg ? C.compose.selection(pg, App.p(), issue) : [];
            o[idsKey] = cur.map(function (it) { return it.id; }).slice(0, max);
          }
          changed(); drawOptions();
        });
        fs.appendChild(h('label', { class: 'check' }, auto, 'Sélection automatique (selon les dates)'));
        if (o[autoKey] === false) {
          var ids = o[idsKey] = o[idsKey] || [];
          if (ids.length) {
            var ord = h('ol', { class: 'order-list' });
            ids.forEach(function (id, i) {
              var it = App.item(id);
              ord.appendChild(h('li', {}, h('span', { class: 'grow' }, it ? it.title : 'Fiche supprimée'),
                h('button', { type: 'button', class: 'btn icon small', disabled: i === 0, 'aria-label': 'Monter', onclick: function () { ids.splice(i - 1, 0, ids.splice(i, 1)[0]); changed(); drawOptions(); } }, '↑'),
                h('button', { type: 'button', class: 'btn icon small', disabled: i === ids.length - 1, 'aria-label': 'Descendre', onclick: function () { ids.splice(i + 1, 0, ids.splice(i, 1)[0]); changed(); drawOptions(); } }, '↓')));
            });
            fs.appendChild(h('p', { class: 'small', style: { margin: '4px 0' } }, 'Ordre des cartes :'));
            fs.appendChild(ord);
          }
          var cands = App.p().items.filter(function (it) { return !it.archived && (it.type === 'activity' || it.type === 'partner' || it.type === 'info'); })
            .sort(function (a, b) { return (suggested(b) ? 1 : 0) - (suggested(a) ? 1 : 0) || C.compose.byDate(a, b); });
          var ul = h('ul', { class: 'picker' });
          cands.forEach(function (it) {
            var c = h('input', { type: 'checkbox', checked: ids.indexOf(it.id) >= 0 });
            c.addEventListener('change', function () {
              var i = ids.indexOf(it.id);
              if (c.checked && i < 0) { if (ids.length >= max) { c.checked = false; return ui.toast(max + ' activités maximum.', 'error'); } ids.push(it.id); }
              if (!c.checked && i >= 0) ids.splice(i, 1);
              changed(); drawOptions();
            });
            ul.appendChild(h('li', {}, h('label', {}, c, h('span', { class: 'grow' }, h('b', {}, it.title), h('br'), h('span', { class: 'small muted' }, [C.model.categoryName(App.p(), it), it.regEnd ? 'clôture ' + D.fmtShort(it.regEnd, true) : ''].filter(Boolean).join(' · '))), suggested(it) ? h('span', { class: 'chip new' }, 'suggérée') : null)));
          });
          fs.appendChild(cands.length ? ul : h('p', { class: 'small muted' }, 'Aucune fiche disponible.'));
        }
        return fs;
      }

      /* ---------- Contrôle final ---------- */
      function finalCheck() {
        App.finalCheckDialog(issue, function (pageId) { select(pageId); });
      }

      /* ---------- Actions ---------- */
      function regenerate() {
        ui.confirm('Actualiser depuis la bibliothèque', 'Les nouvelles fiches de la semaine seront ajoutées et les pages rangées par rubrique.\nLes pages déjà présentes, leurs réglages, textes personnalisés, positions et exclusions sont CONSERVÉS. Rien n’est effacé (↶ pour annuler).', 'Actualiser').then(function (ok) {
          if (!ok) return;
          var previous = selected, before = issue.pages.length;
          issue.pages = C.compose.refreshPreservingEdits(App.p(), issue);
          selected = issue.pages.some(function (pg) { return pg.id === previous; }) ? previous : issue.pages[0] && issue.pages[0].id;
          App.save('issues'); refreshAll();
          ui.toast('MEL actualisé : ' + (issue.pages.length - before) + ' page(s) ajoutée(s), aucune modification perdue.', 'ok');
        });
      }
      function addPageDialog() {
        var q = h('input', { type: 'search', placeholder: 'Rechercher une fiche…', 'aria-label': 'Rechercher une fiche' });
        var ul = h('ul', { class: 'picker' });
        var chosen = {};
        function drawPick() {
          ui.clear(ul);
          var n = q.value.trim().toLocaleLowerCase('fr');
          App.p().items.filter(function (it) { return !it.archived && (!n || String(it.title).toLocaleLowerCase('fr').indexOf(n) >= 0); }).sort(C.compose.byDate).forEach(function (it) {
            var inMel = issue.pages.some(function (x) { return x.itemId === it.id; });
            var c = h('input', { type: 'checkbox', checked: !!chosen[it.id] });
            c.addEventListener('change', function () { chosen[it.id] = c.checked; });
            var cls = C.compose.classify(it, issue.refDate, App.p().settings, issue);
            ul.appendChild(h('li', {}, h('label', {}, c, h('span', { class: 'grow' }, h('b', {}, it.title || 'Sans titre'), h('br'), h('span', { class: 'small muted' }, ui.typeLabel(it.type) + ' · ' + (C.compose.RUBRICS[cls.rubric] || {}).label + (inMel ? ' · déjà dans ce MEL' : ''))))));
          });
          if (!ul.children.length) ul.appendChild(h('li', { class: 'muted small' }, 'Aucune fiche.'));
        }
        q.addEventListener('input', drawPick);
        drawPick();
        var special = h('div', { class: 'btn-group', style: { marginBottom: '12px' } });
        [['news', 'Nouveautés (mosaïque)'], ['last', 'Dernières chances'], ['upcoming-list', 'Programme · liste'], ['upcoming-table', 'Programme · tableau']].forEach(function (s) {
          special.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { App.addSpecialPage(s[0]); var dlg = document.querySelector('dialog'); if (dlg) dlg.close(); } }, '+ ' + s[1]));
        });
        var create = h('div', { class: 'btn-group' });
        [['info', 'Information'], ['activity', 'Activité'], ['partner', 'Partenaire'], ['calendar', 'Calendrier / permanence'], ['page', 'Page permanente']].forEach(function (t) {
          create.appendChild(h('a', { class: 'btn small', href: '#/fiche/nouvelle/' + t[0] }, '+ ' + t[1]));
        });
        ui.dialog({ title: 'Ajouter des pages', body: h('div', {}, h('h3', {}, 'Pages de rubrique'), special, h('h3', {}, 'Fiches de la bibliothèque'), q, h('div', { style: { height: '8px' } }), ul,
          h('h3', {}, 'Créer une fiche'), create, h('p', { class: 'small muted' }, 'La fiche créée s’ajoute ensuite au MEL avec « + Ajouter au MEL en cours ».')),
          buttons: [{ label: 'Annuler', value: false }, { label: 'Ajouter la sélection', kind: 'primary', value: true }] }).then(function (ok) {
          if (!ok) return;
          var ids = Object.keys(chosen).filter(function (k) { return chosen[k]; });
          if (!ids.length) return;
          var newPages = ids.map(function (id) { return C.model.blankPage('item', { itemId: id }); });
          issue.suppressed = (issue.suppressed || []).filter(function (k) { return newPages.every(function (pg) { return C.compose.pageKey(pg) !== k; }); });
          var pos = Math.max(0, issue.pages.findIndex(function (x) { return x.id === selected; }) + 1);
          issue.pages.splice.apply(issue.pages, [pos, 0].concat(newPages));
          issue.pages = C.compose.enforceOrder(issue.pages, App.p(), issue);
          selected = newPages[0].id;
          App.save('issues'); refreshAll();
          ui.toast(ids.length + ' page(s) ajoutée(s) dans leur rubrique.', 'ok');
        });
      }
      function refreshAll() { drawList(); drawCenter(); drawOptions(); }
      refreshAll();
    }
  };
  function renderEmpty(el) {
    el.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Composer le MEL'), h('p', { class: 'lead' }, 'Aucun MEL n’a encore été créé.'))));
    el.appendChild(h('div', { class: 'card' }, h('p', {}, 'Le MEL est composé automatiquement à partir de la bibliothèque et de la date de référence (en général le lundi de la semaine de diffusion).'),
      h('button', { class: 'btn primary', type: 'button', onclick: function () { App.newIssueDialog(); } }, 'Créer le MEL de la semaine')));
  }
})(window);
