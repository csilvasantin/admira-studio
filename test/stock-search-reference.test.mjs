import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});vm.runInContext(readFileSync(new URL('../assets/stock-search.js',import.meta.url),'utf8'),context);const {matches}=context.AdmiraStockSearch;
const song={num:1549,title:'ES · Leonardo (Pop) A',prompt:'Una canción cálida',tags:['leonardo','hilomusical','suno'],comment:'Música para Starbucks'};
test('displayed reference works with or without hashtag, as numeric/string metadata and in combined searches',()=>{
 for(const q of ['1549','#1549','#01549','#1549 Leonardo','leonardo #1549'])assert.equal(matches(song,q),true,q);
 assert.equal(matches({...song,num:'1549'},'#1549'),true);
 for(const q of ['#154','154','#1562','#1549 rock','#1549 #1562'])assert.equal(matches(song,q),false,q);
});
test('numeric hashtags require reference identity; bare numeric text still matches exactly',()=>{
 const other={num:15,title:'Colección 1549',tags:['1549']};assert.equal(matches(other,'#1549'),false);assert.equal(matches(other,'1549'),true);
 assert.equal(matches({title:'Sin número'},'#1549'),false);assert.equal(matches({num:0},'#0'),true);
});
test('text/hashtags, accents, aliases, comments, malformed tags and empty searches remain usable',()=>{
 for(const q of ['#leonardo','#hilomusical','cancion calida','music Starbucks','Suno',''])assert.equal(matches(song,q),true,q);
 assert.equal(matches({...song,tags:null},'Leonardo'),true);assert.equal(matches(song,'#ajena'),false);
});
