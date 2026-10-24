#!/usr/bin/env python3
"""Apply only the upstream linked-version release through Studio's brand contract.
The full mirror currently contains independent Studio work. This scoped generator
retains that work and fails on ambiguous upstream edits instead of deleting it.
"""
import difflib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
config=json.loads((root/'marca.json').read_text());source=root/config['origen']
base='dfa737be3331829aa581dfd2cc8214102af07ce0';target='94a6187eed87da01782004602af1a3fbfece7d37'
subprocess.run(['git','-C',str(source),'merge-base','--is-ancestor',target,'origin/main'],check=True)
def branded(text):
 for old,new in config['sustituciones']:text=text.replace(old,new)
 return text
outputs={}
for name in ['stock.html','en/stock.html']:
 old=branded(subprocess.check_output(['git','-C',str(source),'show',base+':stock.html'],text=True)).splitlines(keepends=True)
 new=branded(subprocess.check_output(['git','-C',str(source),'show',target+':stock.html'],text=True)).splitlines(keepends=True)
 content=(root/name).read_text()
 for tag,a,b,c,d in reversed(difflib.SequenceMatcher(None,old,new,autojunk=False).get_opcodes()):
  if tag=='equal':continue
  before=''.join(old[a:b]);after=''.join(new[c:d])
  if not before:
   before=''.join(old[max(0,a-1):a+1]);after=''.join(old[max(0,a-1):a])+after+''.join(old[a:a+1])
  if content.count(before)!=1:raise SystemExit(f'{name}: ambiguous upstream block at {a+1}; no files written')
  content=content.replace(before,after,1)
 outputs[name]=content
for name,content in outputs.items():(root/name).write_text(content)
(root/'catalogue-source.json').write_text(json.dumps({'source':'pixeria','base':base,'commit':target,'paths':list(outputs),'mode':'incremental'},indent=2)+'\n')
print('Generated linked-version catalogue in ES/EN; other Studio features retained')
