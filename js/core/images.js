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
  /** Images réellement utilisées par un projet. */
  function refsOf(project) {
    var set = {};
    // Les fiches de la corbeille gardent leurs images : une restauration après sauvegarde ne doit rien perdre.
    (project.items || []).concat((project.trash || []).map(function (t) { return t && t.item; }).filter(Boolean)).forEach(function (it) { (it.photos || []).forEach(function (p) { if (/^img:/.test(p)) set[p] = 1; }); });
    return Object.keys(set);
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
  /** Lit, redimensionne et compresse un fichier image local. */
  function importFile(file, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!file) return reject(Error('Aucun fichier.'));
      if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(Error('Formats acceptés : JPG, PNG, WEBP.'));
      if (file.size > 25 * 1024 * 1024) return reject(Error('Image trop lourde (25 Mo maximum).'));
      var fr = new FileReader();
      fr.onerror = function () { reject(Error('Fichier illisible.')); };
      fr.onload = function () {
        compress(fr.result, opts).then(put).then(resolve, reject);
      };
      fr.readAsDataURL(file);
    });
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
  /** Télécharge une image distante (si le site l'autorise : CORS) et la stocke localement. */
  function importUrl(u) {
    return fetch(u, { mode: 'cors' }).then(function (r) {
      if (!r.ok) throw Error('HTTP ' + r.status);
      return r.blob();
    }).then(function (blob) {
      if (!/^image\//.test(blob.type)) throw Error('Le lien ne pointe pas vers une image.');
      return new Promise(function (resolve, reject) { var fr = new FileReader(); fr.onload = function () { resolve(fr.result); }; fr.onerror = reject; fr.readAsDataURL(blob); });
    }).then(function (d) { return compress(d, {}); }).then(put);
  }
  return { init: init, put: put, putTemp: putTemp, url: url, has: has, remove: remove, refsOf: refsOf, exportMap: exportMap, importMap: importMap, usage: usage,
    importFile: importFile, importUrl: importUrl, compress: compress, hash: hash };
});
