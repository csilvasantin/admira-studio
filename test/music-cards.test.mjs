import test from 'node:test';
import assert from 'node:assert/strict';
import {cardSvg,cardHtml,FORMATS,isMusic,normalizeMusic,matchesMusicType,hasMusicCards,filename} from '../assets/music/cards.mjs';
const track={id:'track-id',type:'music',motor:'suno-local-v5',title:'My cup, my moment',url:'https://example.test/song.mp3',duration:202};
test('Suno MP4 and audio stay music; no match in image/video/audio, source metadata and media preserved',()=>{
 for(const type of ['video','audio','music']){
  const source={...track,type,mime:type==='video'?'video/mp4':'audio/mpeg'},normalized=normalizeMusic(source);
  assert.equal(normalized.type,'music');assert.equal(source.type,type);assert.equal(normalized.url,source.url);assert.equal(normalized.mime,source.mime);
  assert.equal(matchesMusicType(source,'music'),true);for(const filter of ['image','video','audio','locucion'])assert.equal(matchesMusicType(source,filter),false);
 }
});
test('ordinary video, image, speech and user-tagged Suno image are not silently reclassified',()=>{
 for(const source of [{type:'video',motor:'veo'},{type:'video',motor:'local',tags:['suno','capsula']},{type:'image',motor:'nano-banana',tags:['suno']},{type:'locucion',motor:'suno'},{type:'audio',motor:'tts'},{type:'audio',motor:'local',tags:'suno'},{type:'image',motor:'suno'}]){
  assert.equal(isMusic(source),false);assert.strictEqual(normalizeMusic(source),source);assert.equal(matchesMusicType(source,'music'),null);assert.equal(cardHtml(source),'');
 }
});
test('explicit music presentation is music even if stored in a visual container; never another image/video item',()=>{
 const presentation={...track,type:'image',motor:'adaptador',musicCard:{schema:'admira.music-card.v1',trackId:track.id}};
 assert.equal(normalizeMusic(presentation).type,'music');assert.equal(matchesMusicType(presentation,'image'),false);assert.equal(hasMusicCards(presentation),true);
 assert.equal(cardHtml(presentation).includes('<audio'),false,'an image presentation is not a playable track');
});
test('both authored formats have exact dimensions, preserved title, duration, language, safe text and separate SVG IDs',()=>{
 const adversarial={...track,title:'<script>alert("x")</script> & café'};
 for(const format of Object.keys(FORMATS)){
  const svg=cardSvg(adversarial,format),{width,height}=FORMATS[format];
  assert.match(svg,new RegExp(`viewBox="0 0 ${width} ${height}"`));assert.ok(svg.includes('3:22'));assert.ok(svg.includes('&lt;script&gt;'));assert.ok(!svg.includes('<script>'));assert.ok(svg.includes('MÚSICA'));
  assert.ok(cardSvg(track,format,{lang:'en'}).includes('MUSIC'));
 }
 assert.notEqual(cardSvg(track,'landscape').match(/id="([^"]+-art)"/)[1],cardSvg(track,'portrait').match(/id="([^"]+-art)"/)[1]);
 assert.throws(()=>cardSvg({type:'image'},'landscape'));assert.throws(()=>cardSvg(track,'square'));
});
test('unsafe cover URLs never reach SVG and filenames remain usable',()=>{
 assert.ok(!cardSvg({...track,thumbnail:'javascript:alert(1)'}).includes('javascript:'));
 assert.ok(!cardSvg({...track,thumbnail:'https://x.test/"/><script>bad</script>'}).includes('<script>'));
 assert.equal(filename({...track,title:'a/b:c'},'portrait'),'a-b-c-1080x1920.png');
});
test('exports do not add standalone catalog items; the controls belong to one existing track',()=>{
 const html=cardHtml(track);assert.equal((html.match(/data-music-id=/g)||[]).length,1);assert.ok(html.includes('data-format="landscape"'));assert.ok(html.includes('data-format="portrait"'));assert.ok(html.includes('Descargar cartela'));assert.ok(!html.includes('stock/publish'));
});

test('historical local Suno audio imports join Music; a visual capsule using its soundtrack remains video',()=>{
 const song={id:'imported',type:'audio',motor:'local',tags:['suno','música'],url:'https://example.test/song.mp3'};assert.equal(normalizeMusic(song).type,'music');assert.ok(hasMusicCards(song));assert.equal(matchesMusicType(song,'audio'),false);const capsule={...song,type:'video',tags:['suno','capsula']};assert.equal(isMusic(capsule),false);assert.equal(hasMusicCards(capsule),false);
});
