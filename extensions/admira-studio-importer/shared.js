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
    const tags = String((data && data.tags) || '').trim().slice(0, 400);
    if (title) target.searchParams.set('importTitle', title);
    if (comment) target.searchParams.set('importComment', comment);
    if (tags) target.searchParams.set('importTags', tags);
    return target.toString();
  }

  global.AdmiraImporter = Object.freeze({ videoId, canonicalUrl, thumbnailUrl, handoffUrl });
})(globalThis);
