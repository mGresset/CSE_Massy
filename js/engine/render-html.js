/* CSE Studio V9 · Rendu HTML d'une diapositive calculée par le moteur (même géométrie que le PPTX). */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.renderHTML = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  function resolve(src) {
    if (!src) return '';
    if (/^img:/.test(src)) return CSE.images ? CSE.images.url(src) : '';
    return src;
  }
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function box(e, it) {
    e.style.left = it.x + 'px'; e.style.top = it.y + 'px'; e.style.width = it.w + 'px'; e.style.height = it.h + 'px';
    if (it.rot) e.style.transform = 'rotate(' + it.rot + 'deg)';
  }
  /** Dessine la diapositive dans un conteneur (1200 × 675 px, à mettre à l'échelle par le parent). */
  function render(slide, container, opts) {
    opts = opts || {};
    var root = el('div', 'cse-slide');
    root.setAttribute('role', 'group'); // Les liens mailto et boutons restent accessibles au clavier et aux lecteurs d’écran.
    root.setAttribute('aria-label', opts.label || 'Diapositive');
    var texts = [];
    slide.items.forEach(function (it) {
      var e;
      if (it.t === 'rect' || it.t === 'ellipse') {
        e = el('div', 'cse-shape');
        if (it.fill) e.style.background = it.fill;
        if (it.stroke) e.style.border = (it.sw || 1) + 'px solid ' + it.stroke;
        e.style.borderRadius = it.t === 'ellipse' ? '50%' : (it.r ? Math.min(it.r, it.w / 2, it.h / 2) + 'px' : '0');
      } else if (it.t === 'path') {
        // Pictogramme vectoriel : même tracé que la forme libre PowerPoint.
        e = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        e.setAttribute('viewBox', '0 0 ' + (it.vb || 24) + ' ' + (it.vb || 24));
        e.setAttribute('preserveAspectRatio', 'none');
        e.setAttribute('aria-hidden', 'true');
        e.setAttribute('class', 'cse-path');
        var pth = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pth.setAttribute('d', CSE.icons ? CSE.icons.svgPath(it.d) : '');
        pth.setAttribute('fill', it.fill || '#000');
        e.appendChild(pth);
        e.style.position = 'absolute';
      } else if (it.t === 'image') {
        var src = resolve(it.src);
        if (src) {
          e = el('img', 'cse-img');
          e.alt = it.role === 'banner' ? 'Bandeau du CSE' : '';
          e.decoding = 'async';
          e.src = src;
          e.style.objectFit = it.fit === 'contain' ? 'contain' : it.fit === 'stretch' ? 'fill' : 'cover';
          e.onerror = function () { this.classList.add('cse-img-broken'); this.removeAttribute('src'); };
        } else {
          e = el('div', 'cse-img-missing');
          e.textContent = 'Image indisponible';
        }
      } else if (it.t === 'text') {
        e = el('div', 'cse-text' + (it.valign === 'middle' ? ' mid' : '') + (it.overflow ? ' cse-overflow' : ''));
        e.style.fontSize = it.size + 'px';
        e.style.lineHeight = it.lh;
        e.style.color = it.color;
        e.style.fontWeight = it.bold ? '700' : '400';
        e.style.textAlign = it.align || 'left';
        var inner = el('div', 'cse-text-inner');
        it.paras.forEach(function (p) {
          var pd = el('div', 'cse-p');
          if (p.align) pd.style.textAlign = p.align;
          var empty = !p.runs.some(function (r) { return String(r.text).trim().length; });
          // Séparation entre blocs : une demi-ligne, comme dans le PowerPoint (metrics.PARA_GAP).
          if (empty) { pd.className = 'cse-p cse-gap'; pd.style.height = ((it.lh || 1.2) * (CSE.metrics ? CSE.metrics.PARA_GAP : 1)) + 'em'; inner.appendChild(pd); return; }
          if (p.bullet) pd.appendChild(document.createTextNode('• '));
          p.runs.forEach(function (r) {
            var link = r.link || it.link;
            var s = el(link ? 'a' : 'span');
            s.textContent = r.text;
            if (r.bold !== undefined) s.style.fontWeight = r.bold || it.bold ? '700' : '400';
            if (r.color) s.style.color = r.color;
            if (link) {
              // Les liens proviennent du formulaire ou de sauvegardes JSON : ne jamais
              // accepter javascript:, data: ou un schéma inconnu dans l’aperçu.
              var mail = /^mailto:[^\s@<>'"]+@[^\s@<>'"]+\.[A-Za-z]{2,}$/i.test(link);
              var web = CSE.compose && CSE.compose.validUrl(link);
              if (mail || web) {
                s.href = link;
                if (mail) { s.className = 'cse-mail'; s.title = 'Écrire à ' + r.text; }
                else { s.target = '_blank'; s.rel = 'noopener noreferrer'; }
              }
            }
            pd.appendChild(s);
          });
          inner.appendChild(pd);
        });
        e.appendChild(inner);
        if (it.field) e.dataset.field = it.field;
        texts.push({ el: e, item: it });
      }
      if (!e) return;
      box(e, it);
      if (it.act) { e.dataset.act = JSON.stringify(it.act); e.classList.add('cse-act'); if (opts.interactive) { e.tabIndex = -1; } }
      root.appendChild(e);
    });
    if (opts.numberOverlay) {
      var badge = el('div', 'cse-num'); badge.textContent = opts.numberOverlay; root.appendChild(badge);
    }
    container.replaceChildren(root);
    if (opts.onAction) {
      root.addEventListener('click', function (ev) {
        var t = ev.target.closest('[data-act]');
        if (!t) return;
        ev.preventDefault();
        try { opts.onAction(JSON.parse(t.dataset.act)); } catch (e2) { /* ignoré */ }
      });
    }
    // Vérification de débordement réel dans le navigateur (garde-fou de la mesure).
    var domOverflow = [];
    if (opts.checkOverflow !== false && root.isConnected) {
      texts.forEach(function (t) {
        var inner = t.el.firstChild;
        if (inner && inner.scrollHeight > t.el.clientHeight + 3 && !t.item.overflow) { t.el.classList.add('cse-dom-overflow'); domOverflow.push(t.item.field || 'texte'); }
      });
    }
    return { root: root, domOverflow: domOverflow };
  }
  /** Ajuste l'échelle d'une diapositive à la largeur de son cadre. */
  function fit(frame) {
    var slide = frame.querySelector('.cse-slide');
    if (!slide) return;
    var w = frame.clientWidth;
    if (!w) return;
    slide.style.transform = 'scale(' + (w / 1200) + ')';
    frame.style.height = (675 * w / 1200) + 'px';
  }
  return { render: render, fit: fit, resolve: resolve };
});
