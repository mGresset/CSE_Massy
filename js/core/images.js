/* CSE Studio V9 · Stockage des images (IndexedDB), hors du localStorage limité à ~5 Mo.
 * Les fiches référencent les images par « img:<empreinte> ». Les images importées sont
 * redimensionnées et compressées dans le navigateur ; les sauvegardes JSON les embarquent. */
(function (root, factory) {
  'use strict';
  var mod = factory(root.CSE || {});
  root.CSE = root.CSE || {};
  root.CSE.images = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function (CSE) {
  'use strict';
  var DB = 'cse-studio-massy-images', STORE = 'images';
  var mem = {}, db = null, ready = null, persistent = false;

  function hash(s) {
    var h1 = 0x811c9dc5, h2 = 0x1505;
    for (var i = 0; i < s.length; i += 7) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (h2 * 33 + c) | 0; }
    return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + s.length.toString(36);
  }
  function open() {
    return new Promise(function (resolve) {
      if (typeof indexedDB === 'undefined') return resolve(null);
      try {
        var req = indexedDB.open(DB, 1);
        req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { resolve(null); };
        req.onblocked = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }
  /** Charge toutes les images en mémoire (appelé une fois au démarrage). */
  function init() {
    if (ready) return ready;
    // Garde-fou : si IndexedDB ne répond pas (navigation privée, politique d'entreprise…), on continue sans persistance.
    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 2500); });
    ready = Promise.race([open(), timeout]).then(function (d) {
      db = d; persistent = !!d;
      if (!d) return;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(STORE, 'readonly'), st = tx.objectStore(STORE), req = st.openCursor();
          req.onsuccess = function () { var c = req.result; if (c) { mem[c.key] = c.value; c.continue(); } else resolve(); };
          req.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      });
    });
    return ready;
  }
  function write(id, data) {
    if (!db) return Promise.resolve(false);
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(data, id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { resolve(false); };
        tx.onabort = function () { resolve(false); };
      } catch (e) { resolve(false); }
    });
  }
  /** Enregistre une image (data URL) et renvoie sa référence « img:… ». */
  function put(dataUrl) {
    if (!/^data:image\/(png|jpeg|webp|gif);base64,/i.test(dataUrl || '')) return Promise.reject(Error('Format d’image non pris en charge.'));
    var id = 'img:' + hash(dataUrl);
    if (mem[id]) return Promise.resolve(id);
    mem[id] = dataUrl;
    return write(id, dataUrl).then(function () { return id; });
  }
  /** Image temporaire (mémoire uniquement) : aperçus de démonstration, galerie de modèles. */
  function putTemp(id, dataUrl) { if (!mem[id]) mem[id] = dataUrl; return id; }
  function url(ref) { return ref && mem[ref] ? mem[ref] : ''; }
  function has(ref) { return !!mem[ref]; }
  function remove(ref) {
    delete mem[ref];
    if (!db) return Promise.resolve();
    return new Promise(function (resolve) { try { var tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(ref); tx.oncomplete = resolve; tx.onerror = resolve; } catch (e) { resolve(); } });
  }
  /** Images réellement utilisées par un projet : fiches, corbeille, personnalisations de pages
   *  et instantanés des MEL publiés (un MEL figé doit rester exportable avec ses photos). */
  function refsOf(project) {
    var set = {};
    function addItem(it) { if (!it) return; (it.photos || []).forEach(function (p) { if (/^img:/.test(p)) set[p] = 1; }); }
    (project.items || []).forEach(addItem);
    (project.trash || []).forEach(function (t) { addItem(t && t.item); });
    (project.issues || []).forEach(function (is) {
      (is.pages || []).forEach(function (pg) { var ov = pg.opts && pg.opts.override; if (ov && Array.isArray(ov.photos)) addItem({ photos: ov.photos }); });
      [is.snapshot].concat(is.previousSnapshots || []).forEach(function (sn) {
        if (!sn) return;
        (sn.items || []).forEach(addItem);
        (sn.pages || []).forEach(function (pg) { var ov = pg.opts && pg.opts.override; if (ov && Array.isArray(ov.photos)) addItem({ photos: ov.photos }); });
      });
    });
    return Object.keys(set);
  }
  /** État d'une image référencée : 'ready' (octets disponibles localement, intégrable au PowerPoint),
   *  'remote' (simple lien Web non importé : CORS possible, non intégrable) ou 'missing'. */
  function status(ref) {
    ref = String(ref || '');
    if (!ref) return 'missing';
    if (/^img:/.test(ref)) return mem[ref] ? 'ready' : 'missing';
    if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(ref)) return 'ready';
    if (/^assets\//.test(ref)) return 'ready';
    if (/^https?:\/\//i.test(ref)) return 'remote';
    return 'missing';
  }
  /** Supprime les images orphelines (jamais celles d'un MEL publié, de la corbeille ou d'une personnalisation). */
  function gc(project) {
    var keep = {};
    refsOf(project).forEach(function (r) { keep[r] = 1; });
    var removed = Object.keys(mem).filter(function (k) { return /^img:/.test(k) && !/^img:demo-/.test(k) && !keep[k]; });
    return Promise.all(removed.map(remove)).then(function () { return removed.length; });
  }
  /** Signature binaire réelle (ne pas se fier à l'extension ni au type annoncé). */
  function sniff(bytes) {
    var b = bytes;
    if (b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
    if (b.length >= 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
    if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    return '';
  }
  function err(code, msg) { var e = Error(msg); e.code = code; return e; }
  /** Lit un Blob/File, vérifie son contenu réel, puis le redimensionne et le stocke localement. */
  function importBlob(blob, opts) {
    if (!blob) return Promise.reject(err('empty', 'Aucun fichier.'));
    if (blob.size > 25 * 1024 * 1024) return Promise.reject(err('size', 'Image trop lourde (25 Mo maximum).'));
    var head = blob.slice ? blob.slice(0, 16) : blob;
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(err('read', 'Fichier illisible.')); };
      fr.onload = function () { resolve(new Uint8Array(fr.result)); };
      fr.readAsArrayBuffer(head);
    }).then(function (bytes) {
      var type = sniff(bytes);
      if (!type) throw err('notimage', 'Ce fichier n’est pas une image JPG, PNG, WEBP ou GIF (contenu vérifié).');
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onerror = function () { reject(err('read', 'Fichier illisible.')); };
        fr.onload = function () { resolve(String(fr.result).replace(/^data:[^;]*;/, 'data:' + type + ';')); };
        fr.readAsDataURL(blob);
      });
    }).then(function (d) { return compress(d, opts || {}); }).then(put);
  }
  /** Teste si une adresse s'affiche comme image (sans pouvoir lire ses octets) : distingue CORS et lien cassé. */
  function probe(u) {
    return new Promise(function (resolve) {
      if (typeof Image === 'undefined') return resolve(false);
      var img = new Image(), done = false;
      var end = function (v) { if (done) return; done = true; resolve(v); };
      img.onload = function () { end(img.naturalWidth > 0); };
      img.onerror = function () { end(false); };
      setTimeout(function () { end(false); }, 8000);
      img.src = u;
    });
  }
  function exportMap(refs) { var o = {}; refs.forEach(function (r) { if (mem[r]) o[r] = mem[r]; }); return o; }
  /** Restaure des images issues d'une sauvegarde. Renvoie le nombre importé. */
  function importMap(map) {
    var keys = Object.keys(map || {});
    return Promise.all(keys.map(function (k) {
      var v = map[k];
      if (!/^img:/.test(k) || !/^data:image\//.test(v || '')) return 0;
      mem[k] = v;
      return write(k, v).then(function () { return 1; });
    })).then(function (r) { return r.reduce(function (a, b) { return a + b; }, 0); });
  }
  function usage() {
    var n = 0, bytes = 0;
    Object.keys(mem).forEach(function (k) { n++; bytes += mem[k].length * 0.75; });
    return { count: n, bytes: bytes, persistent: persistent };
  }
  /** Lit, vérifie, redimensionne et compresse un fichier image local (import, collage, glisser-déposer). */
  function importFile(file, opts) {
    if (!file) return Promise.reject(err('empty', 'Aucun fichier.'));
    if (file.type && !/^image\//.test(file.type)) return Promise.reject(err('notimage', 'Formats acceptés : JPG, PNG, WEBP.'));
    return importBlob(file, opts);
  }
  function compress(dataUrl, opts) {
    opts = opts || {};
    var maxW = opts.maxW || 1800, maxH = opts.maxH || 1400;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var sc = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * sc)); c.height = Math.max(1, Math.round(img.naturalHeight * sc));
          var ctx = c.getContext('2d');
          var keepAlpha = /^data:image\/(png|webp|gif)/.test(dataUrl) && hasAlpha(img);
          if (!keepAlpha) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var out = keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', opts.quality || 0.84);
          resolve(out.length < dataUrl.length || sc < 1 || !/^data:image\/(jpeg|png)/.test(dataUrl) ? out : dataUrl);
        } catch (e) { reject(Error('Image impossible à traiter (' + e.message + ').')); }
      };
      img.onerror = function () { reject(Error('Image impossible à décoder.')); };
      img.src = dataUrl;
    });
  }
  function hasAlpha(img) {
    try {
      var c = document.createElement('canvas'), w = Math.min(64, img.naturalWidth), h = Math.min(64, img.naturalHeight);
      c.width = w; c.height = h;
      var ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      var d = ctx.getImageData(0, 0, w, h).data;
      for (var i = 3; i < d.length; i += 4) if (d[i] < 250) return true;
    } catch (e) { /* ignoré */ }
    return false;
  }
  /** Télécharge une image distante SI le site l'autorise (CORS), vérifie qu'il s'agit bien d'une image
   *  et la stocke localement (elle devient « prête » pour le PowerPoint). Sinon, erreur explicite :
   *  code 'cors' (image visible mais récupération interdite), 'http' (404…), 'html' (page Web),
   *  'notimage', 'unreachable'. Aucun proxy tiers n'est utilisé. */
  function importUrl(u) {
    if (!/^https?:\/\//i.test(String(u || ''))) return Promise.reject(err('url', 'Adresse invalide : elle doit commencer par https://'));
    return fetch(u, { mode: 'cors', credentials: 'omit', redirect: 'follow' }).then(function (r) {
      if (!r.ok) throw err('http', 'Le site répond « ' + r.status + ' » : image introuvable ou accès refusé.');
      var ct = String(r.headers.get('content-type') || '');
      if (/text\/html/i.test(ct)) throw err('html', 'Cette adresse mène à une page Web, pas à un fichier image. Ouvrez la page puis copiez l’image elle-même (clic droit → Copier l’image).');
      return r.blob();
    }, function () {
      return probe(u).then(function (visible) {
        throw visible
          ? err('cors', 'Le site affiche cette image mais interdit sa récupération par CSE Studio (règle CORS du site). Elle ne pourrait pas figurer dans le PowerPoint.')
          : err('unreachable', 'Adresse injoignable, ou ce n’est pas une image accessible.');
      });
    }).then(function (blob) { return importBlob(blob, {}); });
  }
  return { init: init, put: put, putTemp: putTemp, url: url, has: has, remove: remove, refsOf: refsOf, exportMap: exportMap, importMap: importMap, usage: usage,
    importFile: importFile, importBlob: importBlob, importUrl: importUrl, compress: compress, hash: hash, status: status, gc: gc, sniff: sniff, probe: probe };
});
