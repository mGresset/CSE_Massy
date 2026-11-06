/* CSE Studio V9 · Éditeur de fiche : formulaire guidé par étapes, aperçu 16:9 fidèle à l'export. */
(function (root) {
  'use strict';
  var C = root.CSE, ui = C.ui, h = ui.h, App = C.app = C.app || {};
  App.views = App.views || {};
  var D = C.dates;

  /* Étapes et champs selon le type de fiche. */
  var STEPS = {
    activity: ['essentiel', 'dates', 'contenu', 'visuels', 'tarifs', 'pratique'],
    info: ['essentiel', 'contenu', 'visuels', 'pratique'],
    partner: ['essentiel', 'offre', 'contenu', 'visuels', 'pratique'],
    calendar: ['essentiel', 'calendrier', 'visuels', 'pratique'],
    page: ['essentiel', 'contenu', 'visuels', 'pratique'],
    rules: ['essentiel', 'contenu', 'pratique']
  };
  var STEP_LABELS = { essentiel: 'Essentiel', dates: 'Dates & inscriptions', contenu: 'Contenu', visuels: 'Visuels & lien', tarifs: 'Tarifs & points', pratique: 'Contacts & infos', offre: 'Offre', calendrier: 'Calendrier' };
  var state = { step: 'essentiel', template: 'auto', split: false };

  App.views.editor = {
    title: 'Fiche',
    render: function (el, args) {
      var p = App.p(), it;
      if (args[0] === 'nouvelle') {
        it = C.model.blankItem(args[1] || 'activity');
        if (args[2]) it.template = args[2];
        if (it.type === 'calendar') it.calendar.month = App.refDate().slice(0, 7);
        if (it.type === 'rules') it.title = 'Modalités d’inscription aux activités du CSE';
        if (it.type !== 'activity' && it.type !== 'partner') it.categoryId = 'cat-informations';
        p.items.push(it);
        App.save('items');
        history.replaceState(null, '', '#/fiche/' + it.id);
        state.step = 'essentiel';
      } else {
        it = App.item(args[0]);
        if (!it) { el.appendChild(h('div', { class: 'alert error' }, 'Fiche introuvable (supprimée ?). ', h('a', { href: '#/bibliotheque' }, 'Retour à la bibliothèque'))); return; }
        if (state.itemId !== it.id) state.step = 'essentiel';
      }
      state.itemId = it.id;
      var steps = STEPS[it.type] || STEPS.activity;
      if (!p.settings.pricingModule) steps = steps.map(function (s) { return s === 'tarifs' ? 'tarifs' : s; });
      if (steps.indexOf(state.step) < 0) state.step = steps[0];

      var titleEl = h('h1', {}, it.title || 'Nouvelle fiche');
      el.appendChild(h('div', { class: 'page-head' },
        h('div', {}, h('p', { class: 'muted small', style: { margin: 0 } }, h('a', { href: '#/bibliotheque' }, '← Bibliothèque'), ' · ', ui.typeLabel(it.type)), titleEl),
        h('div', { class: 'btn-group' },
          h('button', { class: 'btn', type: 'button', onclick: function () { var c = App.duplicateItem(it); App.go('#/fiche/' + c.id); } }, 'Dupliquer'),
          h('button', { class: 'btn', type: 'button', onclick: function () { it.archived = !it.archived; touch(); ui.toast(it.archived ? 'Fiche archivée.' : 'Fiche réactivée.'); App.refresh(); } }, it.archived ? 'Désarchiver' : 'Archiver'),
          h('button', { class: 'btn primary', type: 'button', onclick: function () { App.addToIssue(it); } }, '+ Ajouter au MEL en cours'))));
      if (it.archived) el.appendChild(h('div', { class: 'alert warn' }, 'Fiche archivée : elle n’apparaît plus dans les compositions automatiques.'));
      if (it.legacy) el.appendChild(h('div', { class: 'alert info small' }, 'Fiche reprise d’une version précédente (' + it.legacy.source + '). Les valeurs d’origine sont conservées dans la sauvegarde JSON.'));

      var form = h('div', { class: 'card' });
      var preview = h('div', { class: 'preview-col' });
      el.appendChild(h('div', { class: 'editor' }, form, preview));

      /* ---------- Aperçu ---------- */
      var tplSel = ui.selectEl([{ id: 'auto', label: 'Automatique (recommandé)' }].concat((C.templates.ITEM_TEMPLATES[it.type] || []).map(function (id) { return { id: id, label: C.templates.TEMPLATES.find(function (t) { return t.id === id; }).name }; })), it.template);
      tplSel.addEventListener('change', function () { it.template = tplSel.value; touch(); renderPreview(); });
      var densSel = ui.selectEl(C.model.DENSITIES, it.density);
      densSel.addEventListener('change', function () { it.density = densSel.value; touch(); renderPreview(); });
      var splitChk = h('input', { type: 'checkbox', checked: state.split });
      splitChk.addEventListener('change', function () { state.split = splitChk.checked; renderPreview(); });
      var read = h('span', { class: 'readability' });
      var stage = h('div', { class: 'slides-strip' });
      var issuesBox = h('ul', { class: 'issues', 'aria-live': 'polite' });
      var lastSlides = [];
      preview.appendChild(h('div', { class: 'card' },
        h('div', { class: 'preview-tools' }, ui.field('Modèle', tplSel), ui.field('Densité', densSel),
          h('label', { class: 'check', title: 'Aperçu de la fiche sur deux diapositives' }, splitChk, 'Scinder en 2 pages'), h('span', { class: 'spacer' }), read),
        h('div', { style: { marginTop: '10px' } }, stage),
        h('div', { class: 'row', style: { marginTop: '10px' } },
          h('button', { class: 'btn', type: 'button', onclick: function () { App.fullscreen(lastSlides); } }, '⤢ Aperçu plein écran'),
          h('button', { class: 'btn', type: 'button', onclick: function (e) { App.exportPptx(lastSlides.map(function (s) { return { slide: s, title: it.title, notes: App.notesFor({}, it, s) }; }), 'CSE_' + ui.slug(it.title) + '.pptx', e.currentTarget); } }, '↓ Exporter cette diapositive (.pptx)'),
          h('span', { class: 'spacer' }), h('span', { class: 'small muted' }, 'Statut au ' + D.fmtShort(App.refDate(), true) + ' : '), h('span', { id: 'rubricBox' }))));
      preview.appendChild(h('div', { class: 'card' }, h('h3', {}, 'Contrôles et lisibilité'), issuesBox));
      var renderPreview = ui.debounce(function () {
        lastSlides = C.templates.renderItem(it, p, { refDate: App.refDate(), split: state.split });
        ui.clear(stage);
        lastSlides.forEach(function (s, i) {
          if (lastSlides.length > 1) stage.appendChild(h('div', { class: 'part-label' }, 'Diapositive ' + (i + 1) + ' / ' + lastSlides.length));
          var f = ui.slideFrame(s, { label: 'Aperçu de la diapositive', onAction: onAction, onDrawn: function (r) { if (r.domOverflow.length) addIssue('warn', 'Débordement détecté à l’affichage : ' + r.domOverflow.join(', ') + '. Raccourcir le texte.'); } });
          stage.appendChild(f.frame);
        });
        var r = C.templates.readability(lastSlides);
        read.className = 'readability ' + r.level;
        read.textContent = 'Lisibilité : ' + r.label + (r.min ? ' · police min. ' + Math.round(r.min * 0.8 * 10) / 10 + ' pt' : '');
        var rb = document.getElementById('rubricBox');
        if (rb) { ui.clear(rb); ui.rubricChip(C.compose.classify(it, App.refDate(), p.settings)).forEach(function (x) { rb.appendChild(x); }); }
        renderIssues();
      }, 90);
      function addIssue(level, msg, action) {
        var li = h('li', { class: level }, h('span', { class: 'ic' }, level === 'block' ? '✕' : level === 'ok' ? '✓' : level === 'info' ? 'i' : '!'), h('span', {}, msg));
        if (action) li.appendChild(action);
        issuesBox.appendChild(li);
      }
      function renderIssues() {
        ui.clear(issuesBox);
        var list = C.compose.checkItem(it, p, App.refDate());
        list.forEach(function (x) { addIssue(x[0], x[1]); });
        var seen = {};
        lastSlides.forEach(function (s) { s.warnings.forEach(function (w) {
          if (seen[w.msg] || /^Tarifs : /.test(w.msg)) return; seen[w.msg] = 1;
          var act = null;
          if (w.code === 'suggest-split' || w.code === 'overflow') act = h('button', { class: 'btn small act', type: 'button', onclick: function () { state.split = true; splitChk.checked = true; renderPreview(); ui.toast('Aperçu sur deux pages. Dans le MEL, cochez « Scinder en 2 pages » sur la page de cette fiche.'); } }, 'Scinder');
          addIssue(w.level, w.msg, act);
        }); });
        if (!issuesBox.children.length) addIssue('ok', 'Aucun problème détecté. Relisez la diapositive avant diffusion.');
        updateStepErrors();
      }
      function onAction(a) {
        if (a.type === 'calendar-day') { cycleDay(a.date); }
      }
      function cycleDay(date) {
        var keys = ['none'].concat(it.calendar.statuses.map(function (s) { return s.key; }));
        var cur = it.calendar.days[date] || 'none';
        var next = keys[(keys.indexOf(cur) + 1) % keys.length];
        if (next === 'none') delete it.calendar.days[date]; else it.calendar.days[date] = next;
        touch(); renderPreview(); if (state.step === 'calendrier') drawStep();
      }
      function touch() {
        it.updatedAt = new Date().toISOString();
        if (it.editorialStatus === 'approved') { it.editorialStatus = 'review'; ui.toast('Fiche modifiée : statut repassé à « À relire ».'); }
        titleEl.textContent = it.title || 'Nouvelle fiche';
        App.save('items');
      }

      /* ---------- Formulaire par étapes ---------- */
      var stepBar = h('div', { class: 'steps', role: 'tablist', 'aria-label': 'Étapes de la fiche' });
      var stepBody = h('div', { role: 'tabpanel' });
      var stepNav = h('div', { class: 'step-nav' });
      form.appendChild(stepBar); form.appendChild(stepBody); form.appendChild(stepNav);
      steps.forEach(function (s, i) {
        var b = h('button', { type: 'button', role: 'tab', 'aria-selected': String(s === state.step), dataset: { step: s }, onclick: function () { state.step = s; drawStep(); } }, h('span', { class: 'n' }, String(i + 1)), STEP_LABELS[s]);
        stepBar.appendChild(b);
      });
      function updateStepErrors() {
        var errs = { essentiel: !String(it.title).trim(), dates: !!(it.dateStart && it.dateEnd && it.dateEnd < it.dateStart) || !!(it.regStart && it.regEnd && it.regEnd < it.regStart), visuels: it.link.type === 'custom' && !!it.link.url && !C.compose.validUrl(it.link.url) };
        stepBar.querySelectorAll('button').forEach(function (b) { b.classList.toggle('has-error', !!errs[b.dataset.step]); });
      }
      function drawStep() {
        stepBar.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.step === state.step)); });
        ui.clear(stepBody); ui.clear(stepNav);
        var fn = STEP_RENDER[state.step];
        fn(stepBody, it, p, { touch: touch, render: renderPreview, redraw: drawStep });
        var i = steps.indexOf(state.step);
        stepNav.appendChild(i > 0 ? h('button', { class: 'btn', type: 'button', onclick: function () { state.step = steps[i - 1]; drawStep(); } }, '← ' + STEP_LABELS[steps[i - 1]]) : h('span'));
        stepNav.appendChild(i < steps.length - 1 ? h('button', { class: 'btn primary', type: 'button', onclick: function () { state.step = steps[i + 1]; drawStep(); } }, STEP_LABELS[steps[i + 1]] + ' →') : h('a', { class: 'btn primary', href: '#/bibliotheque' }, 'Terminer'));
      }
      drawStep();
      renderPreview();
      if (!it.title) setTimeout(function () { var t = stepBody.querySelector('input'); if (t) t.focus(); }, 50);
    }
  };

  /* ---------- Contrôles liés à la fiche ---------- */
  function bindInput(it, key, ctx, opts) {
    opts = opts || {};
    var tag = opts.rows ? 'textarea' : 'input';
    var get = opts.get || function () { return it[key]; };
    var set = opts.set || function (v) { it[key] = v; };
    var el = h(tag, { type: opts.rows ? null : (opts.type || 'text'), placeholder: opts.placeholder || '', maxlength: opts.max || null, min: opts.min, max: opts.maxv, step: opts.step });
    if (opts.rows) el.rows = opts.rows;
    el.value = get() || '';
    el.addEventListener('input', function () { set(el.value); ctx.touch(); ctx.render(); if (opts.after) opts.after(el.value); });
    var w = ui.field(opts.label, el, { help: opts.help, required: opts.required });
    if (opts.required) {
      var check = function () { var bad = !String(el.value).trim(); w.classList.toggle('invalid', bad); var e = w.querySelector('.err'); if (bad && !e) w.appendChild(h('span', { class: 'err' }, 'Champ obligatoire.')); if (!bad && e) e.remove(); };
      el.addEventListener('blur', check);
    }
    return w;
  }
  function bindSelect(it, key, options, ctx, opts) {
    opts = opts || {};
    var get = opts.get || function () { return it[key]; };
    var set = opts.set || function (v) { it[key] = v; };
    var s = ui.selectEl(options, get());
    s.addEventListener('change', function () { set(s.value); ctx.touch(); ctx.render(); if (opts.redraw) ctx.redraw(); });
    return ui.field(opts.label, s, { help: opts.help });
  }
  function bindCheck(it, label, get, set, ctx, help, redraw) {
    var c = h('input', { type: 'checkbox', checked: !!get() });
    c.addEventListener('change', function () { set(c.checked); ctx.touch(); ctx.render(); if (redraw) ctx.redraw(); });
    return h('div', {}, h('label', { class: 'check' }, c, label), help ? h('small', { class: 'help', style: { display: 'block', margin: '-8px 0 12px 26px' } }, help) : null);
  }
  var richHelp = 'Astuces : **texte** = gras · une ligne commençant par « - » = puce · ligne vide = espace.';

  var STEP_RENDER = {
    essentiel: function (box, it, p, ctx) {
      box.appendChild(bindSelect(it, 'type', C.model.TYPES, ctx, { label: 'Type de fiche', help: (C.model.TYPES.find(function (t) { return t.id === it.type; }) || {}).hint, set: function (v) { it.type = v; it.template = 'auto'; }, redraw: true }));
      box.querySelector('select').addEventListener('change', function () { App.refresh(); });
      box.appendChild(bindInput(it, 'title', ctx, { label: it.type === 'partner' ? 'Enseigne / nom du partenaire' : 'Titre', required: true, max: 160, placeholder: it.type === 'activity' ? 'Ex. Circuit Sri Lanka authenticité' : '' }));
      box.appendChild(bindInput(it, 'subtitle', ctx, { label: 'Sous-titre / précision (facultatif)', max: 200, placeholder: 'Ex. Vacances de printemps' }));
      var cats = p.categories.map(function (c) { return { id: c.id, label: c.name }; });
      box.appendChild(h('div', { class: 'cols' },
        bindSelect(it, 'categoryId', cats, ctx, { label: 'Catégorie' }),
        it.type === 'activity' || it.type === 'info' || it.type === 'partner' ? bindSelect(it, 'editorial', C.model.EDITORIAL, ctx, { label: 'Rubrique éditoriale', help: 'Automatique : nouveauté si créée depuis moins de ' + p.settings.newDays + ' j, dernière chance si clôture sous ' + p.settings.lastDays + ' j.' }) : null));
      box.appendChild(h('p', { class: 'small' }, h('a', { href: '#/parametres' }, 'Gérer les catégories (créer, renommer, réordonner)…')));
      box.appendChild(bindSelect(it, 'editorialStatus', [{ id: 'draft', label: 'Brouillon' }, { id: 'review', label: 'À relire' }, { id: 'approved', label: 'Validée pour diffusion' }], ctx, { label: 'Validation interne', help: 'Indication de travail en local. Une validation sécurisée (rôles Rédacteur / Relecteur) nécessite l’espace partagé Supabase.' }));
    },
    dates: function (box, it, p, ctx) {
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'dateStart', ctx, { label: 'Date de début', type: 'date' }), bindInput(it, 'dateEnd', ctx, { label: 'Date de fin (facultatif)', type: 'date' })));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'timeStart', ctx, { label: 'Heure de début', type: 'time' }), bindInput(it, 'timeEnd', ctx, { label: 'Heure de fin', type: 'time' })));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'location', ctx, { label: 'Lieu / destination', placeholder: 'Ex. Salle Pékin Turin, Massy' }), bindInput(it, 'address', ctx, { label: 'Adresse (facultatif)' })));
      box.appendChild(h('fieldset', {}, h('legend', {}, 'Inscriptions'),
        h('div', { class: 'cols' }, bindInput(it, 'regStart', ctx, { label: 'Ouverture des inscriptions', type: 'date' }), bindInput(it, 'regEnd', ctx, { label: 'Clôture des inscriptions', type: 'date', help: 'Sert au calcul « Dernière semaine » et au compteur J−x.' })),
        bindSelect(it, 'regStatus', C.model.REG_STATUS, ctx, { label: 'Statut des inscriptions' }),
        bindInput(it, 'regInfo', ctx, { label: 'Modalités d’inscription (facultatif)', rows: 2, placeholder: 'Ex. Inscription sur le portail CSE ou au local du CSE.' }),
        bindCheck(it, 'Forcer en « Dernière chance »', function () { return it.forceLast; }, function (v) { it.forceLast = v; if (v) it.excludeLast = false; }, ctx, 'Exception manuelle : la fiche apparaît en dernière chance même hors fenêtre de ' + p.settings.lastDays + ' jours (jamais si les inscriptions sont closes).', true),
        bindCheck(it, 'Ne jamais afficher en « Dernière chance »', function () { return it.excludeLast; }, function (v) { it.excludeLast = v; if (v) it.forceLast = false; }, ctx, null, true)));
    },
    contenu: function (box, it, p, ctx) {
      var isRules = it.type === 'rules';
      if (!isRules) box.appendChild(bindInput(it, 'summary', ctx, { label: it.type === 'info' ? 'Message principal (chapeau)' : 'Résumé (2 ou 3 phrases, mis en valeur)', rows: 3, max: 1200 }));
      box.appendChild(bindInput(it, 'description', ctx, { label: isRules ? 'Texte du règlement' : it.type === 'partner' ? 'Conditions et détails de l’offre' : 'Description détaillée', rows: isRules ? 16 : 6, max: 6000, help: isRules ? 'Titres : ligne commençant par « # ». ' + richHelp + ' Le texte se répartit automatiquement sur plusieurs diapositives si nécessaire.' : richHelp }));
      if (it.type === 'activity' || it.type === 'page') {
        box.appendChild(bindInput(it, 'highlights', ctx, { label: 'Temps forts (une ligne par élément)', rows: 4 }));
        box.appendChild(bindInput(it, 'program', ctx, { label: 'Programme (une étape par ligne, ex. « 14h00 - Accueil »)', rows: 4 }));
      }
      if (it.type === 'activity') {
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'transport', ctx, { label: 'Transport (facultatif)', rows: 2 }), bindInput(it, 'lodging', ctx, { label: 'Hébergement (facultatif)', rows: 2 })));
        box.appendChild(bindInput(it, 'conditions', ctx, { label: 'Pièces / conditions (facultatif)', rows: 2 }));
      }
      box.appendChild(bindInput(it, 'notes', ctx, { label: it.type === 'info' || isRules ? 'Encadré d’alerte (facultatif)' : 'Remarques / à noter (facultatif)', rows: 2 }));
    },
    visuels: function (box, it, p, ctx) {
      var list = h('div', { class: 'photos' });
      function draw() {
        ui.clear(list);
        it.photos.forEach(function (ref, i) {
          var src = C.renderHTML.resolve(ref);
          list.appendChild(h('div', { class: 'photo' }, src ? h('img', { src: src, alt: 'Photo ' + (i + 1) }) : h('div', { class: 'small muted', style: { padding: '8px' } }, 'Image indisponible'),
            i === 0 ? h('span', { class: 'badge' }, it.type === 'partner' ? 'Logo' : 'Principale') : null,
            h('div', { class: 'tools' },
              i > 0 ? h('button', { type: 'button', 'aria-label': 'Placer en premier', onclick: function () { it.photos.splice(i, 1); it.photos.unshift(ref); ctx.touch(); ctx.render(); draw(); } }, '★') : null,
              h('button', { type: 'button', 'aria-label': 'Retirer la photo ' + (i + 1), onclick: function () { it.photos.splice(i, 1); ctx.touch(); ctx.render(); draw(); } }, '✕'))));
        });
      }
      function addFiles(files) {
        files = files.filter(function (f) { return /^image\//.test(f.type); });
        if (!files.length) return;
        var room = 6 - it.photos.length;
        if (room <= 0) return ui.toast('6 images maximum par fiche.', 'error');
        Promise.all(files.slice(0, room).map(function (f) { return C.images.importFile(f, it.type === 'partner' && !it.photos.length ? { maxW: 1200, maxH: 1200 } : {}); }))
          .then(function (refs) { it.photos = it.photos.concat(refs); ctx.touch(); ctx.render(); draw(); ui.toast(refs.length + ' image(s) importée(s) et optimisée(s).', 'ok'); })
          .catch(function (e) { ui.toast(e.message, 'error'); });
      }
      var dz = h('div', { class: 'dropzone', tabindex: '0', role: 'button', 'aria-label': 'Ajouter des photos' }, it.type === 'partner' ? 'Glisser le logo puis un visuel, ou cliquer pour choisir (JPG, PNG, WEBP)' : 'Glisser des photos ici ou cliquer pour choisir (JPG, PNG, WEBP · 6 maximum)');
      dz.addEventListener('click', function () { ui.pickFile('image/png,image/jpeg,image/webp', true).then(addFiles); });
      dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dz.click(); } });
      dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', function () { dz.classList.remove('over'); });
      dz.addEventListener('drop', function (e) { e.preventDefault(); dz.classList.remove('over'); addFiles(Array.prototype.slice.call(e.dataTransfer.files || [])); });
      var url = h('input', { type: 'url', placeholder: 'https://… (image publique)' });
      var addUrl = h('button', { class: 'btn', type: 'button', onclick: function () {
        var u = url.value.trim();
        if (!C.compose.validUrl(u) || !u) return ui.toast('Adresse invalide.', 'error');
        C.images.importUrl(u).then(function (ref) { it.photos.push(ref); ctx.touch(); ctx.render(); draw(); ui.toast('Image récupérée et enregistrée localement.', 'ok'); url.value = ''; })
          .catch(function () { it.photos.push(u); ctx.touch(); ctx.render(); draw(); ui.toast('Le site source bloque la copie (CORS) : l’image est liée mais pourra manquer à l’export. Préférez l’import de fichier.', 'error'); });
      } }, 'Ajouter');
      box.appendChild(h('h3', {}, it.type === 'partner' ? 'Logo et visuels' : 'Photos'));
      box.appendChild(list); box.appendChild(dz);
      box.appendChild(h('div', { class: 'row', style: { marginTop: '10px' } }, h('div', { style: { flex: 1, minWidth: '200px' } }, ui.field('Ou importer depuis une adresse web', url)), addUrl));
      draw();
      box.appendChild(h('h3', { style: { marginTop: '8px' } }, 'Lien de destination'));
      box.appendChild(bindSelect(it, 'link', [{ id: 'portal', label: 'Portail CSE (par défaut)' }, { id: 'custom', label: 'Lien personnalisé' }, { id: 'none', label: 'Aucun lien' }], ctx, { label: 'Bouton de la diapositive', get: function () { return it.link.type; }, set: function (v) { it.link.type = v; }, redraw: true, help: 'Portail : ' + p.settings.portalUrl + ' (page d’accueil après connexion ; les liens directs vers une activité Kalidea ne sont pas garantis).' }));
      if (it.link.type === 'custom') box.appendChild(bindInput(it, 'link', ctx, { label: 'Adresse du lien personnalisé', type: 'url', get: function () { return it.link.url; }, set: function (v) { it.link.url = v.trim(); }, placeholder: 'https://…' }));
      if (it.link.type !== 'none') box.appendChild(bindInput(it, 'link', ctx, { label: 'Texte du bouton', max: 40, get: function () { return it.link.label; }, set: function (v) { it.link.label = v; } }));
    },
    tarifs: function (box, it, p, ctx) {
      if (!p.settings.pricingModule) { box.appendChild(h('div', { class: 'alert info' }, 'Le module « Tarifs CSE » est masqué dans les Paramètres : aucun tarif n’apparaît sur les diapositives.')); }
      var pr = it.pricing;
      box.appendChild(bindCheck(it, 'Afficher des tarifs sur cette fiche', function () { return pr.enabled; }, function (v) { pr.enabled = v; }, ctx, 'Désactivé : aucun bloc tarif, le texte récupère la place.', true));
      if (pr.enabled) {
        box.appendChild(bindSelect(it, 'pricing', C.pricing.MODES, ctx, { label: 'Mode de calcul', get: function () { return pr.mode; }, set: function (v) { pr.mode = v; }, redraw: true }));
        var cols = h('div', { class: 'cols' });
        if (pr.mode !== 'single' && pr.mode !== 'manual') cols.appendChild(bindInput(it, 'pricing', ctx, { label: 'Prix extérieur / public (€)', type: 'number', min: 0, step: 0.01, get: function () { return pr.outside; }, set: function (v) { pr.outside = v; }, after: function () { drawTable(); } }));
        if (pr.mode === 'manual' || pr.mode === 'fixed') cols.appendChild(bindInput(it, 'pricing', ctx, { label: 'Prix extérieur (facultatif, €)', type: 'number', min: 0, step: 0.01, get: function () { return pr.outside; }, set: function (v) { pr.outside = v; } }));
        if (pr.mode === 'subsidy' || pr.mode === 'participation') cols.appendChild(bindInput(it, 'pricing', ctx, { label: pr.mode === 'subsidy' ? 'Réduction commune (%)' : 'Participation salarié (%)', type: 'number', min: 0, maxv: 100, get: function () { return pr.percent; }, set: function (v) { pr.percent = v; }, after: function () { drawTable(); } }));
        if (pr.mode === 'fixed' || pr.mode === 'single') cols.appendChild(bindInput(it, 'pricing', ctx, { label: pr.mode === 'single' ? 'Tarif unique (€)' : 'Prix salarié fixe (€)', type: 'number', min: 0, step: 0.01, get: function () { return pr.fixed; }, set: function (v) { pr.fixed = v; }, after: function () { drawTable(); } }));
        box.appendChild(cols);
        var table = h('div');
        box.appendChild(table);
        var drawTable = function () {
          ui.clear(table);
          var res = C.pricing.fromPricing(pr, p.settings);
          if (pr.mode === 'tranches' || pr.mode === 'manual') {
            var t = h('table', { class: 'price-table' }, h('thead', {}, h('tr', {}, h('th', {}, 'Tranche'), h('th', {}, pr.mode === 'tranches' ? 'Subvention' : ''), h('th', {}, pr.mode === 'tranches' ? 'Prix calculé' : 'Prix saisi (€)'), h('th', {}, pr.mode === 'tranches' ? 'Forcer un prix (€)' : ''))));
            var tb = h('tbody');
            for (var i = 0; i < 10; i++) (function (i) {
              var row = res.rows.find(function (r) { return r.label === 'T' + (i + 1); });
              var inp = h('input', { type: 'number', min: 0, step: 0.01, 'aria-label': (pr.mode === 'tranches' ? 'Prix forcé T' : 'Prix T') + (i + 1) });
              if (pr.mode === 'tranches') { inp.value = pr.overrides[i] === undefined ? '' : pr.overrides[i]; inp.placeholder = '—'; inp.addEventListener('change', function () { if (inp.value === '') delete pr.overrides[i]; else pr.overrides[i] = inp.value; ctx.touch(); ctx.render(); drawTable(); }); }
              else { inp.value = pr.manual[i] || ''; inp.addEventListener('change', function () { pr.manual[i] = inp.value; ctx.touch(); ctx.render(); drawTable(); }); }
              tb.appendChild(h('tr', {}, h('td', {}, 'T' + (i + 1)), h('td', {}, pr.mode === 'tranches' ? (p.settings.rates[i] + ' %') : ''), pr.mode === 'tranches' ? h('td', { class: 'calc' }, row ? C.pricing.money(row.price) + (row.overridden ? ' (forcé)' : '') : '—') : h('td', {}, inp), pr.mode === 'tranches' ? h('td', {}, inp) : h('td')));
            })(i);
            t.appendChild(tb); table.appendChild(t);
            if (pr.mode === 'tranches') table.appendChild(h('p', { class: 'small muted' }, 'Barème et arrondi modifiables dans Paramètres → Tarifs CSE.'));
          } else if (res.rows[0]) table.appendChild(h('p', {}, h('b', {}, 'Résultat : '), res.rows[0].label + ' ' + C.pricing.money(res.rows[0].price)));
          res.issues.forEach(function (x) { table.appendChild(h('div', { class: 'alert ' + (x[0] === 'block' ? 'error' : 'warn') + ' small' }, x[1])); });
        };
        drawTable();
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'pricing', ctx, { label: 'Libellé (facultatif)', placeholder: 'Ex. Chambre double', get: function () { return pr.label; }, set: function (v) { pr.label = v; } }),
          bindInput(it, 'pricing', ctx, { label: 'Notes tarifs (facultatif)', placeholder: 'Ex. Supplément single : 350 €', get: function () { return pr.notes; }, set: function (v) { pr.notes = v; } })));
      }
      box.appendChild(h('fieldset', {}, h('legend', {}, 'Points (facultatif)'),
        h('div', { class: 'cols' }, bindInput(it, 'points', ctx, { label: 'Nombre de points', type: 'number', min: 0, step: 0.5, get: function () { return it.points.value; }, set: function (v) { it.points.value = v; } }),
          bindSelect(it, 'points', C.model.COUNTERS, ctx, { label: 'Compteur', get: function () { return it.points.counter; }, set: function (v) { it.points.counter = v; } })),
        h('small', { class: 'help' }, 'Le bloc « Points » n’apparaît que si un nombre est saisi.')));
    },
    pratique: function (box, it, p, ctx) {
      if (it.type === 'activity') {
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'minPart', ctx, { label: 'Participants minimum', type: 'number', min: 0 }), bindInput(it, 'maxPart', ctx, { label: 'Participants maximum', type: 'number', min: 0 })));
        box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'minAge', ctx, { label: 'Âge minimum', placeholder: 'Ex. 16 ou « À partir de 16 ans »' }), bindInput(it, 'audience', ctx, { label: 'Public éligible', placeholder: 'Ex. Salariés et ayants droit' })));
        box.appendChild(bindInput(it, 'carbon', ctx, { label: 'Bilan carbone (facultatif)', placeholder: 'Ex. 619 kg CO₂e (vol A/R)' }));
      }
      box.appendChild(h('h3', {}, 'Contacts / référents'));
      var list = h('div');
      function draw() {
        ui.clear(list);
        it.contacts.forEach(function (c, i) {
          var row = h('div', { class: 'contact-row' });
          ['name', 'email', 'phone', 'role'].forEach(function (k) {
            var inp = h('input', { type: k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text', value: c[k] || '', placeholder: { name: 'Nom', email: 'E-mail', phone: 'Téléphone', role: 'Fonction' }[k], 'aria-label': { name: 'Nom', email: 'E-mail', phone: 'Téléphone', role: 'Fonction' }[k] + ' du contact ' + (i + 1) });
            inp.addEventListener('input', function () { c[k] = inp.value; ctx.touch(); ctx.render(); });
            row.appendChild(inp);
          });
          row.appendChild(h('button', { class: 'btn small danger', type: 'button', 'aria-label': 'Retirer le contact ' + (i + 1), onclick: function () { it.contacts.splice(i, 1); ctx.touch(); ctx.render(); draw(); } }, '✕'));
          list.appendChild(row);
        });
        if (!it.contacts.length) list.appendChild(h('p', { class: 'small muted' }, 'Aucun contact : la ligne « Contact » n’apparaîtra pas.'));
      }
      draw();
      box.appendChild(list);
      var refs = p.settings.referents.filter(function (r) { return r.name || r.email; });
      var refSel = ui.selectEl([{ id: '', label: 'Ajouter un référent enregistré…' }].concat(refs.map(function (r, i) { return { id: String(i), label: [r.name, r.role].filter(Boolean).join(' · ') }; })), '');
      refSel.addEventListener('change', function () { var r = refs[Number(refSel.value)]; if (r) { it.contacts.push(Object.assign({}, r)); ctx.touch(); ctx.render(); draw(); } refSel.value = ''; });
      box.appendChild(h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: function () { it.contacts.push({ name: '', email: '', phone: '', role: '' }); draw(); } }, '+ Ajouter un contact'), refs.length ? refSel : h('a', { href: '#/parametres', class: 'small' }, 'Enregistrer des référents réutilisables')));
    },
    offre: function (box, it, p, ctx) {
      var pa = it.partner;
      box.appendChild(bindInput(it, 'partner', ctx, { label: 'Offre / avantage', rows: 2, get: function () { return pa.offer; }, set: function (v) { pa.offer = v; }, placeholder: 'Ex. Remise supplémentaire sur tout le catalogue' }));
      box.appendChild(h('div', { class: 'cols' },
        bindInput(it, 'partner', ctx, { label: 'Montant ou remise (pastille)', max: 40, get: function () { return pa.amount; }, set: function (v) { pa.amount = v; }, placeholder: 'Ex. −20 % ou 15 €' }),
        bindInput(it, 'partner', ctx, { label: 'Code promotionnel', max: 60, get: function () { return pa.code; }, set: function (v) { pa.code = v; } }),
        bindInput(it, 'partner', ctx, { label: 'Valable jusqu’au', type: 'date', get: function () { return pa.validUntil; }, set: function (v) { pa.validUntil = v; } })));
    },
    calendrier: function (box, it, p, ctx) {
      var cal = it.calendar;
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'calendar', ctx, { label: 'Mois affiché', type: 'month', get: function () { return cal.month; }, set: function (v) { cal.month = v; }, after: function () { ctx.redraw(); } }),
        bindInput(it, 'calendar', ctx, { label: 'Nom du service (pastille)', get: function () { return cal.service; }, set: function (v) { cal.service = v; }, placeholder: 'Permanences, Prêt de matériel…' })));
      box.appendChild(h('p', { class: 'small muted' }, 'Cliquez sur un jour (ici ou directement sur l’aperçu) pour faire défiler : vide → ' + cal.statuses.map(function (s) { return s.label || s.key; }).join(' → ') + ' → vide.'));
      var grid = h('div', { class: 'cal-editor', role: 'grid', 'aria-label': 'Jours du mois' });
      ['LUN', 'MAR', 'MER', 'JEU', 'VEN'].forEach(function (d) { grid.appendChild(h('div', { class: 'h' }, d)); });
      var month = cal.month || App.refDate().slice(0, 7);
      var first = month + '-01';
      var statusMap = {}; cal.statuses.forEach(function (s) { statusMap[s.key] = s; });
      for (var d = D.monday(first); d.slice(0, 7) <= month; d = D.addDays(d, 1)) {
        var wd = D.weekday(d);
        if (wd === 0 || wd === 6) continue;
        (function (day) {
          var inMonth = day.slice(0, 7) === month;
          var st = statusMap[cal.days[day]];
          var b = h('button', { type: 'button', class: inMonth ? '' : 'out', style: st ? { background: st.color } : {}, 'aria-label': D.fmtDay(day) + ' : ' + (st ? st.label : 'sans information') }, inMonth ? String(+day.slice(8)) : '');
          if (inMonth) b.addEventListener('click', function () {
            var keys = ['none'].concat(cal.statuses.map(function (s) { return s.key; }));
            var cur = cal.days[day] || 'none', next = keys[(keys.indexOf(cur) + 1) % keys.length];
            if (next === 'none') delete cal.days[day]; else cal.days[day] = next;
            ctx.touch(); ctx.render(); ctx.redraw();
          });
          grid.appendChild(b);
        })(d);
      }
      box.appendChild(grid);
      box.appendChild(h('h3', {}, 'Légende (couleurs et libellés)'));
      cal.statuses.forEach(function (s, i) {
        var col = h('input', { type: 'color', value: s.color, 'aria-label': 'Couleur ' + (i + 1) });
        col.addEventListener('change', function () { s.color = col.value.toUpperCase(); ctx.touch(); ctx.render(); ctx.redraw(); });
        var lab = h('input', { value: s.label, 'aria-label': 'Libellé ' + (i + 1) });
        lab.addEventListener('input', function () { s.label = lab.value; ctx.touch(); ctx.render(); });
        var rm = h('button', { class: 'btn small danger', type: 'button', disabled: cal.statuses.length <= 1, 'aria-label': 'Retirer cette légende', onclick: function () { cal.statuses.splice(i, 1); Object.keys(cal.days).forEach(function (k) { if (cal.days[k] === s.key) delete cal.days[k]; }); ctx.touch(); ctx.render(); ctx.redraw(); } }, '✕');
        box.appendChild(h('div', { class: 'legend-row' }, col, lab, rm));
      });
      if (cal.statuses.length < 6) box.appendChild(h('button', { class: 'btn small', type: 'button', onclick: function () { cal.statuses.push({ key: 'st' + Date.now().toString(36), label: 'Nouveau statut', color: '#7FB3FF' }); ctx.touch(); ctx.render(); ctx.redraw(); } }, '+ Ajouter un statut'));
      box.appendChild(bindInput(it, 'calendar', ctx, { label: 'Horaires / lieu (texte sous la légende)', rows: 2, get: function () { return cal.hours; }, set: function (v) { cal.hours = v; } }));
      box.appendChild(h('div', { class: 'cols' }, bindInput(it, 'calendar', ctx, { label: 'Lien du catalogue (facultatif)', type: 'url', get: function () { return cal.catalogUrl; }, set: function (v) { cal.catalogUrl = v.trim(); } }),
        bindInput(it, 'calendar', ctx, { label: 'Texte du lien', get: function () { return cal.catalogLabel; }, set: function (v) { cal.catalogLabel = v; } })));
      box.appendChild(bindInput(it, 'calendar', ctx, { label: 'Mention sous le calendrier (facultatif)', get: function () { return cal.note; }, set: function (v) { cal.note = v; }, placeholder: p.settings.mentions.calendar }));
    }
  };
})(window);
