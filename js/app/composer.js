/* CSE Studio V9 · Composer le MEL : ordre des pages (glisser-déposer), options, aperçu, export. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;

  App.views.composer = {
    title: 'Composer le MEL',
    render: function (el, args) {
      var p = App.p();
      if (args[0]) { var target = p.issues.find(function (i) { return i.id === args[0]; }); if (target) p.activeIssueId = target.id; }
      var issue = App.activeIssue();
      if (!issue) { renderEmpty(el); return; }
      issue.pages = C.compose.enforceOrder(issue.pages, p);
      var selected = App.composerSelect && issue.pages.some(function (pg) { return pg.id === App.composerSelect; }) ? App.composerSelect : (issue.pages[0] && issue.pages[0].id);
      App.composerSelect = null;

      /* ---------- En-tête ---------- */
      var issueSel = ui.selectEl(p.issues.slice().sort(function (a, b) { return b.refDate.localeCompare(a.refDate); }).map(function (is) { return { id: is.id, label: 'Semaine ' + is.week + ' · ' + is.year + ' (' + D.fmtShort(is.refDate, true) + ')' }; }), issue.id, { 'aria-label': 'MEL affiché' });
      issueSel.addEventListener('change', function () { p.activeIssueId = issueSel.value; App.save('issues'); App.refresh(); });
      var exportBtn = h('button', { class: 'btn primary', type: 'button', onclick: function (e) { issue.numbering = numChk.checked; App.exportPptx(App.issueEntries(issue), 'CSE_MEL_S' + issue.week + '_' + issue.year + '.pptx', e.currentTarget); } }, '↓ Exporter le MEL (.pptx)');
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('h1', {}, 'Composer le MEL'), h('p', { class: 'lead' }, 'Ordonnez les pages, choisissez les modèles, prévisualisez puis exportez un PowerPoint modifiable.')),
        h('div', { class: 'btn-group' },
          h('div', { style: { minWidth: '230px' } }, issueSel),
          h('button', { class: 'btn', type: 'button', onclick: newIssueDialog }, '+ Nouveau MEL'),
          h('button', { class: 'btn', type: 'button', onclick: overview }, '▦ Vue d’ensemble'),
          h('button', { class: 'btn', type: 'button', onclick: function () { App.fullscreen(App.issueEntries(issue).map(function (e) { return e.slide; })); } }, '⤢ Diaporama'),
          h('button', { class: 'btn', type: 'button', onclick: function () { App.print(App.issueEntries(issue).map(function (e) { return e.slide; })); } }, '🖨 PDF'),
          p.settings.canvaUrl ? h('a', { class: 'btn', href: p.settings.canvaUrl, target: '_blank', rel: 'noopener noreferrer', title: 'Importer ensuite le .pptx dans Canva' }, '↗ Canva') : null,
          exportBtn)));

      var left = h('div', { class: 'card' }), center = h('div', { class: 'card' }), right = h('div', { class: 'opts-col' });
      el.appendChild(h('div', { class: 'composer' }, left, center, right));

      /* ---------- Paramètres du numéro ---------- */
      var refIn = h('input', { type: 'date', value: issue.refDate });
      var weekIn = h('input', { type: 'number', min: 1, max: 53, value: issue.week });
      var numChk = h('input', { type: 'checkbox', checked: issue.numbering });
      refIn.addEventListener('change', function () {
        if (!D.isValid(refIn.value)) return;
        issue.refDate = refIn.value; var w = D.isoWeek(refIn.value); issue.week = w.week; issue.year = w.year; weekIn.value = w.week;
        App.save('issues'); refreshAll(); ui.toast('Date de référence modifiée : nouveautés et dernières chances recalculées.');
      });
      weekIn.addEventListener('change', function () { issue.week = Math.max(1, Math.min(53, parseInt(weekIn.value, 10) || issue.week)); App.save('issues'); refreshAll(); });
      numChk.addEventListener('change', function () { issue.numbering = numChk.checked; App.save('issues'); refreshAll(); });
      left.appendChild(h('div', { class: 'cols' }, ui.field('Date de référence', refIn, { help: 'Sert au calcul J−x et des rubriques.' }), ui.field('N° de semaine', weekIn)));
      left.appendChild(h('label', { class: 'check' }, numChk, 'Numéroter les pages'));
      left.appendChild(h('div', { class: 'row', style: { marginBottom: '10px' } },
        h('button', { class: 'btn small', type: 'button', onclick: addPageDialog }, '+ Ajouter une page'),
        h('button', { class: 'btn small', type: 'button', onclick: regenerate }, '↻ Recomposer automatiquement')));
      var count = h('p', { class: 'small muted', style: { margin: '0 0 6px' } });
      left.appendChild(count);
      var list = h('ol', { class: 'pages', 'aria-label': 'Pages du MEL' });
      left.appendChild(list);
      left.appendChild(h('p', { class: 'small muted' }, 'Glisser-déposer ou flèches ↑ ↓ pour réordonner. La couverture reste en tête et le règlement en fin de MEL.'));

      /* ---------- Liste des pages ---------- */
      var dragId = null;
      function drawList() {
        ui.clear(list);
        var rendered = C.templates.renderIssue(p, issue, { all: true });
        var n = 1, totalSlides = 0;
        rendered.forEach(function (r, idx) {
          var pg = r.page;
          var nb = r.slides.length;
          var label = pg.included ? (nb > 1 ? n + '–' + (n + nb - 1) : String(n)) : '—';
          if (pg.included) { n += nb; totalSlides += nb; }
          var it = pg.kind === 'item' ? App.item(pg.itemId) : null;
          var tpl = C.templates.TEMPLATES.find(function (t) { return t.id === (r.slides[0] && r.slides[0].templateId); });
          var sub = (tpl ? tpl.name : '') + (nb > 1 ? ' · ' + nb + ' diapos' : '');
          var warn = r.slides.some(function (s) { return s.overflow || s.warnings.some(function (w) { return w.level === 'block'; }); });
          var mini = h('div', { class: 'mini' });
          if (r.slides[0]) mini.appendChild(ui.slideFrame(r.slides[0], { lazy: true, checkOverflow: false }).frame);
          var li = h('li', { class: 'pg' + (pg.id === selected ? ' active' : '') + (pg.included ? '' : ' excluded'), draggable: 'true', dataset: { id: pg.id }, tabindex: '0', 'aria-label': 'Page ' + label + ' : ' + App.pageLabel(pg) },
            h('span', { class: 'num' }, label), mini,
            h('div', { class: 'txt' }, h('b', {}, (warn ? '⚠ ' : '') + App.pageLabel(pg)), h('small', {}, sub + (it && it.archived ? ' · archivée' : ''))),
            h('div', { class: 'ops' },
              h('button', { type: 'button', title: pg.included ? 'Exclure du MEL (sans supprimer)' : 'Inclure dans le MEL', 'aria-label': pg.included ? 'Exclure la page' : 'Inclure la page', onclick: function (e) { e.stopPropagation(); pg.included = !pg.included; App.save('issues'); refreshAll(); } }, pg.included ? '👁' : '◌'),
              h('button', { type: 'button', title: 'Monter', 'aria-label': 'Monter la page', onclick: function (e) { e.stopPropagation(); move(idx, -1); } }, '↑'),
              h('button', { type: 'button', title: 'Descendre', 'aria-label': 'Descendre la page', onclick: function (e) { e.stopPropagation(); move(idx, 1); } }, '↓'),
              h('button', { type: 'button', title: 'Retirer du MEL (la fiche reste dans la bibliothèque)', 'aria-label': 'Retirer la page', onclick: function (e) { e.stopPropagation(); removePage(pg); } }, '✕')));
          li.addEventListener('click', function () { select(pg.id); });
          li.addEventListener('keydown', function (e) { if (e.key === 'Enter') select(pg.id); if (e.altKey && e.key === 'ArrowUp') { e.preventDefault(); move(idx, -1); } if (e.altKey && e.key === 'ArrowDown') { e.preventDefault(); move(idx, 1); } });
          li.addEventListener('dragstart', function (e) { dragId = pg.id; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', pg.id); });
          li.addEventListener('dragend', function () { li.classList.remove('dragging'); list.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); });
          li.addEventListener('dragover', function (e) { e.preventDefault(); list.querySelectorAll('.drop-before').forEach(function (x) { x.classList.remove('drop-before'); }); li.classList.add('drop-before'); });
          li.addEventListener('drop', function (e) {
            e.preventDefault();
            var from = issue.pages.findIndex(function (x) { return x.id === dragId; }), to = issue.pages.findIndex(function (x) { return x.id === pg.id; });
            if (from < 0 || to < 0 || from === to) return;
            var m = issue.pages.splice(from, 1)[0];
            issue.pages.splice(from < to ? to - 1 : to, 0, m);
            afterReorder();
          });
          list.appendChild(li);
        });
        // Dépôt en fin de liste
        list.ondragover = function (e) { e.preventDefault(); };
        list.ondrop = function (e) { if (e.target !== list) return; e.preventDefault(); var from = issue.pages.findIndex(function (x) { return x.id === dragId; }); if (from < 0) return; issue.pages.push(issue.pages.splice(from, 1)[0]); afterReorder(); };
        count.textContent = issue.pages.filter(function (x) { return x.included; }).length + ' page(s) incluse(s) sur ' + issue.pages.length + ' · ' + totalSlides + ' diapositive(s) exportée(s)';
      }
      function afterReorder() {
        var before = issue.pages.map(function (x) { return x.id; }).join();
        issue.pages = C.compose.enforceOrder(issue.pages, p);
        if (before !== issue.pages.map(function (x) { return x.id; }).join()) ui.toast('La couverture reste en tête et le règlement en fin de MEL.');
        App.save('issues'); drawList();
      }
      function move(idx, delta) {
        var j = idx + delta;
        if (j < 0 || j >= issue.pages.length) return;
        var t = issue.pages[idx]; issue.pages[idx] = issue.pages[j]; issue.pages[j] = t;
        afterReorder();
        var li = list.querySelector('[data-id="' + t.id + '"]'); if (li) li.focus();
      }
      function removePage(pg) {
        ui.confirm('Retirer la page', '« ' + App.pageLabel(pg) + ' » sera retirée de ce MEL. ' + (pg.kind === 'item' ? 'La fiche reste dans la bibliothèque.' : '') + '\nAstuce : « Exclure » (👁) la garde sans la publier.', 'Retirer', true).then(function (ok) {
          if (!ok) return;
          var i = issue.pages.indexOf(pg);
          issue.pages.splice(i, 1);
          if (selected === pg.id) selected = (issue.pages[Math.min(i, issue.pages.length - 1)] || {}).id;
          App.save('issues'); refreshAll();
        });
      }
      function select(id) { selected = id; list.querySelectorAll('.pg').forEach(function (li) { li.classList.toggle('active', li.dataset.id === id); }); drawCenter(); drawOptions(); }

      /* ---------- Aperçu central ---------- */
      function currentPage() { return issue.pages.find(function (x) { return x.id === selected; }); }
      function drawCenter() {
        ui.clear(center);
        var pg = currentPage();
        if (!pg) { center.appendChild(h('div', { class: 'empty' }, 'Ce MEL ne contient aucune page. Utilisez « Recomposer automatiquement » ou « Ajouter une page ».')); return; }
        var slides = C.templates.renderPage(pg, p, issue, { pageNumber: issue.numbering ? firstNumber(pg) : 0 });
        var idx = issue.pages.indexOf(pg);
        center.appendChild(h('div', { class: 'stage-head' },
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Page précédente', disabled: idx <= 0, onclick: function () { select(issue.pages[idx - 1].id); } }, '‹'),
          h('h2', {}, App.pageLabel(pg)),
          pg.included ? null : h('span', { class: 'chip closed' }, 'Exclue de l’export'),
          h('button', { class: 'btn small', type: 'button', onclick: function () { App.fullscreen(slides); } }, '⤢ Plein écran'),
          h('button', { class: 'btn small', type: 'button', onclick: function (e) { App.exportPptx(slides.map(function (s) { var it = App.item(pg.itemId); return { slide: s, title: App.pageLabel(pg), notes: App.notesFor(pg, it, s) }; }), 'CSE_' + ui.slug(App.pageLabel(pg)) + '.pptx', e.currentTarget); } }, '↓ Cette page (.pptx)'),
          h('button', { class: 'btn icon', type: 'button', 'aria-label': 'Page suivante', disabled: idx >= issue.pages.length - 1, onclick: function () { select(issue.pages[idx + 1].id); } }, '›')));
        var strip = h('div', { class: 'slides-strip' });
        slides.forEach(function (s, i) {
          if (slides.length > 1) strip.appendChild(h('div', { class: 'part-label' }, 'Diapositive ' + (i + 1) + ' / ' + slides.length));
          strip.appendChild(ui.slideFrame(s, { onAction: function (a) { onAction(pg, a); } }).frame);
        });
        center.appendChild(strip);
        var it = pg.kind === 'item' ? App.item(pg.itemId) : null;
        var r = C.templates.readability(slides);
        var ul = h('ul', { class: 'issues', style: { marginTop: '10px' } });
        ul.appendChild(h('li', { class: r.level === 'bad' ? 'block' : r.level === 'dense' ? 'warn' : 'ok' }, h('span', { class: 'ic' }, r.level === 'bad' ? '✕' : r.level === 'dense' ? '!' : '✓'), h('span', {}, 'Lisibilité : ' + r.label + (r.min ? ' (police minimale ' + Math.round(r.min * 0.8 * 10) / 10 + ' pt)' : ''))));
        var seen = {};
        slides.forEach(function (s) { s.warnings.forEach(function (w) {
          if (seen[w.msg]) return; seen[w.msg] = 1;
          var act = null;
          if ((w.code === 'suggest-split' || w.code === 'overflow') && pg.kind === 'item' && pg.split !== 'force') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { pg.split = 'auto'; App.save('issues'); refreshAll(); } }, 'Scission automatique');
          ul.appendChild(h('li', { class: w.level }, h('span', { class: 'ic' }, w.level === 'block' ? '✕' : w.level === 'info' ? 'i' : '!'), h('span', {}, w.msg), act));
        }); });
        if (it) C.compose.checkItem(it, p, issue.refDate).forEach(function (x) { if (!seen[x[1]]) ul.appendChild(h('li', { class: x[0] }, h('span', { class: 'ic' }, x[0] === 'block' ? '✕' : '!'), h('span', {}, x[1]))); });
        center.appendChild(ul);
      }
      function firstNumber(pg) {
        var n = 1;
        for (var i = 0; i < issue.pages.length; i++) {
          var x = issue.pages[i];
          if (x === pg) return n;
          if (x.included) n += C.templates.renderPage(x, p, issue).length;
        }
        return n;
      }
      function onAction(pg, a) {
        if (a.type !== 'calendar-day') return;
        var it = App.item(pg.itemId); if (!it) return;
        C.model.cycleCalendarDay(it.calendar, a.date, '');
        it.updatedAt = new Date().toISOString();
        App.save('items'); drawCenter(); refreshThumb(pg);
      }
      function refreshThumb() { drawList(); }

      /* ---------- Options de la page ---------- */
      function drawOptions() {
        ui.clear(right);
        var pg = currentPage();
        var card = h('div', { class: 'card' });
        right.appendChild(card);
        if (pg) {
          card.appendChild(h('h2', {}, 'Options de la page'));
          var inc = h('input', { type: 'checkbox', checked: pg.included });
          inc.addEventListener('change', function () { pg.included = inc.checked; App.save('issues'); refreshAll(); });
          card.appendChild(h('label', { class: 'check' }, inc, 'Inclure dans le MEL exporté'));
          (OPTS[pg.kind] || function () { })(card, pg);
        }
        right.appendChild(auditCard());
      }
      function changed() { App.save('issues'); drawCenter(); drawList(); }
      var OPTS = {
        item: function (card, pg) {
          var it = App.item(pg.itemId);
          if (!it) { card.appendChild(h('div', { class: 'alert error' }, 'Fiche introuvable : retirez cette page.')); return; }
          card.appendChild(h('p', {}, h('a', { class: 'btn small primary', href: '#/fiche/' + it.id }, '✎ Modifier la fiche'), ' ', h('span', { class: 'small muted' }, 'Les modifications valent pour tous les MEL.')));
          var opts = [{ id: 'auto', label: 'Celui de la fiche (' + (C.templates.TEMPLATES.find(function (t) { return t.id === C.templates.templateIdFor(C.model.blankPage('item', { itemId: it.id }), it, p); }) || {}).name + ')' }]
            .concat((C.templates.ITEM_TEMPLATES[it.type] || []).map(function (id) { return { id: id, label: C.templates.TEMPLATES.find(function (t) { return t.id === id; }).name }; }));
          var tpl = ui.selectEl(opts, pg.template);
          tpl.addEventListener('change', function () { pg.template = tpl.value; changed(); });
          card.appendChild(ui.field('Modèle pour ce MEL', tpl));
          var dens = ui.selectEl([{ id: 'auto', label: 'Celle de la fiche' }].concat(C.model.DENSITIES.slice(1)), pg.density);
          dens.addEventListener('change', function () { pg.density = dens.value; changed(); });
          card.appendChild(ui.field('Densité', dens, { help: 'Automatique / Aéré / Compact. En automatique, le mode compact s’applique seul si le texte ne tient pas.' }));
          if (['classic', 'immersive', 'info'].indexOf(C.templates.templateIdFor(pg, it, p)) >= 0) {
            var sp = ui.selectEl([{ id: 'auto', label: 'Automatique : 2e diapositive si le texte ne tient pas à 12 pt' }, { id: 'force', label: 'Toujours 2 diapositives' }, { id: 'off', label: 'Jamais (texte tronqué et signalé)' }], pg.split || 'auto');
            sp.addEventListener('change', function () { pg.split = sp.value; changed(); });
            card.appendChild(ui.field('Texte long', sp));
          }
          var cls = C.compose.classify(it, issue.refDate, p.settings);
          var chips = h('div', { class: 'row' }); ui.rubricChip(cls).forEach(function (x) { chips.appendChild(x); });
          card.appendChild(h('div', { class: 'field' }, h('span', { class: 'label' }, 'Rubrique au ' + D.fmtShort(issue.refDate, true)), chips));
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
          card.appendChild(h('fieldset', {}, h('legend', {}, 'Message important'), ui.field('Étiquette', lab), ui.field('Titre', t1), ui.field('Texte', t2)));
          var auto = h('input', { type: 'checkbox', checked: o.mustSee.auto !== false });
          var must = h('textarea', { rows: 2, placeholder: 'Texte personnalisé' }); must.value = o.mustSee.text || '';
          must.disabled = o.mustSee.auto !== false;
          auto.addEventListener('change', function () { o.mustSee.auto = auto.checked; must.disabled = auto.checked; changed(); });
          must.addEventListener('input', function () { o.mustSee.text = must.value; changedDeb(); });
          card.appendChild(h('fieldset', {}, h('legend', {}, 'À ne pas manquer'), h('label', { class: 'check' }, auto, 'Automatique (dernières chances de la semaine)'), ui.field('Texte manuel', must)));
          var ed = h('input', { value: o.editorial || '', placeholder: 'Message éditorial (facultatif)' });
          ed.addEventListener('input', function () { o.editorial = ed.value; changedDeb(); });
          var pl = h('input', { type: 'checkbox', checked: o.showPlanning !== false });
          pl.addEventListener('change', function () { o.showPlanning = pl.checked; changed(); });
          card.appendChild(ui.field('Ligne éditoriale', ed));
          card.appendChild(h('label', { class: 'check' }, pl, 'Afficher le lien « vue d’ensemble des activités »'));
          card.appendChild(pickBlock('Nouveautés en couverture (4 max)', o, 'newsAuto', 'newsIds', 4, function (it) { var c = C.compose.classify(it, issue.refDate, p.settings); return c.isNew; }));
        },
        news: function (card, pg) { mosaicOptions(card, pg, 'new'); },
        last: function (card, pg) { mosaicOptions(card, pg, 'last'); },
        upcoming: function (card, pg) {
          var o = pg.opts;
          var style = ui.selectEl([{ id: 'list', label: 'Liste chronologique' }, { id: 'table', label: 'Tableau' }], o.style);
          style.addEventListener('change', function () { o.style = style.value; changed(); });
          var title = h('input', { value: o.title || '' }); title.addEventListener('input', function () { o.title = title.value; changedDeb(); });
          var sub = h('input', { value: o.subtitle || '', placeholder: 'Ex. 1er semestre 2027' }); sub.addEventListener('input', function () { o.subtitle = sub.value; changedDeb(); });
          card.appendChild(ui.field('Présentation', style)); card.appendChild(ui.field('Titre', title)); card.appendChild(ui.field('Sous-titre', sub));
          var auto = h('input', { type: 'checkbox', checked: o.auto !== false });
          auto.addEventListener('change', function () { o.auto = auto.checked; changed(); drawOptions(); });
          card.appendChild(h('label', { class: 'check' }, auto, 'Alimenter automatiquement depuis la bibliothèque'));
          if (o.auto !== false) {
            var cat = ui.selectEl([{ id: '', label: 'Toutes les catégories' }].concat(p.categories.map(function (c) { return { id: c.id, label: c.name }; })), o.categoryId || '');
            cat.addEventListener('change', function () { o.categoryId = cat.value; changed(); });
            var from = h('input', { type: 'date', value: o.from || '' }), to = h('input', { type: 'date', value: o.to || '' });
            from.addEventListener('change', function () { o.from = from.value; changed(); }); to.addEventListener('change', function () { o.to = to.value; changed(); });
            card.appendChild(ui.field('Catégorie', cat)); card.appendChild(h('div', { class: 'cols' }, ui.field('Du', from), ui.field('Au', to)));
            card.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { o.rows = C.compose.upcomingRows(pg, p, issue).map(function (r) { return { date: r.date, title: r.title, location: r.location, type: r.type }; }); o.auto = false; changed(); drawOptions(); ui.toast('Lignes copiées : vous pouvez maintenant les modifier.'); } }, 'Copier en lignes modifiables'));
          } else {
            var rows = h('div');
            (o.rows || []).forEach(function (r, i) {
              var d = h('input', { type: 'date', value: r.date || '', 'aria-label': 'Date ligne ' + (i + 1) });
              var t = h('input', { value: r.title || '', placeholder: 'Activité', 'aria-label': 'Activité ligne ' + (i + 1) });
              var l = h('input', { value: r.location || '', placeholder: 'Lieu', 'aria-label': 'Lieu ligne ' + (i + 1) });
              var ty = h('input', { value: r.type || '', placeholder: 'Type / statut', 'aria-label': 'Type ligne ' + (i + 1) });
              [[d, 'date'], [t, 'title'], [l, 'location'], [ty, 'type']].forEach(function (pair) { pair[0].addEventListener('input', function () { r[pair[1]] = pair[0].value; changedDeb(); }); });
              rows.appendChild(h('div', { style: { borderBottom: '1px solid #EEF1F6', padding: '6px 0' } }, h('div', { class: 'cols' }, d, t), h('div', { class: 'cols', style: { marginTop: '4px' } }, l, ty),
                h('button', { class: 'btn small danger', type: 'button', style: { marginTop: '4px' }, onclick: function () { o.rows.splice(i, 1); changed(); drawOptions(); } }, 'Supprimer la ligne')));
            });
            card.appendChild(rows);
            card.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { o.rows = o.rows || []; o.rows.push({ date: '', title: '', location: '', type: '' }); changed(); drawOptions(); } }, '+ Ajouter une ligne'));
          }
          var note = h('input', { value: o.note || '', placeholder: p.settings.mentions.upcoming });
          note.addEventListener('input', function () { o.note = note.value; changedDeb(); });
          card.appendChild(ui.field('Mention (facultatif)', note));
        }
      };
      var changedDeb = ui.debounce(changed, 250);
      function mosaicOptions(card, pg, rubric) {
        var o = pg.opts;
        var title = h('input', { value: o.title || '' }); title.addEventListener('input', function () { o.title = title.value; changedDeb(); });
        var sub = h('input', { value: o.subtitle || '', placeholder: 'Automatique' }); sub.addEventListener('input', function () { o.subtitle = sub.value; changedDeb(); });
        card.appendChild(ui.field('Titre', title)); card.appendChild(ui.field('Sous-titre', sub));
        var cat = ui.selectEl([{ id: '', label: 'Toutes les catégories' }].concat(p.categories.map(function (c) { return { id: c.id, label: c.name }; })), o.categoryId || '');
        cat.addEventListener('change', function () { o.categoryId = cat.value; changed(); });
        card.appendChild(ui.field('Filtrer une catégorie (mode automatique)', cat));
        card.appendChild(pickBlock(rubric === 'last' ? 'Activités (dernière semaine)' : 'Activités (nouveautés)', o, 'auto', 'ids', 24, function (it) { var c = C.compose.classify(it, issue.refDate, p.settings); return rubric === 'last' ? c.rubric === 'last' : c.isNew; }));
        card.appendChild(h('p', { class: 'small muted' }, 'De 1 à 6 activités par diapositive ; au-delà, des diapositives supplémentaires sont créées automatiquement.'));
      }
      /** Sélection automatique ou manuelle d'activités. */
      function pickBlock(title, o, autoKey, idsKey, max, suggested) {
        var fs = h('fieldset', {}, h('legend', {}, title));
        var auto = h('input', { type: 'checkbox', checked: o[autoKey] !== false });
        auto.addEventListener('change', function () { o[autoKey] = auto.checked; if (!auto.checked && !(o[idsKey] || []).length) o[idsKey] = p.items.filter(function (it) { return !it.archived && suggested(it); }).slice(0, max).map(function (it) { return it.id; }); changed(); drawOptions(); });
        fs.appendChild(h('label', { class: 'check' }, auto, 'Sélection automatique'));
        if (o[autoKey] === false) {
          var ids = o[idsKey] = o[idsKey] || [];
          var cands = p.items.filter(function (it) { return !it.archived && (it.type === 'activity' || it.type === 'partner' || it.type === 'info'); })
            .sort(function (a, b) { return (suggested(b) ? 1 : 0) - (suggested(a) ? 1 : 0) || C.compose.byDate(a, b); });
          var ul = h('ul', { class: 'picker' });
          cands.forEach(function (it) {
            var c = h('input', { type: 'checkbox', checked: ids.indexOf(it.id) >= 0 });
            c.addEventListener('change', function () {
              var i = ids.indexOf(it.id);
              if (c.checked && i < 0) { if (ids.length >= max) { c.checked = false; return ui.toast(max + ' activités maximum.', 'error'); } ids.push(it.id); }
              if (!c.checked && i >= 0) ids.splice(i, 1);
              changed();
            });
            ul.appendChild(h('li', {}, h('label', {}, c, h('span', { class: 'grow' }, h('b', {}, it.title), h('br'), h('span', { class: 'small muted' }, [C.model.categoryName(p, it), it.regEnd ? 'clôture ' + D.fmtShort(it.regEnd, true) : ''].filter(Boolean).join(' · '))), suggested(it) ? h('span', { class: 'chip new' }, 'suggérée') : null)));
          });
          fs.appendChild(cands.length ? ul : h('p', { class: 'small muted' }, 'Aucune fiche disponible.'));
        }
        return fs;
      }
      function auditCard() {
        var card = h('div', { class: 'card' }, h('h3', {}, 'Contrôle du MEL'));
        var list = C.compose.audit(p, issue);
        var ul = h('ul', { class: 'issues' });
        list.slice(0, 20).forEach(function (a) {
          ul.appendChild(h('li', { class: a.level }, h('span', { class: 'ic' }, a.level === 'block' ? '✕' : a.level === 'info' ? 'i' : '!'), h('span', {}, a.msg),
            a.pageId ? h('button', { class: 'btn small act', type: 'button', onclick: function () { select(a.pageId); } }, 'Voir') : a.itemId ? h('a', { class: 'btn small act', href: '#/fiche/' + a.itemId }, 'Ouvrir') : null));
        });
        if (!list.length) ul.appendChild(h('li', { class: 'ok' }, h('span', { class: 'ic' }, '✓'), h('span', {}, 'Aucune anomalie détectée (doublons, dates, liens, fiches expirées).')));
        card.appendChild(ul);
        return card;
      }

      /* ---------- Actions ---------- */
      function regenerate() {
        ui.confirm('Recomposer automatiquement', 'L’ordre des pages de ce MEL sera recalculé à partir de la bibliothèque (date de référence ' + D.fmtLong(issue.refDate) + ').\nLes options personnalisées des pages (couverture, sélections) seront réinitialisées. Les fiches ne sont pas modifiées.', 'Recomposer').then(function (ok) {
          if (!ok) return;
          var oldCover = issue.pages.find(function (x) { return x.kind === 'cover'; });
          issue.pages = C.compose.autoCompose(p, issue);
          var nc = issue.pages.find(function (x) { return x.kind === 'cover'; });
          if (oldCover && nc) nc.opts = oldCover.opts; // le message de couverture saisi est conservé
          selected = issue.pages[0] && issue.pages[0].id;
          App.save('issues'); refreshAll();
          ui.toast('MEL recomposé : ' + issue.pages.length + ' page(s).', 'ok');
        });
      }
      function addPageDialog() {
        var q = h('input', { type: 'search', placeholder: 'Rechercher une fiche…', 'aria-label': 'Rechercher une fiche' });
        var ul = h('ul', { class: 'picker' });
        var chosen = {};
        function drawPick() {
          ui.clear(ul);
          var n = q.value.trim().toLocaleLowerCase('fr');
          p.items.filter(function (it) { return !it.archived && (!n || String(it.title).toLocaleLowerCase('fr').indexOf(n) >= 0); }).sort(C.compose.byDate).forEach(function (it) {
            var inMel = issue.pages.some(function (x) { return x.itemId === it.id; });
            var c = h('input', { type: 'checkbox', checked: !!chosen[it.id] });
            c.addEventListener('change', function () { chosen[it.id] = c.checked; });
            var cls = C.compose.classify(it, issue.refDate, p.settings);
            var li = h('li', {}, h('label', {}, c, h('span', { class: 'grow' }, h('b', {}, it.title || 'Sans titre'), h('br'), h('span', { class: 'small muted' }, ui.typeLabel(it.type) + ' · ' + (C.compose.RUBRICS[cls.rubric] || {}).label + (inMel ? ' · déjà dans ce MEL' : '')))));
            ul.appendChild(li);
          });
          if (!ul.children.length) ul.appendChild(h('li', { class: 'muted small' }, 'Aucune fiche.'));
        }
        q.addEventListener('input', drawPick);
        drawPick();
        var special = h('div', { class: 'btn-group', style: { marginBottom: '12px' } });
        [['cover', 'Couverture'], ['news', 'Nouveautés (mosaïque)'], ['last', 'Dernières chances'], ['upcoming-list', 'Programme · liste'], ['upcoming-table', 'Programme · tableau']].forEach(function (s) {
          special.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { App.addSpecialPage(s[0]); document.querySelector('dialog') && document.querySelector('dialog').close(); } }, '+ ' + s[1]));
        });
        ui.dialog({ title: 'Ajouter des pages', body: h('div', {}, h('h3', {}, 'Pages de numéro'), special, h('h3', {}, 'Fiches de la bibliothèque'), q, h('div', { style: { height: '8px' } }), ul,
          h('p', { class: 'small' }, h('a', { href: '#/fiche/nouvelle/activity' }, '+ Créer une nouvelle fiche'))),
          buttons: [{ label: 'Annuler', value: false }, { label: 'Ajouter la sélection', kind: 'primary', value: true }] }).then(function (ok) {
          if (!ok) return;
          var ids = Object.keys(chosen).filter(function (k) { return chosen[k]; });
          if (!ids.length) return;
          var pos = Math.max(0, issue.pages.findIndex(function (x) { return x.id === selected; }) + 1);
          var newPages = ids.map(function (id) { return C.model.blankPage('item', { itemId: id }); });
          issue.pages.splice.apply(issue.pages, [pos, 0].concat(newPages));
          issue.pages = C.compose.enforceOrder(issue.pages, p);
          selected = newPages[0].id;
          App.save('issues'); refreshAll();
          ui.toast(ids.length + ' page(s) ajoutée(s).', 'ok');
        });
      }
      function overview() {
        var entries = App.issueEntries(issue);
        var grid = h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' } });
        entries.forEach(function (e, i) {
          var fig = h('figure', { style: { margin: 0, cursor: 'pointer' }, onclick: function () { App.fullscreen(entries.map(function (x) { return x.slide; }), i); } },
            ui.slideFrame(e.slide, { lazy: true, checkOverflow: false }).frame, h('figcaption', { class: 'small muted', style: { marginTop: '4px' } }, (i + 1) + '. ' + e.title));
          grid.appendChild(fig);
        });
        ui.dialog({ title: 'Vue d’ensemble · ' + entries.length + ' diapositive(s)', body: entries.length ? grid : h('p', {}, 'Aucune page incluse.') });
      }
      function refreshAll() { drawList(); drawCenter(); drawOptions(); }
      refreshAll();
    }
  };
  function renderEmpty(el) {
    el.appendChild(h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, 'Composer le MEL'), h('p', { class: 'lead' }, 'Aucun MEL n’a encore été créé.'))));
    el.appendChild(h('div', { class: 'card' }, h('p', {}, 'Le MEL est composé automatiquement à partir de la bibliothèque et de la date de référence (en général le lundi de la semaine de diffusion).'),
      h('button', { class: 'btn primary', type: 'button', onclick: newIssueDialog }, 'Créer le MEL de la semaine')));
  }
  function newIssueDialog() {
    var p = App.p();
    var ref = h('input', { type: 'date', value: App.defaultRefDate() });
    var wk = h('p', { class: 'small muted' });
    function upd() { var w = D.isoWeek(ref.value); wk.textContent = w ? 'Semaine ' + w.week + ' de ' + w.year : 'Date invalide'; }
    ref.addEventListener('input', upd); upd();
    var mode = ui.selectEl([{ id: 'auto', label: 'Composer automatiquement (recommandé)' }, { id: 'copy', label: 'Reprendre l’ordre du MEL précédent' }, { id: 'empty', label: 'MEL vide' }], 'auto');
    ui.dialog({ title: 'Nouveau MEL', body: h('div', {}, ui.field('Date de référence', ref), wk, ui.field('Contenu', mode),
      h('p', { class: 'small muted' }, 'Les MEL précédents restent disponibles dans la liste. Les fiches anciennes ou expirées ne sont pas reprises automatiquement.')),
    buttons: [{ label: 'Annuler', value: false }, { label: 'Créer', kind: 'primary', value: true, validate: function () { return D.isValid(ref.value); } }] }).then(function (ok) {
      if (!ok) return;
      var prev = App.activeIssue();
      var is = App.newIssue(ref.value, mode.value === 'auto');
      is.numbering = !!p.settings.numbering;
      if (mode.value === 'copy' && prev) {
        is.pages = prev.pages.filter(function (pg) {
          if (pg.kind !== 'item') return true;
          var it = App.item(pg.itemId); if (!it || it.archived) return false;
          var c = C.compose.classify(it, is.refDate, p.settings);
          return ['expired', 'closed', 'cancelled'].indexOf(c.rubric) < 0;
        }).map(function (pg) { var c = JSON.parse(JSON.stringify(pg)); c.id = C.model.uid('page'); return C.model.normalizePage(c); });
      }
      App.save('issues');
      App.go('#/mel/' + is.id);
      ui.toast('MEL de la semaine ' + is.week + ' créé.', 'ok');
    });
  }
})(window);
