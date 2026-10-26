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
    if (!data || data.subtitleLanguage !== 'es' || data.format === 'audio') return raw;
    const text = raw.replace(/[\n;]+/g, ',');
    const parts = (text.includes(',') ? text.split(',') : text.split(/\s+/)).flatMap(p => p.split('#'));
    const tags = ['capsula', 'subtitulos-es'];
    const key = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const part of parts) {
      const tag = part.trim().replace(/^[#·.\s]+|[#·.\s]+$/g, '').slice(0, 80);
      if (tag && !tags.some(t => key(t) === key(tag))) tags.push(tag);
    }
    const result = tags.join(', ');
    if (tags.length > 10 || result.length > 400) {
      throw new Error('Para la cápsula subtitulada, deja espacio para las etiquetas cápsula y subtitulos-es (máximo 10 etiquetas y 400 caracteres en total).');
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
