/* CSE Studio V9.1 · Pictogrammes de catégorie vectoriels (grille 24 × 24).
 * Chaque pictogramme est une liste de formes pleines, sans trou ni chevauchement problématique :
 * même tracé en SVG dans l'aperçu et en forme libre (custGeom) dans PowerPoint — aucune police d'icônes,
 * aucun emoji, donc aucun changement de rendu selon la plateforme.
 * Commandes : ['M',x,y] ['L',x,y] ['Q',x1,y1,x,y] ['Z'] */
(function (root, factory) {
  'use strict';
  var mod = factory();
  root.CSE = root.CSE || {};
  root.CSE.icons = mod;
  if (typeof module === 'object' && module.exports) module.exports = mod;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  function circle(cx, cy, r) { return [['M', cx, cy - r], ['Q', cx + r, cy - r, cx + r, cy], ['Q', cx + r, cy + r, cx, cy + r], ['Q', cx - r, cy + r, cx - r, cy], ['Q', cx - r, cy - r, cx, cy - r], ['Z']]; }
  function rect(x, y, w, h) { return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']]; }
  function poly(pts) { var out = [['M', pts[0], pts[1]]]; for (var i = 2; i < pts.length; i += 2) out.push(['L', pts[i], pts[i + 1]]); out.push(['Z']); return out; }
  var ICONS = {
    info: { label: 'Information', paths: [circle(12, 6.3, 2.4), rect(10, 10.5, 4, 10)] },
    plane: { label: 'Avion (voyages)', paths: [[['M', 12, 2], ['Q', 13.2, 2, 13.2, 4], ['L', 13.2, 9], ['L', 21, 13.5], ['L', 21, 15.5], ['L', 13.2, 13], ['L', 13.2, 18], ['L', 15.5, 19.8], ['L', 15.5, 21.5], ['L', 12, 20.5], ['L', 8.5, 21.5], ['L', 8.5, 19.8], ['L', 10.8, 18], ['L', 10.8, 13], ['L', 3, 15.5], ['L', 3, 13.5], ['L', 10.8, 9], ['L', 10.8, 4], ['Q', 10.8, 2, 12, 2], ['Z']]] },
    bag: { label: 'Valise (week-ends)', paths: [rect(3, 8.2, 18, 12), poly([8.5, 4, 15.5, 4, 15.5, 8.2, 14, 8.2, 14, 5.6, 10, 5.6, 10, 8.2, 8.5, 8.2])] },
    confetti: { label: 'Confettis (animations)', paths: [poly([3, 21, 8.6, 9.4, 14.6, 15.4]), rect(14, 3, 2.2, 2.2), rect(19, 7.5, 2.2, 2.2), rect(17.5, 13, 2.2, 2.2), poly([11, 3.6, 12.6, 5.2, 11, 6.8, 9.4, 5.2]), poly([20, 2.5, 21.4, 3.9, 20, 5.3, 18.6, 3.9])] },
    glass: { label: 'Verre (œnologie)', paths: [[['M', 7, 3], ['L', 17, 3], ['Q', 17, 11, 12.9, 12.3], ['L', 12.9, 17.8], ['L', 16, 19.4], ['L', 16, 21], ['L', 8, 21], ['L', 8, 19.4], ['L', 11.1, 17.8], ['L', 11.1, 12.3], ['Q', 7, 11, 7, 3], ['Z']]] },
    mountain: { label: 'Montagne (randonnées)', paths: [poly([2, 20.5, 9, 8, 13, 14, 15.6, 10.4, 22, 20.5]), circle(18.2, 5, 2)] },
    notes: { label: 'Notes (musique)', paths: [poly([9.2, 4.2, 20, 2, 20, 4.8, 9.2, 7]), rect(9.2, 7, 1.5, 9), rect(18.5, 4.8, 1.5, 9), circle(7.6, 17.6, 2.6), circle(16.9, 15.6, 2.6)] },
    needle: { label: 'Aiguille (couture)', paths: [[['M', 18.6, 2.6], ['Q', 21.4, 2.6, 21.4, 5.4], ['L', 7.2, 19.6], ['L', 3.8, 20.6], ['L', 4.8, 17.2], ['Z']], [['M', 5.6, 15.2], ['Q', 2, 10.6, 5.4, 6.4], ['Q', 7.8, 3.8, 11.2, 5.8], ['L', 10.5, 6.7], ['Q', 8.1, 5.3, 6.6, 7.1], ['Q', 3.9, 10.4, 6.6, 14.4], ['Z']]] },
    pencil: { label: 'Crayon (dessin)', paths: [poly([15.4, 3.4, 20.6, 8.6, 8.8, 20.4, 3.6, 20.4, 3.6, 15.2]), poly([17.6, 1.6, 22.4, 6.4, 21.3, 7.5, 16.5, 2.7])] },
    trophy: { label: 'Trophée (sport)', paths: [[['M', 7, 3], ['L', 17, 3], ['L', 17, 8], ['Q', 17, 13, 12, 13.6], ['Q', 7, 13, 7, 8], ['Z']], rect(11, 13.6, 2, 3.6), rect(8, 17.2, 8, 3), [['M', 3.8, 5], ['L', 7, 5], ['L', 7, 7], ['L', 5.7, 7], ['Q', 5.8, 9.4, 7.4, 10.4], ['L', 6.8, 11.6], ['Q', 3.8, 10.3, 3.8, 7], ['Z']], [['M', 20.2, 5], ['L', 17, 5], ['L', 17, 7], ['L', 18.3, 7], ['Q', 18.2, 9.4, 16.6, 10.4], ['L', 17.2, 11.6], ['Q', 20.2, 10.3, 20.2, 7], ['Z']]] },
    bee: { label: 'Abeille (La Ruche)', paths: [[['M', 12, 8.2], ['Q', 16.6, 8.2, 16.6, 14.2], ['Q', 16.6, 20.2, 12, 21.4], ['Q', 7.4, 20.2, 7.4, 14.2], ['Q', 7.4, 8.2, 12, 8.2], ['Z']], circle(12, 5.2, 2.3), [['M', 7.4, 10.2], ['Q', 1.8, 7.2, 2.8, 12], ['Q', 3.8, 14.6, 7.3, 12.6], ['Z']], [['M', 16.6, 10.2], ['Q', 22.2, 7.2, 21.2, 12], ['Q', 20.2, 14.6, 16.7, 12.6], ['Z']]] },
    flag: { label: 'Drapeau à damier (sports mécaniques)', paths: [rect(3.6, 2, 2, 20), rect(5.6, 3, 3.6, 3.4), rect(12.8, 3, 3.6, 3.4), rect(9.2, 6.4, 3.6, 3.4), rect(16.4, 6.4, 3.6, 3.4), rect(5.6, 9.8, 3.6, 3.4), rect(12.8, 9.8, 3.6, 3.4)] },
    paraglider: { label: 'Voile (parapente)', paths: [[['M', 2, 9.2], ['Q', 12, 0.8, 22, 9.2], ['L', 20.5, 10.6], ['Q', 12, 4.2, 3.5, 10.6], ['Z']], poly([3.6, 10.4, 4.5, 9.9, 12.4, 18.6, 11.6, 19.2]), poly([20.4, 10.4, 19.5, 9.9, 11.6, 18.6, 12.4, 19.2]), circle(12, 20, 1.9)] },
    museum: { label: 'Musée (sorties culturelles)', paths: [poly([2, 8, 12, 2.6, 22, 8]), rect(3, 9, 18, 1.6), rect(4.4, 11.6, 2.1, 6.4), rect(8.8, 11.6, 2.1, 6.4), rect(13.1, 11.6, 2.1, 6.4), rect(17.5, 11.6, 2.1, 6.4), rect(2.4, 19, 19.2, 2.2)] },
    calendar: { label: 'Calendrier (permanences)', paths: [rect(3, 4.6, 18, 4), rect(7, 2.4, 1.6, 3.6), rect(15.4, 2.4, 1.6, 3.6), rect(3.4, 10.4, 4.6, 4.2), rect(9.7, 10.4, 4.6, 4.2), rect(16, 10.4, 4.6, 4.2), rect(3.4, 16.2, 4.6, 4.2), rect(9.7, 16.2, 4.6, 4.2), rect(16, 16.2, 4.6, 4.2)] },
    ticket: { label: 'Billet', paths: [[['M', 2.5, 7], ['L', 21.5, 7], ['L', 21.5, 10], ['Q', 19.5, 10.2, 19.5, 12], ['Q', 19.5, 13.8, 21.5, 14], ['L', 21.5, 17], ['L', 2.5, 17], ['L', 2.5, 14], ['Q', 4.5, 13.8, 4.5, 12], ['Q', 4.5, 10.2, 2.5, 10], ['Z']]] },
    star: { label: 'Étoile (générique)', paths: [poly([12, 2.5, 14.6, 8.6, 21.2, 9.2, 16.2, 13.6, 17.7, 20.1, 12, 16.7, 6.3, 20.1, 7.8, 13.6, 2.8, 9.2, 9.4, 8.6])] }
  };
  /** Normalise un nom : minuscules, sans accents, sans « s » final ni article. */
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
      .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(function (w) { return w.length > 3 ? w.replace(/(s|x)$/, '') : w; }).join(' ');
  }
  var RULES = [
    [/^(les? |la )?information/, 'info'], [/voyage|sejour|avion/, 'plane'], [/week ?end|escapade/, 'bag'],
    [/animation|fete|soiree/, 'confetti'], [/oenologie|vin|degustation/, 'glass'], [/randonnee|marche|montagne/, 'mountain'],
    [/musique|concert|chorale/, 'notes'], [/couture|tricot/, 'needle'], [/dessin|peinture|art/, 'pencil'],
    [/sport(?! mecanique)|foot|tennis|course/, 'trophy'], [/ruche|abeille/, 'bee'], [/sport mecanique|karting|auto|moto/, 'flag'],
    [/parapente|vol libre/, 'paraglider'], [/sortie culturelle|culture|musee|visite|spectacle|theatre/, 'museum'],
    [/permanence|calendrier|pret|materiel/, 'calendar'], [/billet|cinema/, 'ticket']
  ];
  /** Pictogramme d'une catégorie : choix personnalisé, sinon correspondance par défaut, sinon générique. */
  function iconFor(category) {
    if (!category) return 'star';
    if (category.icon && ICONS[category.icon]) return category.icon;
    var n = norm(category.name);
    for (var i = 0; i < RULES.length; i++) if (RULES[i][0].test(n)) return RULES[i][1];
    return 'star';
  }
  function svgPath(cmds) {
    return cmds.map(function (c) { return c[0] === 'Z' ? 'Z' : c[0] + c.slice(1).join(' '); }).join(' ');
  }
  return { ICONS: ICONS, iconFor: iconFor, norm: norm, svgPath: svgPath, keys: Object.keys(ICONS) };
});
