(function initAdmiraImporter(global) {
  'use strict';

  const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
  ]);

  function videoId(rawUrl) {
    try {
      const url = new URL(String(rawUrl || ''));
      if (!YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return '';
      let id = '';
      if (url.hostname.toLowerCase() === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] || '';
      else if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
      else {
        const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/);
        id = match ? match[1] : '';
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : '';
    } catch {
      return '';
    }
  }

  function canonicalUrl(rawUrl) {
    const id = videoId(rawUrl);
    return id ? `https://www.youtube.com/watch?v=${id}` : '';
  }

  function thumbnailUrl(rawUrl) {
    const id = videoId(rawUrl);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }

  // Stock accepts ten tags. Keep the requested action ahead of optional labels,
  // and reject overflow rather than silently losing a client or the subtitle request.
  function tagsForImport(data) {
    const raw = String((data && data.tags) || '').trim().slice(0, 400);
    if (!data || data.format === 'audio') return raw;
    const language = data.subtitleLanguage, targetFormat = data.targetFormat;
    if (language && !['none', 'es', 'en'].includes(language)) throw new Error('Selecciona un idioma de subtítulos válido.');
    if (targetFormat && !['original', 'vertical', 'horizontal', 'both'].includes(targetFormat)) throw new Error('Selecciona un formato válido.');
    if (!language && !targetFormat) return raw;
    const text = raw.replace(/[\n;]+/g, ',');
    const parts = (text.includes(',') ? text.split(',') : text.split(/\s+/)).flatMap(p => p.split('#'));
    const formatTags = {original: 'formato-original', vertical: 'adaptar-vertical', horizontal: 'adaptar-horizontal', both: 'adaptar-ambos'};
    const tags = [language === 'es' || language === 'en' || ['vertical', 'horizontal', 'both'].includes(targetFormat) ? 'capsula' : null,
      language === 'es' ? 'subtitulos-es' : language === 'en' ? 'subtitles-en' : language === 'none' ? 'sin-subtitulos' : null,
      formatTags[targetFormat]].filter(Boolean);
    const key = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const superseded = [...(language ? ['subtitulos-es', 'subtitular-es', 'subtitles-en', 'subtitle-en', 'sin-subtitulos'] : []),
      ...(targetFormat ? Object.values(formatTags) : [])];
    for (const part of parts) {
      const tag = part.trim().replace(/^[#·.\s]+|[#·.\s]+$/g, '').slice(0, 80);
      if (tag && !superseded.includes(key(tag)) && !tags.some(t => key(t) === key(tag))) tags.push(tag);
    }
    const result = tags.join(', ');
    if (tags.length > 10 || result.length > 400) {
      throw new Error('Deja espacio para las opciones de subtítulos y formato: máximo 10 etiquetas y 400 caracteres en total. No se ha descartado ninguna etiqueta de cliente.');
    }
    return result;
  }

  function handoffUrl(data) {
    const sourceUrl = canonicalUrl(data && data.url);
    if (!sourceUrl) return '';
    const target = new URL('https://www.admira.studio/stock.html');
    target.searchParams.set('importSource', 'chrome');
    target.searchParams.set('importUrl', sourceUrl);
    target.searchParams.set('importFormat', data && data.format === 'audio' ? 'audio' : 'video');
    target.searchParams.set('importAutostart', data && data.autostart === false ? '0' : '1');
    const title = String((data && data.title) || '').trim().slice(0, 180);
    const comment = String((data && data.comment) || '').trim().slice(0, 500);
    const tags = tagsForImport(data);
    if (title) target.searchParams.set('importTitle', title);
    if (comment) target.searchParams.set('importComment', comment);
    if (tags) target.searchParams.set('importTags', tags);
    return target.toString();
  }

  global.AdmiraImporter = Object.freeze({ videoId, canonicalUrl, thumbnailUrl, tagsForImport, handoffUrl });
})(globalThis);
