(function (root) {
  const aliases = {music:'musica', songs:'cancion', song:'cancion', canciones:'cancion', muscia:'musica', technology:'tecnologia', tech:'tecnologia'};
  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      .replace(/#/g,'').replace(/[^\p{L}\p{N}_:/.-]+/gu,' ').trim().split(/\s+/).map(t=>aliases[t] || t).join(' ');
  }
  function matches(item, query) {
    const text=String(query || '');
    const hay=normalize([item?.title,item?.prompt,item?.comment,...(Array.isArray(item?.tags)?item.tags:[])].filter(Boolean).join(' '));
    const number=String(item?.num ?? '').replace(/^0+(?=\d)/,'');
    // A numeric hashtag is the displayed Stock reference, not a free tag.
    // Bare numbers also retain exact numeric matches in user-authored text.
    return text.trim().split(/\s+/).filter(Boolean).every(part=>{
      const ref=/^(#?)(\d+)$/.exec(part);
      if(ref){
        const value=ref[2].replace(/^0+(?=\d)/,'');
        return number===value || (!ref[1] && hay.split(/\s+/).includes(normalize(part)));
      }
      return normalize(part).split(/\s+/).filter(Boolean).every(word=>hay.includes(word));
    });
  }
  root.AdmiraStockSearch={normalize,matches};
})(globalThis);
