import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const exceptions=JSON.parse(fs.readFileSync(path.join(root,'test/studio-page-exceptions.json')));
function pages(folder){return fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.name==='.git'?[]:e.isDirectory()?pages(path.join(folder,e.name)):e.name.endsWith('.html')?[path.join(folder,e.name)]:[]);}
const all=pages(root),stamp=JSON.parse(fs.readFileSync(path.join(root,'version.json'))).version.slice(2).replace(':','');
for(const file of all){const name=path.relative(root,file),html=fs.readFileSync(file,'utf8');test('Studio navigation contract: '+name,()=>{
 const exception=exceptions[name];
 if(exception){
  assert(!html.includes('site-nav.js'),'exception must not mask an adopted page');
  if(exception.kind.endsWith('redirect'))assert(html.includes(exception.target),'documented alias still reaches its canonical destination');
  else assert(exception.reason&&html.includes('<body'),'media output has an explicit reason');
  return;
 }
 assert.match(html,/<main\b/,'workspace content has a main');
 assert.match(html,/<script\b(?=[^>]*\bdefer)(?=[^>]*\bsrc="\/assets\/site-nav\.js(?:\?v=|"))[^>]*>/,'common deferred navigation');
 for(const asset of ['site-nav.js','cuadratura.css','cuadratura.js'])assert(html.includes(asset+'?v='+stamp),'current navigation asset '+asset);
 assert(/class="[^"]*(?:site-header|topnav|quad-top|cuad)[^"]*"/.test(html),'mountable shared shell');
 const close=html.match(/<body\b[^>]*>[\s\S]*?<script\b[^>]*>([\s\S]*?)<\/script>/);
 assert(close&&['pf-left-off','pf-right-off','pf-bottom-off'].every(cls=>close[1].includes(cls)),'panels close without changing content');
 });}
test('Every shell exception refers to a current document',()=>{for(const name of Object.keys(exceptions))assert(fs.existsSync(path.join(root,name)),name);});
test('Legacy administration reaches server-protected canonical pages without local role shortcuts',()=>{for(const [file,target] of Object.entries(exceptions).filter(([f])=>f.startsWith('god/'))){const html=fs.readFileSync(path.join(root,file),'utf8');assert(html.includes('location.search+location.hash'));assert(!/god-mode|initGodMode|localStorage|sessionStorage/.test(html));assert(target.target.startsWith('/backoffice/'));}});
