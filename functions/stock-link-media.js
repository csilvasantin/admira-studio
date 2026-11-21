// Return public media to the authenticated Stock import form. Never forward page
// cookies or authorization headers to either the publisher or its media CDN.
import {sessionInfo} from './_auth.js';
import '../extensions/admira-studio-importer/media-link.js';
import {localMedia, MAX_LOCAL_BYTES} from '../assets/stock-local-files.mjs';

const publicURL = globalThis.AdmiraMediaLink.publicURL;
const htmlLimit = 512 * 1024;
const allowedMime = /^(?:image\/(?:jpeg|png|webp|gif|avif|heic|heif)|audio\/(?:mpeg|mp3|mp4|aac|ogg|opus|flac|wav|x-wav|webm)|video\/(?:mp4|webm|ogg|quicktime|x-matroska|x-msvideo))$/;
const fail = (message, status) => Response.json({error:message}, {status, headers:{'Cache-Control':'no-store'}});

async function openPublic(value, fetcher, signal) {
  let url = publicURL(value);
  for (let count = 0; url && count <= 5; count++) {
    const r = await fetcher(url, {redirect:'manual', credentials:'omit', signal,
      headers:{Accept:'video/*,audio/*,image/*,text/html;q=0.8,*/*;q=0.4'}});
    if (![301,302,303,307,308].includes(r.status)) return {url, r};
    const location = r.headers.get('location');
    await r.body?.cancel();
    url = publicURL(location, url);
  }
  throw Error('El enlace redirige a un destino no compatible.');
}

function mediaResponse({url, r}) {
  const mime = localMedia({name:new URL(url).pathname, type:r.headers.get('Content-Type')})?.mime;
  if (!allowedMime.test(mime)) return null;
  const size = Number(r.headers.get('Content-Length')) || 0;
  if (size > MAX_LOCAL_BYTES) { void r.body?.cancel(); return fail('El archivo supera 100 MB.', 413); }
  const headers = {'Content-Type':mime, 'Content-Disposition':'attachment', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'};
  if (size && !r.headers.has('Content-Encoding')) headers['Content-Length'] = String(size);
  let bytes = 0;
  const stream = r.body.pipeThrough(new TransformStream({transform(chunk, controller) {
    bytes += chunk.byteLength;
    if (bytes > MAX_LOCAL_BYTES) throw Error('El archivo supera 100 MB.');
    controller.enqueue(chunk);
  }}));
  return new Response(stream, {headers});
}

// Cloudflare's HTMLRewriter exposes raw character references in attributes.
export function attributeText(value) {
  return (value || '').replace(/&(amp|quot|apos|lt|gt|#x[0-9a-f]+|#[0-9]+);/gi,(raw,key)=>{
    const named={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>'};
    if (key[0]!=='#') return named[key.toLowerCase()];
    const hex=key[1].toLowerCase()==='x';
    const code=parseInt(key.slice(hex?2:1),hex?16:10);
    return code>0 && code<=0x10FFFF ? String.fromCodePoint(code) : raw;
  });
}

export async function mediaCandidates(r, url) {
  const choices = {video:[], audio:[], image:[]};
  let videoPlayer = false;
  function add(kind, src) {
    const u = publicURL(src, url);
    if (u && !choices[kind].includes(u) && choices[kind].length < 4) choices[kind].push(u);
  }
  const rewriter = new HTMLRewriter().on('meta', {element(el) {
    const key = (el.getAttribute('property') || el.getAttribute('name') || '').toLowerCase();
    const src = attributeText(el.getAttribute('content'));
    if (key === 'twitter:player') videoPlayer = true;
    const m = /^(?:og|twitter):(video|audio|image)(?::(?:secure_url|url|src))?$/.exec(key);
    if (m) add(m[1], src);
  }});
  // Public LinkedIn posts can expose their MP4 renditions on the video element.
  rewriter.on('video[data-sources]', {element(el) {
    videoPlayer = true;
    try {
      const sources = JSON.parse(attributeText(el.getAttribute('data-sources')));
      if (Array.isArray(sources)) for (const source of sources) add('video', source.src);
    } catch {}
  }});
  for (const type of ['video','audio']) {
    rewriter.on(type + ', ' + type + ' source', {element(el) { add(type, attributeText(el.getAttribute('src'))); }});
  }
  const reader = rewriter.transform(r).body.getReader();
  let bytes = 0;
  try { while (bytes < htmlLimit) {
    const {done, value} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
  }} finally { await reader.cancel(); }
  return choices.video.length || videoPlayer ? choices.video : choices.audio.length ? choices.audio : choices.image;
}

export async function resolveMedia(value, fetcher = fetch, candidates = mediaCandidates) {
  const signal = AbortSignal.timeout(60000);
  const page = await openPublic(value, fetcher, signal);
  if (!page.r.ok || !page.r.body) { await page.r.body?.cancel(); return fail('El sitio de origen no permite leer el enlace.', 422); }
  const direct = mediaResponse(page);
  if (direct) return direct;
  if (!/^text\/html\b/i.test(page.r.headers.get('Content-Type') || '')) {
    await page.r.body.cancel(); return fail('El enlace no contiene un formato multimedia compatible.', 422);
  }
  for (const src of await candidates(page.r, page.url)) {
    const asset = await openPublic(src, fetcher, signal);
    if (asset.r.ok && asset.r.body) {
      const result = mediaResponse(asset);
      if (result) return result;
    }
    await asset.r.body?.cancel();
  }
  return fail('No se ha encontrado una imagen, vídeo o audio público en este enlace.', 422);
}

export async function onRequestPost({request, env}) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) return fail('invalid-origin', 403);
  if (!await sessionInfo(request, env)) return fail('Inicia sesión en Admira Studio.', 401);
  const url = new URL(request.url).searchParams.get('url');
  if (!publicURL(url)) return fail('Introduce un enlace público HTTP o HTTPS.', 400);
  try { return await resolveMedia(url); }
  catch { return fail('No se ha podido descargar el contenido del enlace.', 502); }
}
