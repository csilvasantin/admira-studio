import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('sync exclusion preserves both Git directories and linked worktree files while refreshing generated content',()=>{
 const sync=readFileSync(new URL('../sync.sh',import.meta.url),'utf8');
 const exclusion=sync.match(/EXCL=\(--exclude '([^']+)'\)/)?.[1];
 assert.ok(exclusion,'use the exclusion from the real sync script');
 const temp=mkdtempSync(join(tmpdir(),'studio-sync-worktree-')),source=join(temp,'source'),primary=join(temp,'primary'),linked=join(temp,'linked');
 const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  mkdirSync(source);mkdirSync(primary);writeFileSync(join(source,'generated.txt'),'new');
  git(primary,'init','--initial-branch=main','-q');git(primary,'config','user.name','Fixture');git(primary,'config','user.email','fixture@example.invalid');git(primary,'commit','--allow-empty','-qm','fixture');
  const sha=git(primary,'rev-parse','HEAD');git(primary,'worktree','add','-q','-b','codex/test',linked);
  for(const target of [linked,primary]){
   writeFileSync(join(target,'generated.txt'),'old');writeFileSync(join(target,'stale.txt'),'obsolete');
   execFileSync('rsync',['-rc','--delete','--exclude',exclusion,source+'/',target+'/']);
   assert.equal(git(target,'rev-parse','HEAD'),sha);
   assert.equal(readFileSync(join(target,'generated.txt'),'utf8'),'new');assert.equal(existsSync(join(target,'stale.txt')),false);
  }
 }finally{rmSync(temp,{recursive:true,force:true});}
});
