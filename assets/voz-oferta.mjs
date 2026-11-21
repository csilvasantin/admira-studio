export const validStockId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
export function priceCents(raw) {
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(String(raw).trim());
  return match ? Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0')) : null;
}
export function offerLabel(offer, lang) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-IE' : 'es-ES', {style:'currency', currency:'EUR'}).format(offer.cents / 100);
}
export function narration(script, offer, lang) {
  if (!offer) return script.trim();
  const line = offer.name + ', ' + offerLabel(offer, lang) + '.';
  return [script.trim(), line].filter(Boolean).join(' ');
}
export function validOffer(o) {
  return o && typeof o.name === 'string' && o.name.trim().length > 0 && o.name.length <= 80 &&
    Number.isSafeInteger(o.cents) && o.cents >= 0 && o.cents <= 999999999 && validStockId(o.videoId) &&
    typeof o.videoTitle === 'string' && o.videoTitle.length <= 180 && typeof o.script === 'string' &&
    o.script.length <= 5000 && ['es','en'].includes(o.lang) && narration(o.script,o,o.lang).length <= 5000;
}
export function paintOffer(ctx, w, h, offer, lang) {
  if (!offer) return;
  const unit = Math.min(w,h), pad = unit * .035;
  ctx.save();
  ctx.fillStyle = 'rgba(7,16,14,.92)';
  const box = unit * .19;
  ctx.fillRect(pad, h-box-pad, w-2*pad, box);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.font = '500 ' + unit*.043 + 'px sans-serif';
  ctx.fillText(offer.name, 2*pad, h-box-pad+box*.28, w-4*pad);
  ctx.font = 'bold ' + unit*.083 + 'px sans-serif';
  ctx.fillText(offerLabel(offer,lang), 2*pad, h-box-pad+box*.70, w-4*pad);
  ctx.restore();
}
