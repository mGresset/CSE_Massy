/* Reconstruit les tarifs à partir de deux objets graphiques distincts :
   libellé Tn aligné à gauche et montant aligné à droite. Cette séparation permet
   d'aligner les € sans perdre la fidélité HTML/PPTX. */
'use strict';
function tiers(slide, metrics) {
  const nodes = slide.items.filter(x => x.t === 'text' && x.field === 'tarifs');
  const plain = x => metrics.plain(x.paras).trim();
  const labels = nodes.filter(x => /^T(?:10|[1-9])$/.test(plain(x)));
  const prices = nodes.filter(x => /€$/.test(plain(x)) && !/^Extérieur\s*:/.test(plain(x)));
  return labels.map(l => {
    const sameRow = prices.filter(x => Math.abs(x.y - l.y) < 0.5 && x.x >= l.x - 1)
      .sort((a,b) => a.x - b.x);
    const amount = sameRow[0] || null;
    return { label: plain(l), labelNode:l, amount:amount ? plain(amount) : '', amountNode:amount,
      x:l.x, y:l.y, text:plain(l) + ' ' + (amount ? plain(amount) : '') };
  }).sort((a,b) => Number(a.label.slice(1)) - Number(b.label.slice(1)));
}
module.exports = { tiers };
