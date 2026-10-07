import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync,spawnSync} from 'node:child_process';
const repo=new URL('../',import.meta.url);
function fixture({servedVersion}={}){
 const temp=mkdtempSync(join(tmpdir(),'studio-deploy-test-')),work=join(temp,'work'),origin=join(temp,'origin.git'),bin=join(temp,'bin'),capture=join(temp,'artifact');
 mkdirSync(work);mkdirSync(bin);
 const git=(...args)=>execFileSync('git',args,{cwd:work,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 execFileSync('git',['init','--bare','-q',origin]);git('init','--initial-branch=main','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
 for(const path of ['deploy.sh','version.json','release-signature.json','index.html','en/index.html','wrangler.toml','marca.json','scripts/check-release-contract.py','functions/_avatar-loader.js','assets/avatar-digital.js']){
  const target=join(work,path);mkdirSync(join(target,'..'),{recursive:true});writeFileSync(target,readFileSync(new URL(path,repo)));
 }
 git('add','.');git('commit','-qm','fixture');git('remote','add','origin',origin);git('push','-q','origin','main');
 const sha=git('rev-parse','HEAD');
 writeFileSync(join(bin,'npx'),'#!/bin/sh\nprintf "%s\\n" "$@" > "$STUDIO_CAPTURE_ARGS"\ncp -R . "$STUDIO_CAPTURE_ARTIFACT"\n',{mode:0o755});
 writeFileSync(join(bin,'curl'),'#!/bin/sh\ncat "${STUDIO_SERVED_FILE:-$STUDIO_CAPTURE_ARTIFACT/version.json}"\n',{mode:0o755});
 if(servedVersion)writeFileSync(join(temp,'served.json'),JSON.stringify({version:servedVersion}));
 const run=()=>spawnSync('bash',['deploy.sh'],{cwd:work,encoding:'utf8',env:{...process.env,PATH:bin+':'+process.env.PATH,STUDIO_CAPTURE_ARGS:join(temp,'args'),STUDIO_CAPTURE_ARTIFACT:capture,...(servedVersion?{STUDIO_SERVED_FILE:join(temp,'served.json')}:{})}});
 return {work,temp,capture,sha,git,run,clean:()=>rmSync(temp,{recursive:true,force:true})};
}
test('dry archive stamps the exact clean main SHA in both metadata files and rails, preserving Studio config',()=>{
 const f=fixture();try{
  const before=JSON.parse(readFileSync(join(f.work,'version.json'))),signature=JSON.parse(readFileSync(join(f.work,'release-signature.json')));
  const result=f.run();assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
  for(const path of ['version.json','release-signature.json']){
   const meta=JSON.parse(readFileSync(join(f.capture,path)));assert.equal(meta.git,f.sha);assert.equal(meta.gitFull,f.sha);assert.equal(meta.gitShort,f.sha.slice(0,7));assert.equal(meta.dirty,false);
   const original=path==='version.json'?before:signature;for(const key of ['version','author','agent','deployer','machine','signature'])assert.equal(meta[key],original[key]);
  }
  for(const path of ['index.html','en/index.html'])assert.ok(readFileSync(join(f.capture,path),'utf8').includes(' · '+f.sha.slice(0,7)+' · clean'));
  for(const path of ['wrangler.toml','functions/_avatar-loader.js','assets/avatar-digital.js'])assert.deepEqual(readFileSync(join(f.capture,path)),readFileSync(join(f.work,path)));
  assert.equal(existsSync(join(f.capture,'marca.json')),false);
  const args=readFileSync(join(f.temp,'args'),'utf8');assert.match(args,/--project-name=admira-studio/);assert.ok(args.includes('--commit-hash='+f.sha));assert.match(args,/--commit-dirty=false/);assert.doesNotMatch(args,/--commit-dirty=true/);
  assert.equal(f.git('status','--porcelain'),'');
 }finally{f.clean();}
});
test('uncommitted edits, another branch and a main ahead of origin cannot reach Pages',()=>{
 for(const mode of ['dirty','branch','ahead','behind']){
  const f=fixture();try{
   if(mode==='dirty')writeFileSync(join(f.work,'untracked.txt'),'dirty');
   if(mode==='branch')f.git('switch','-c','codex/test');
   if(mode==='ahead'||mode==='behind'){writeFileSync(join(f.work,'new.txt'),'ahead');f.git('add','new.txt');f.git('commit','-qm','ahead');if(mode==='behind'){f.git('push','-q','origin','main');f.git('reset','--hard',f.sha);}}
   const result=f.run();assert.notEqual(result.status,0);assert.equal(existsSync(f.capture),false);assert.equal(existsSync(join(f.temp,'args')),false);
  }finally{f.clean();}
 }
});

test('postdeploy probe reports an older served version without failing on adjacent guillemets',()=>{
 const servedVersion='v.01.01.2000.r1.00:00',f=fixture({servedVersion});try{
  const local=JSON.parse(readFileSync(join(f.work,'version.json'))).version;const result=f.run();
  assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.ok(result.stdout.includes('«'+servedVersion+'»'));assert.ok(result.stdout.includes('«'+local+'»'));assert.doesNotMatch(result.stderr,/unbound variable/);assert.ok(existsSync(f.capture));
 }finally{f.clean();}
});
