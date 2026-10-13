import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{adaptCreatorContract,reviewedCreatorOutput}from'../adaptaciones/creator-adapter-core.mjs';
const source=JSON.parse(readFileSync(new URL('../campanas/starbucks-5839/source/creator-es.json',import.meta.url))),measure=(text,px)=>text.length*px*.58;
test('GOOD turns the actual approved Starbucks landscape into native portrait without losing any authored layer',()=>{
 const saved=JSON.stringify(source),a=adaptCreatorContract(source,'portrait','es'),o=reviewedCreatorOutput(a,measure);
 assert.deepEqual([o.job.W,o.job.H],[1080,1920]);assert.equal(a.provenance.quality,'good');assert.equal(a.provenance.aiCalls,0);
 for(const k of a.provenance.preserved)assert.equal(a.campaign[k],source.campaign[k],k);
 for(const role of ['headline','cta','product','logo'])assert(o.plan.layers.some(l=>l.role===role),role);
 for(const l of o.plan.layers){assert(l.x>=0&&l.y>=0&&l.x+l.w<=1080+.01&&l.y+l.h<=1920+.01,l.role+' complete bounds');}
 assert.equal(JSON.stringify(source),saved,'source campaign and review stay untouched');assert.deepEqual(a.campaign.placements,{});
});
test('EN copy is retained exactly through native portrait adaptation and the 10-second still job',()=>{
 const input=structuredClone(source);input.campaign.headline='YOUR MOMENT.\nYOUR COFFEE.';input.campaign.cta='Take a break. Order your favourite.';
 const a=adaptCreatorContract(input,'portrait','en'),o=reviewedCreatorOutput(a,measure);assert.equal(a.campaign.headline,input.campaign.headline);assert.equal(a.campaign.cta,input.campaign.cta);assert.equal(o.job.durationSeconds,10);assert(o.job.args.includes('libx264'));assert(o.job.args.includes('-an'));
});
test('unreviewed, ambiguous, external and executable source assets never reach the preview renderer',()=>{
 for(const asset of ['https://evil.example/collect','/asset.png','data:image/svg+xml;base64,PHN2Zz4=','javascript:alert(1)']){
  const bad=structuredClone(source);bad.campaign.product=asset;assert.throws(()=>adaptCreatorContract(bad,'portrait'),/creator-portable-assets|campaign-asset/);
 }
 const unreviewed=structuredClone(source);unreviewed.approvals={};assert.throws(()=>adaptCreatorContract(unreviewed,'portrait'),/creator-source-review/);
 const many=structuredClone(source);many.campaign.installations[1].enabled=true;assert.throws(()=>adaptCreatorContract(many,'portrait'),/creator-single-screen/);
 assert.throws(()=>adaptCreatorContract(source,'strip'),/creator-target/);
});
test('a reviewed portrait output returns to landscape with the same copy and portable assets',()=>{
 const first=reviewedCreatorOutput(adaptCreatorContract(source,'portrait','es'),measure).contract;
 const c=first.campaign;first.approvals={[`portrait:${c.direction}:r${c.revision}`]:{revision:c.revision,direction:c.direction}};
 const reverse=adaptCreatorContract(first,'landscape','es'),out=reviewedCreatorOutput(reverse,measure);
 assert.deepEqual([out.job.W,out.job.H],[1920,1080]);
 for(const field of reverse.provenance.preserved)assert.equal(reverse.campaign[field],source.campaign[field]);
});
