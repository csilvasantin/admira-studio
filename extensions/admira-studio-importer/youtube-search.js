'use strict';

function initialSearchData(html) {
  const assignment = /(?:\b(?:var\s+)?ytInitialData|window\[["']ytInitialData["']\])\s*=\s*(?=\{)/.exec(html);
  if (!assignment) throw new Error('YouTube no devolvió los resultados. Vuelve a intentarlo.');
  const start = assignment.index + assignment[0].length;
  let depth = 0;
  let inString = false;
  for (let i = start; i < html.length; i += 1) {
    const character = html[i];
    if (inString) {
      if (character === '\\') i += 1;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}' && --depth === 0) {
      return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error('YouTube devolvió resultados incompletos.');
}

function youtubeSearchResults(data) {
  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents;
  if (!sections) throw new Error('YouTube cambió el formato de los resultados.');
  const text = value => value?.simpleText || value?.runs?.map(run => run.text).join('') || '';
  const seen = new Set();
  const results = [];
  const pending = [sections];
  while (pending.length && results.length < 8) {
    const node = pending.pop();
    const video = node?.videoRenderer;
    const short = node?.shortsLockupViewModel;
    if (video || short) {
      const id = video?.videoId || short?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
      const title = text(video?.title) || short?.overlayMetadata?.primaryText?.content;
      if (/^[\w-]{11}$/.test(id || '') && typeof title === 'string' && title.trim() && !seen.has(id)) {
        seen.add(id);
        results.push({
          url: `https://www.youtube.com/watch?v=${id}`,
          title: title.trim().slice(0, 180),
          channel: (text(video?.ownerText) || text(video?.shortBylineText)).slice(0, 100),
          description: (text(video?.detailedMetadataSnippets?.[0]?.snippetText) || text(video?.descriptionSnippet)).slice(0, 1500),
          short: Boolean(short),
        });
      }
      continue;
    }
    if (node && typeof node === 'object') {
      const children = Object.values(node);
      for (let index = children.length - 1; index >= 0; index -= 1) pending.push(children[index]);
    }
  }
  return results;
}

async function searchYouTube(query) {
  const term = String(query || '').trim();
  if (!term || term.length > 200) throw new Error('Escribe una búsqueda de entre 1 y 200 caracteres.');
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', term);
  const response = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('YouTube no está disponible. Vuelve a intentarlo.');
  return youtubeSearchResults(initialSearchData(await response.text()));
}
