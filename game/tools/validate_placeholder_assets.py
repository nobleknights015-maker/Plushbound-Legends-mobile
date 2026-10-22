#!/usr/bin/env python3
from pathlib import Path
import hashlib,json,struct,sys
ROOT=Path('game/assets/placeholders')
idx=ROOT/'placeholder-index.json'
errors=[]
if not idx.exists(): errors.append('missing placeholder-index.json')
records=[] if errors else json.loads(idx.read_text()).get('records',[])
ids=set();paths=set()
for r in records:
    lid=r['logicalId']; p=Path(r['path'])
    if lid in ids: errors.append(f'duplicate logicalId: {lid}')
    if str(p).lower() in paths: errors.append(f'duplicate path: {p}')
    ids.add(lid); paths.add(str(p).lower())
    if not p.exists(): errors.append(f'missing: {p}'); continue
    if hashlib.sha256(p.read_bytes()).hexdigest()!=r['sha256']: errors.append(f'checksum mismatch: {p}')
    if p.suffix=='.png':
        b=p.read_bytes()
        if b[:8]!=b'\x89PNG\r\n\x1a\n': errors.append(f'invalid png: {p}'); continue
        w,h=struct.unpack('>II',b[16:24])
        if [w,h]!=r['dimensions']: errors.append(f'dimension mismatch: {p}')
        if r.get('layout')=='48px-grid' and (w%48 or h%48): errors.append(f'not 48px grid: {p}')
    if p.suffix=='.wav' and p.read_bytes()[:4]!=b'RIFF': errors.append(f'invalid wav source: {p}')
# hard invariants
for c in ['chris-bourn','penney-nguyen','lily','ethan']:
    for s in ['sprite','portrait','face']:
        if f'npc/{c}/{s}' not in ids: errors.append(f'missing protected canon slot npc/{c}/{s}')
for r in ['elyndor','verdancia','cinderreach','tideglass-coast','silkspire','moonpatch-steppe','frostlace','gloamfen','sunspool-desert','crownweave']:
    if not any(x.startswith(f'reg/{r}/') for x in ids): errors.append(f'missing region: {r}')
report={'schemaVersion':1,'phase':'asset-production-only','gameDevelopmentStarted':False,'gameplayImplementation':False,'recordCount':len(records),'passed':not errors,'errors':errors}
(ROOT/'placeholder-validation-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
sys.exit(1 if errors else 0)
