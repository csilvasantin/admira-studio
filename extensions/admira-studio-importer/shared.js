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

  const STOP_WORDS = new Set(('a al algo all an and are as at by como con del de el en es esta este for from ha has how in into is it la las lo los me mi my no of on or para per por que se si so su the this to tu un una video videos watch what with y you your youtube shorts official oficial ft feat suscribe subscribe canal channel link links http https www').split(' '));

  function tagWords(text) {
    return (String(text || '').replace(/https?:\/\/\S+/gi, ' ').normalize('NFC')
      .toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
      .filter(word => (word.length >= 3 || /^(ia|ai|xr|vr|ar|tv|3d|2d|f1)$/.test(word))
        && !STOP_WORDS.has(word) && (!/^\d+$/.test(word) || /^(19|20)\d{2}$/.test(word)));
  }

  function suggestTags(context, searchQuery = '') {
    if (!videoId(context?.url)) return [];
    const tags = new Set();
    const fold = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const add = phrase => {
      const tag = fold(phrase).replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
      if (tag && tag.length <= 64 && tags.size < 5) tags.add(tag);
    };
    const rawTitle = String(context.title || '').slice(0, 180).replace(/^\(\d+\)\s*/, '');
    const title = rawTitle.replace(/\s*(?:\[[^\]]+\]|\((?:video|audio|oficial|official|live|tve|hd|4k|remaster)[^)]*\))\s*$/gi, '').trim();
    const channel = String(context.channel || '').slice(0, 100).replace(/\s*-\s*Topic$/i, '').trim();
    const description = String(context.description || '').slice(0, 1500);
    const metadata = fold(`${rawTitle}\n${description}`);
    const year = metadata.match(/(?:released on:|lanzamiento:|℗)\s*((?:19|20)\d{2})\b/)?.[1]
      || fold(rawTitle).match(/\b(?:19|20)\d{2}\b/)?.[0]
      || metadata.match(/\bemision\s+(?:del?\s+)?\d{1,2}[-/.]\d{1,2}[-/.]((?:19|20)\d{2})\b/)?.[1];
    const music = /\b(?:musica|music|cancion|videoclip|album|vevo)\b|℗/.test(metadata);
    if (music) add('musica');
    if (year) add(year);
    if (/\b(?:en|idioma) (?:castellano|espanol)\b/.test(metadata)) add('castellano');

    const quoted = title.match(/^(.+?)\s+["“]([^"”]+)["”]$/);
    const parts = quoted ? quoted.slice(1) : title.split(/\s+[-–—·]\s+/);
    for (const phrase of parts.slice(0, 2)) {
      if (tagWords(fold(phrase)).length && phrase.trim().split(/\s+/).length <= 8) add(phrase);
    }
    if (tagWords(fold(channel)).length && channel.trim().split(/\s+/).length <= 6) add(channel);
    const searchTag = fold(searchQuery).replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 64).replace(/^-|-$/g, '');
    if (searchTag) tags.add(searchTag);
    return [...tags];
  }

  function suggestedFormat(context) {
    const width = Number(context?.width), height = Number(context?.height);
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return 'original';
    if (width === height) return 'original';
    return width > height ? 'vertical' : 'horizontal';
  }

  // Stock accepts ten tags. Keep the requested action ahead of optional labels,
  // and reject overflow rather than silently losing a client or the subtitle request.
  function tagsForImport(data) {
    const raw = String((data && data.tags) || '').trim().slice(0, 400);
    if (!data) return raw;
    const scoped = data.projectId !== undefined;
    const projectId = data.projectId || '';
    if (projectId && !/^[a-z0-9][a-z0-9-]{0,70}$/.test(projectId)) throw new Error('Proyecto no válido.');
    const language = data.format === 'audio' ? '' : data.subtitleLanguage;
    const customFormat = data.targetFormat === 'all' && !!data.projectId || /^(project|layout):[a-z0-9][a-z0-9:-]{0,79}$/.test(data.targetFormat || '');
    const targetFormat = data.format === 'audio' ? '' : customFormat ? 'original' : data.targetFormat === 'all' ? 'both' : data.targetFormat;
    if (language && !['none', 'es', 'en'].includes(language)) throw new Error('Selecciona un idioma de subtítulos válido.');
    if (targetFormat && !['original', 'vertical', 'horizontal', 'both'].includes(targetFormat)) throw new Error('Selecciona un formato válido.');
    if (!language && !targetFormat && !scoped) return raw;
    const text = raw.replace(/[\n;]+/g, ',');
    const parts = (text.includes(',') ? text.split(',') : text.split(/\s+/)).flatMap(p => p.split('#'));
    const formatTags = {original: 'formato-original', vertical: 'adaptar-vertical', horizontal: 'adaptar-horizontal', both: 'adaptar-ambos'};
    const tags = [projectId ? `proyecto-${projectId}` : null,
      language === 'es' || language === 'en' || ['vertical', 'horizontal', 'both'].includes(targetFormat) ? 'capsula' : null,
      language === 'es' ? 'subtitulos-es' : language === 'en' ? 'subtitles-en' : language === 'none' ? 'sin-subtitulos' : null,
      formatTags[targetFormat]].filter(Boolean);
    const key = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const superseded = [...(language ? ['subtitulos-es', 'subtitular-es', 'subtitles-en', 'subtitle-en', 'sin-subtitulos'] : []),
      ...(targetFormat ? Object.values(formatTags) : [])];
    for (const part of parts) {
      const tag = part.trim().replace(/^[#·.\s]+|[#·.\s]+$/g, '').slice(0, 80);
      if (tag && !(scoped && /^proyecto-[a-z0-9][a-z0-9-]*$/.test(key(tag))) && !superseded.includes(key(tag)) && !tags.some(t => key(t) === key(tag))) tags.push(tag);
    }
    const result = tags.join(', ');
    if (tags.length > 10 || result.length > 400) {
      throw new Error('Reduce las etiquetas para incluir el proyecto, los subtítulos y el formato elegidos. El máximo es 10 etiquetas y 400 caracteres.');
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
    if(data.format !== 'audio' && (data.targetFormat === 'all' && !!data.projectId || /^(project|layout):[a-z0-9][a-z0-9:-]{0,79}$/.test(data.targetFormat || ''))) {
      if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(data.formatProject || data.projectId || ''))throw new Error('El formato necesita un proyecto.');
      target.searchParams.set('importProject',data.formatProject || data.projectId);
      target.searchParams.set('importCustomFormat',data.targetFormat);
    }
    if (title) target.searchParams.set('importTitle', title);
    if (comment) target.searchParams.set('importComment', comment);
    if (tags) target.searchParams.set('importTags', tags);
    return target.toString();
  }

  global.AdmiraImporter = Object.freeze({ videoId, canonicalUrl, thumbnailUrl, suggestTags, suggestedFormat, tagsForImport, handoffUrl });
})(globalThis);
