#!/usr/bin/env python3
"""Apply only the upstream linked-version release through Studio's brand contract.
The full mirror currently contains independent Studio work. This scoped generator
retains that work and fails on ambiguous upstream edits instead of deleting it.
"""
import argparse,difflib,json,subprocess
from pathlib import Path
root=Path(__file__).resolve().parent.parent
config=json.loads((root/'marca.json').read_text());source=root/config['origen']
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--release',choices=['linked-versions','batch-create'],default='linked-versions')
parser.add_argument('--prepare',action='store_true',help='Generate a review branch before upstream merge; never deploys')
args=parser.parse_args()
base='dfa737be3331829aa581dfd2cc8214102af07ce0';target='94a6187eed87da01782004602af1a3fbfece7d37'
assets=[]
if args.release=='batch-create':
 base='3dd17714a672408e8d67aefb1bb6d25c94867a97'
 target='1667315e5b646a3e3c42eef4bec6af53647abc32'
 assets=['assets/admira-resource-batch.mjs','assets/admira-batch-create.mjs']
if not args.prepare:subprocess.run(['git','-C',str(source),'merge-base','--is-ancestor',target,'origin/main'],check=True)
else:print('Preparing review files from upstream release; production requires upstream merge first.')
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
  if content.count(before)==0 and after and content.count(after)==1:continue
  if content.count(before)!=1:raise SystemExit(f'{name}: ambiguous upstream block at {a+1}; no files written')
  content=content.replace(before,after,1)
 outputs[name]=content
for name in assets:outputs[name]=branded(subprocess.check_output(['git','-C',str(source),'show',target+':'+name],text=True))
for name,content in outputs.items():(root/name).write_text(content)
(root/'catalogue-source.json').write_text(json.dumps({'source':'pixeria','base':base,'commit':target,'paths':list(outputs),'mode':'incremental','release':args.release,'prepared':args.prepare},indent=2)+'\n')
print('Generated scoped catalogue release in ES/EN; other Studio features retained')
