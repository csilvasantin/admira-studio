import test from 'node:test';
import assert from 'node:assert/strict';
import {publishCampaignCreative} from '../adaptaciones/campaign-sync-stock.mjs';
const S=globalThis.StockSync,url=id=>'https://stock.admira.store/stock/'+id+'/asset.mp4';
const screen=(id,n=0)=>({id,x:n*1080,y:0,w:1080,h:1920,rotation:0});
function fixture(){
 const old=Array.from({length:6},(_,n)=>({id:'old-'+n,name:'Existing '+n,width:1080,height:1920,seconds:24,fps:25,screens:[{...screen('panel'),stockId:'old-file-'+n,url:url('old-file-'+n),languages:[n<3?'es':'en'],seconds:24,fps:25}]}));
 old[0].preview={stockId:'old-preview',url:url('old-preview')};
 const previous={...S.validate({schema:S.SCHEMA,id:'coffee-travel',stockId:'original-card',title:'Coffee',client:{id:'starbucks',name:'Starbucks'},revision:6,adaptations:old,defaultAdaptation:'old-0'}),registryRevision:5};
 const i={id:'starbucks-pg103',name:{es:'Paseo de Gracia / Diagonal · VV–V–VVV'},width:6480,height:1920,screens:Array.from({length:6},(_,n)=>({...screen('portrait-'+n,n),group:n<2?1:n===2?2:3}))};
 const campaign={id:'coffee',direction:'travel',name:'Coffee',revision:7,client:previous.client,installations:[i]};
 const items=i.screens.map((s,n)=>({campaign:{contract:{campaign},installation:i.id,screen:s.id,contentLanguage:'es',seconds:24},files:[{stock:{id:'new-file-'+n}}]}));
 return {previous,campaign,items};
}
test('adding a seventh layout retains its Stock card, six existing formats, native files and prepared previews',async()=>{
 const {previous,campaign,items}=fixture(),before=structuredClone(previous),posts=[];
 const fetch=async(path,options={})=>{assert.equal(path,'/stock-creatives');if(!options.method)return {json:async()=>({creatives:[previous]})};posts.push(JSON.parse(options.body));return {ok:true,json:async()=>({ok:true,creative:posts.at(-1).creative})};};
 await publishCampaignCreative({campaign,items,poster:{},fetch});
 assert.equal(posts.length,1);const {creative,rev}=posts[0];assert.equal(rev,5);assert.equal(creative.stockId,'original-card');assert.equal(creative.defaultAdaptation,'old-0');assert.equal(creative.adaptations.length,7);assert.deepEqual(creative.adaptations.slice(0,6),previous.adaptations);assert.equal(creative.adaptations[6].screens.length,6);assert.deepEqual(previous,before);
});
test('retry after registration preserves all seven formats, even after the new preview has been attached',async()=>{
 const {previous,campaign,items}=fixture();let registered;
 const first=async(path,options={})=>!options.method?{json:async()=>({creatives:[previous]})}:{ok:true,json:async()=>{registered=JSON.parse(options.body).creative;return {ok:true,creative:registered};}};
 await publishCampaignCreative({campaign,items,poster:{},fetch:first});registered.adaptations.at(-1).preview={stockId:'new-preview',url:url('new-preview')};
 const retry=async(path,options={})=>{assert.equal(path,'/stock-creatives');assert.equal(options.method,undefined);return {json:async()=>({creatives:[registered]})};};
 const result=await publishCampaignCreative({campaign,items,poster:{},fetch:retry});assert.equal(result.creative.adaptations.length,7);assert.equal(result.creative.adaptations.at(-1).preview.stockId,'new-preview');
});
