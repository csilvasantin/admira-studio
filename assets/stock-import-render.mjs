/* Explicit Stock video gestures. Reuses the browser encoder and authenticated
 * subtitle, TTS and Stock services; the source asset is never overwritten. */
import {sharedEngine, ffmpegQueue, targetFor, pairTag, norm} from './capsula-alterna.mjs?v=20261026-importer-options';
import {isFormatRequestTag} from './importer-options.mjs';
import {DIRECTIONS} from './capsula-traduce.mjs?v=20261028-stock-actions';
import {composeFilter} from '../adaptaciones/adapter-core.mjs';
import {subtitleLayout} from './subtitle-layout.mjs?v=20261027-auto-timing';
import {mediaPreflight, submitMedia} from './creativo-media.mjs';

export const MAX_GESTURE_SECONDS = 180;
export const BRAND_CARD_SECONDS = 2;
export function gestureSourceURL(item) {
  // R2's immutable playback response can be cached without a CORS header before
  // the encoder reads it. The canonical asset endpoint serves CORS-safe bytes.
  return /^[a-zA-Z0-9-]{1,100}$/.test(String(item?.id || ''))
    ? 'https://api.admira.store/stock/asset/' + encodeURIComponent(item.id) : item.url;
}
const gestures = new Set(['subtitle', 'voice', 'adapt']);
const languages = new Set(['es', 'en']);
const even = n => Math.max(2, Math.round(n / 2) * 2);
const abort = signal => { if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError'); };

export function normalizeGesture(request = {}) {
  if (!gestures.has(request.gesture)) throw Error('gesture-invalid');
  const sourceLanguage = request.sourceLanguage || 'es';
  const targetLanguage = request.targetLanguage || (sourceLanguage === 'es' ? 'en' : 'es');
  if (!languages.has(sourceLanguage) || !languages.has(targetLanguage)) throw Error('gesture-language');
  if (request.gesture === 'voice' && sourceLanguage === targetLanguage) throw Error('voice-opposite-language');
  const subtitles = request.subtitles || (request.gesture === 'subtitle' ? 'original' : 'none');
  if (!['original', 'translate', 'none'].includes(subtitles)) throw Error('gesture-subtitles');
  const mode = request.brand?.mode === 'white-label' ? 'white-label' : 'admira';
  const name = mode === 'admira' ? 'Admira' : String(request.brand?.name || '').trim().slice(0, 80);
  if (!name) throw Error('brand-name-required');
  return {gesture:request.gesture, sourceLanguage, targetLanguage, subtitles,
    brand:{mode, name, logo:mode === 'white-label' ? request.brand?.logo || '' : ''},
    cards:{initial:request.cards?.initial !== false, final:request.cards?.final !== false}};
}

// One bounded graph: optional brand cards surround the complete body. Audio
// receives the same preroll offset and is padded with silence, never cut early.
export function gestureVideoJob(meta, request, {subtitles = false, voiceDuration = 0} = {}) {
  const r = normalizeGesture(request);
  if (![meta.w, meta.h, meta.d].every(n => Number.isFinite(n) && n > 0)) throw Error('media-metadata');
  if (meta.d > MAX_GESTURE_SECONDS) throw Error('gesture-video-too-long');
  const target = r.gesture === 'adapt' ? targetFor(meta.w, meta.h) : null;
  if (r.gesture === 'adapt' && !target) throw Error('gesture-square-video');
  // A 720p export keeps the browser memory bounded on imported short clips.
  const W = target ? Math.round(target.W * 2 / 3) : even(meta.w), H = target ? Math.round(target.H * 2 / 3) : even(meta.h);
  const intro = r.cards.initial ? BRAND_CARD_SECONDS : 0, outro = r.cards.final ? BRAND_CARD_SECONDS : 0;
  const bodyDuration = Math.max(meta.d, voiceDuration || 0), duration = intro + bodyDuration + outro;
  const input = ['-i', 'input'];
  let cardIndex = null, voiceIndex = null, next = 1;
  if (intro || outro) { cardIndex = next++; input.push('-loop', '1', '-framerate', '25', '-i', 'brand.png'); }
  if (r.gesture === 'voice') { voiceIndex = next++; input.push('-i', 'voice.mp3'); }
  const graph = [composeFilter({ancho:meta.w, alto:meta.h}, W, H, 'blur', {fx:.5, fy:.5, zoom:1}, 'picture')];
  graph.push(`[picture]${subtitles ? 'subtitles=subs.ass:fontsdir=fonts,' : ''}fps=25,format=yuv420p,setsar=1,settb=AVTB,setpts=PTS-STARTPTS${bodyDuration > meta.d ? ',tpad=stop_mode=clone:stop_duration=' + (bodyDuration-meta.d).toFixed(3) : ''},trim=duration=${bodyDuration.toFixed(3)}[body]`);
  const parts = [];
  if (intro && outro) graph.push(`[${cardIndex}:v]split=2[cardStart][cardEnd]`);
  if (intro) { graph.push(`[${intro && outro ? 'cardStart' : cardIndex + ':v'}]scale=${W}:${H},fps=25,format=yuv420p,setsar=1,settb=AVTB,trim=duration=${intro},setpts=PTS-STARTPTS[initial]`); parts.push('[initial]'); }
  parts.push('[body]');
  if (outro) { graph.push(`[${intro && outro ? 'cardEnd' : cardIndex + ':v'}]scale=${W}:${H},fps=25,format=yuv420p,setsar=1,settb=AVTB,trim=duration=${outro},setpts=PTS-STARTPTS[final]`); parts.push('[final]'); }
  graph.push(parts.join('') + `concat=n=${parts.length}:v=1:a=0[out]`);
  const args = [...input, '-filter_complex', graph.join(';'), '-map', '[out]', '-map', voiceIndex === null ? '0:a?' : `${voiceIndex}:a:0`,
    '-af', `adelay=${intro * 1000}:all=1,apad`, '-t', duration.toFixed(3), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-threads', '1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', 'output.mp4'];
  return {W, H, durationSeconds:duration, bodyDuration, format:target?.format || (W > H ? '16:9' : W < H ? '9:16' : '1:1'), args};
}

async function base64(blob) {
  const data = new Uint8Array(await blob.arrayBuffer()); let result = '';
  for (let i = 0; i < data.length; i += 32768) result += String.fromCharCode(...data.subarray(i, i + 32768));
  return btoa(result);
}

async function brandCard(brand, W, H, signal) {
  abort(signal);
  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = brand.mode === 'admira' ? '#102c32' : '#111827'; g.fillRect(0, 0, W, H);
  const unit = Math.min(W, H);
  let nameY = H * .52;
  if (brand.logo) {
    const response = await fetch(brand.logo, {signal});
    if (!response.ok) throw Error('brand-logo-download');
    const image = await createImageBitmap(await response.blob());
    const scale = Math.min(unit * .5 / image.width, unit * .3 / image.height);
    g.drawImage(image, (W-image.width*scale)/2, H*.36-image.height*scale/2, image.width*scale, image.height*scale);
    image.close(); nameY = H * .63;
  }
  let size = Math.round(unit * .105);
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
  do { g.font = `600 ${size--}px Arial, sans-serif`; } while (g.measureText(brand.name).width > W * .82 && size > 12);
  g.fillText(brand.name, W / 2, nameY);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('brand-card')), 'image/png'));
}

async function audioDuration(blob, signal) {
  const url = URL.createObjectURL(blob), audio = document.createElement('audio');
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => finish(Error('voice-duration')), 15000);
      const onAbort = () => finish(new DOMException('Cancelado', 'AbortError'));
      function finish(error, duration) { clearTimeout(timeout); signal?.removeEventListener('abort', onAbort); audio.onloadedmetadata = audio.onerror = null; error ? reject(error) : resolve(duration); }
      audio.onloadedmetadata = () => Number.isFinite(audio.duration) && audio.duration > 0 ? finish(null, audio.duration) : finish(Error('voice-duration'));
      audio.onerror = () => finish(Error('voice-duration'));
      signal?.addEventListener('abort', onAbort, {once:true}); audio.preload = 'metadata'; audio.src = url;
    });
  } finally { audio.removeAttribute('src'); audio.load(); URL.revokeObjectURL(url); }
}

function sourceCues(data) {
  const out = [];
  for (const cue of data.cues || []) {
    const text = cue.source || cue.text, last = out.at(-1);
    if (last?.text === text && Math.abs(last.end-cue.start) < .05) last.end = cue.end;
    else out.push({start:cue.start, end:cue.end, text});
  }
  return out;
}

export async function executeStockGesture(item, request, ctx = {}) {
  const r = normalizeGesture(request), say = text => ctx.onStatus?.(text), signal = ctx.signal;
  if (item?.type !== 'video' || !item.url || !item.id) throw Error('gesture-video-required');
  const sourceURL = gestureSourceURL(item);
  abort(signal);
  const engine = ctx.engine || await sharedEngine();
  const fetcher = ctx.fetch || fetch;
  const work = fn => ffmpegQueue(async () => {
    abort(signal);
    const cancel = () => engine.cancel?.(); signal?.addEventListener('abort', cancel, {once:true});
    try { const result = await fn(); abort(signal); return result; } finally { signal?.removeEventListener('abort', cancel); }
  });
  say('Leyendo el vídeo…');
  const meta = ctx.videoMeta ? await ctx.videoMeta(item) : await work(() => engine.probe(sourceURL));
  // Validate duration and target before any transcription or paid voice request.
  let job = gestureVideoJob(meta, r);
  const objectURLs = [], extraFiles = [];
  const file = (name, blob) => { const url = URL.createObjectURL(blob); objectURLs.push(url); extraFiles.push({name, url}); };
  let subtitleData = null, voice = null, voiceSeconds = 0;
  try {
    if (r.gesture === 'voice' || r.subtitles !== 'none') {
      say('Extrayendo y transcribiendo el audio…');
      let audio = null;
      await work(() => engine.encode(sourceURL, {args:['-i','input','-vn','-ac','1','-ar','16000','-b:a','48k','-y','audio.mp3'], outputs:[{file:'audio.mp3'}]}, () => {}, (_, blob) => { audio = blob; }));
      if (!audio?.size) throw Error('gesture-no-audio');
      abort(signal);
      const to = r.gesture === 'voice' ? r.targetLanguage : r.subtitles === 'translate' ? (r.sourceLanguage === 'es' ? 'en' : 'es') : r.sourceLanguage;
      const response = await fetcher('/stock-subtitles', {method:'POST', headers:{'Content-Type':'application/json'}, signal,
        body:JSON.stringify({audio:await base64(audio), from:r.sourceLanguage, to})});
      subtitleData = await response.json().catch(() => ({}));
      if (!response.ok || !subtitleData.ok) throw Error(subtitleData.error || 'gesture-transcription');
      if (!subtitleData.cues?.length) throw Error('gesture-no-speech');
      if (subtitleData.to !== to) throw Error('subtitle-language');
      if (subtitleData.cues.some(c => !Number.isFinite(c.start) || !Number.isFinite(c.end) || c.start < 0 || c.end <= c.start || c.end > meta.d+.25 || !String(c.text || '').trim())) throw Error('subtitle-cues');
    }
    if (r.gesture === 'voice') {
      say(`Generando locución ${r.targetLanguage.toUpperCase()}…`);
      const text = subtitleData.cues.map(c => c.text).join(' ').trim();
      if (text.length > 5000) throw Error('voice-text-too-long');
      const voiceJob = {kind:'locucion', brief:text, voice:'chica', languages:[r.targetLanguage === 'es' ? 'ESP' : 'ENG']};
      const token = await (ctx.voicePreflight || mediaPreflight)(voiceJob, fetcher); abort(signal);
      const result = await (ctx.submitVoice || submitMedia)(voiceJob, token, fetcher); abort(signal);
      voice = result.blob;
      if (!voice?.size) throw Error('voice-empty');
      voiceSeconds = await (ctx.audioDuration || audioDuration)(voice, signal);
      if (!(Number.isFinite(voiceSeconds) && voiceSeconds > 0 && voiceSeconds <= 240)) throw Error('voice-duration');
      file('voice.mp3', voice);
    }
    let cues = null;
    if (r.subtitles !== 'none') {
      cues = r.subtitles === 'original' ? sourceCues(subtitleData) : subtitleData.cues;
      // A voice-over is synthesized as a complete narration, without forced
      // speed changes. Recognize that narration for its actual subtitle timing.
      if (voice && r.subtitles === 'translate') {
        say('Sincronizando subtítulos con la nueva locución…');
        const response = await fetcher('/stock-subtitles', {method:'POST', headers:{'Content-Type':'application/json'}, signal,
          body:JSON.stringify({audio:await base64(voice), from:r.targetLanguage, to:r.targetLanguage})});
        const actual = await response.json().catch(() => ({}));
        if (!response.ok || !actual.ok || !actual.cues?.length) throw Error(actual.error || 'voice-subtitle-timing');
        cues = actual.cues;
      }
      const layout = subtitleLayout(cues, job.W, job.H);
      file('subs.ass', new Blob([layout.ass], {type:'text/plain'}));
      extraFiles.push({name:'fonts/DejaVuSans-Bold.ttf', url:'/assets/fonts/DejaVuSans-Bold.ttf'});
    }
    if (r.cards.initial || r.cards.final) {
      say('Preparando las cartelas de ' + r.brand.name + '…');
      file('brand.png', await (ctx.brandCard || brandCard)(r.brand, job.W, job.H, signal));
    }
    job = {...gestureVideoJob(meta, r, {subtitles:!!cues, voiceDuration:voiceSeconds}), extraFiles};
    say('Montando el vídeo…');
    let output = null;
    await work(() => engine.encode(sourceURL, job, status => {
      if (status.phase === 'encoding') say(`Montando el vídeo: ${Math.round((status.progress || 0)*100)} %`);
    }, (_, blob) => { output = blob; }));
    if (!output?.size) throw Error('gesture-encoding');
    abort(signal);
    const subtitleLanguage = r.subtitles === 'original' ? r.sourceLanguage : subtitleData?.to || r.targetLanguage;
    const oldTags = (item.tags || []).filter(t => !/^(par-|subtitulado-|locutado-|gesto-)/.test(norm(t)) && !isFormatRequestTag(t) && !DIRECTIONS[norm(t)] && !['vertical','horizontal','portrait','landscape','9:16','16:9','1:1','formato-alterno','sin-subtitulos'].includes(norm(t)));
    const tags = [pairTag(item.id), 'gesto-' + r.gesture, job.format, 'formato-original', ...(r.subtitles === 'none' ? ['sin-subtitulos'] : ['subtitulado-' + subtitleLanguage]),
      ...(voice ? ['locutado-' + r.targetLanguage] : []), ...oldTags].slice(0,12);
    const label = {subtitle:'Subtítulos', voice:'Locución', adapt:'Adaptación'}[r.gesture];
    const title = [item.title || 'Vídeo', label + (voice ? ' ' + r.targetLanguage.toUpperCase() : ''), job.format, r.brand.name].join(' · ').slice(0,300);
    const extra = {tags, externalRef:item.id, comment:`${label} de ${item.id}. Subtítulos: ${r.subtitles}. Cartelas: ${r.cards.initial ? 'inicial' : ''} ${r.cards.final ? 'final' : ''}; marca ${r.brand.name}. Original conservado.`};
    say('Guardando la nueva versión en Stock…');
    const publish = ctx.publish || (await import('../adaptaciones/stock-publish.mjs')).publishAdaptation;
    const result = await publish(output, {title, originId:item.id, format:job.format, width:job.W, height:job.H, duration:job.durationSeconds, type:'video'}, extra, {fetch:fetcher});
    if (!result.ok || !result.id) throw Error(result.error || 'gesture-publish');
    const created = {id:result.id, num:result.num, title, type:'video', motor:'adaptador', mime:'video/mp4', ...extra,
      validacion:{ok:true, ancho:job.W, alto:job.H, duracion:job.durationSeconds}, ...(result.url ? {url:result.url} : {})};
    say('Nueva versión guardada en Stock.');
    return {ok:true, id:result.id, item:created, ...(result.url ? {url:result.url} : {})};
  } finally { objectURLs.forEach(url => URL.revokeObjectURL(url)); }
}
