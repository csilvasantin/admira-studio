import {stockSource} from '../adaptaciones/stock-publish.mjs';
import {MAX_LOCAL_BYTES,localMedia,validateLocalFiles} from './stock-local-files.mjs';
import {readMediaDimensions} from './content-orientation.mjs';
import {sampleImportVideo} from './import-context.mjs';

export async function publishLocalFile(file,{tags=[],comment='',onProgress=null,fetch:f=(...a)=>fetch(...a),dimensions=readMediaDimensions,sample=sampleImportVideo}={}) {
  const invalid=validateLocalFiles([file]);if(invalid)throw Error(invalid);
  const media=localMedia(file),url=URL.createObjectURL(file);
  try {
    const measured=media.type==='audio'?null:await dimensions(file,media.type);
    const frames=media.type==='video'?await sample(url):[];
    const source=await stockSource(file,{maxBytes:MAX_LOCAL_BYTES,...media,motor:'local',fetch:f,onProgress});
    if(!source.ok)throw Error(source.error||'upload_failed');
    const payload={...media,motor:'local',title:file.name.replace(/\.[^.]+$/,''),prompt:file.name,comment:comment||null,tags,quality:'good',dimensions:measured,searchContext:{version:1,description:''},analysisFrames:frames,...(frames.length?{poster:frames[0]}:{}),costEst:'local · '+(file.size/1_000_000).toFixed(2)+' MB',...source.fields};
    const r=await f('/stock-publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json().catch(()=>({}));if(!r.ok||!data.ok||!data.id||!data.url)throw Error(data.error||'publish_failed');
    return {...payload,...data,id:data.id,url:data.url,createdAt:data.createdAt||new Date().toISOString(),tags:data.tags||tags,thumbnail:data.thumbnail||(frames[0]||null),base64:undefined,r2Staged:undefined,analysisFrames:undefined,poster:undefined};
  } finally {URL.revokeObjectURL(url);}
}
