import {composeFilter} from '../adaptaciones/adapter-core.mjs';

export function subtitlePlans(w,h,request) {
  if (!request || request==='original') return [{W:w,H:h,format:null}];
  return [{W:1080,H:1920,format:'9:16',orientation:'vertical'},{W:1920,H:1080,format:'16:9',orientation:'horizontal'}]
    .filter(t=>request==='both'||request===t.orientation)
    .map(t=>Math.abs(w/h-t.W/t.H)<.005?{...t,W:w,H:h}:t);
}
export function matchesSubtitleFormat(item,format) {
  return !format || (item.tags||[]).includes(format)
    || Math.abs((+item.validacion?.ancho / +item.validacion?.alto)-(format==='9:16'?9/16:16/9))<.005;
}
const clock=t=>{const c=Math.round(t*100);return `${Math.floor(c/360000)}:${String(Math.floor(c/6000)%60).padStart(2,'0')}:${String(Math.floor(c/100)%60).padStart(2,'0')}.${String(c%100).padStart(2,'0')}`;};
const escape=text=>text.replace(/\\/g,'＼').replace(/{/g,'｛').replace(/}/g,'｝').replace(/[\x00-\x08\x0b-\x1f]/g,'');
export function subtitleLayout(cues,w,h) {
  const font=Math.max(12,Math.round(Math.min(w,h)*.045)), margin=Math.round(w*.06), bottom=Math.max(8,Math.round(h*.05));
  const max=Math.max(14,Math.floor((w-2*margin)/(font*.6)));
  const displayed=[];
  for (const cue of cues) {
    const words=String(cue.text).trim().split(/\s+/),lines=[];let line='';
    for (const word of words) {
      if(word.length>max)throw new Error('subtitle-review-required');
      if(line&&(line+' '+word).length>max){lines.push(line);line=word;}else line+=(line?' ':'')+word;
    }
    if(line)lines.push(line);
    const chunks=[];for(let i=0;i<lines.length;i+=2)chunks.push(lines.slice(i,i+2).join('\n'));
    const length=chunks.reduce((n,t)=>n+t.length,0);let start=cue.start;
    for(const text of chunks){const end=start+(cue.end-cue.start)*text.length/length;
      if(end-start<.3 || text.replace(/\s/g,'').length/(end-start)>30)throw new Error('subtitle-review-required');
      displayed.push({start,end,text});start=end;
    }
  }
  const header=`[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,DejaVu Sans,${font},&H00FFFFFF,&H00FFFFFF,&H80000000,&H80000000,-1,0,0,0,100,100,0,0,3,2,0,2,${margin},${margin},${bottom},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  return {cues:displayed,fontSize:font,ass:header+displayed.map(c=>`Dialogue: 0,${clock(c.start)},${clock(c.end)},Default,,0,0,0,,${escape(c.text).replace(/\n/g,'\\N')}`).join('\n')+'\n'};
}
export function subtitleVideoJob(source,target) {
  const subs='subtitles=subs.ass:fontsdir=fonts';
  const filter=source.w===target.W&&source.h===target.H
    ? ['-vf',subs,'-map','0:v:0']
    : ['-filter_complex',composeFilter({ancho:source.w,alto:source.h},target.W,target.H,'blur',{fx:.5,fy:.5,zoom:1},'picture')+`;[picture]${subs}[out]`,'-map','[out]'];
  return {durationSeconds:source.d,args:['-i','input',...filter,'-map','0:a?','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-y','output.mp4']};
}
