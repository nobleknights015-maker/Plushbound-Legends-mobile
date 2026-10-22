#!/usr/bin/env python3
"""Materialize deterministic, engine-safe Plushbound placeholder assets.
ASSET PHASE ONLY. This script does not implement gameplay.
"""
from pathlib import Path
import argparse, hashlib, json, math, struct, wave, zlib

REGIONS=['elyndor','verdancia','cinderreach','tideglass-coast','silkspire','moonpatch-steppe','frostlace','gloamfen','sunspool-desert','crownweave']
CANON=['chris-bourn','penney-nguyen','lily','ethan']
ROOT=Path('game/assets/placeholders')

def png(path,w,h,seed):
    path.parent.mkdir(parents=True,exist_ok=True)
    hsh=hashlib.sha256(seed.encode()).digest(); rgb=(hsh[0],hsh[1],hsh[2])
    raw=b''.join(b'\x00'+bytes((*rgb,255))*w for _ in range(h))
    def chunk(t,d):
        return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
    path.write_bytes(data)

def wav(path,seconds=.25,rate=22050):
    path.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate)
        f.writeframes(b''.join(struct.pack('<h',int(400*math.sin(2*math.pi*220*i/rate))) for i in range(int(rate*seconds))))

def add(records,lid,path,w,h,kind='png',scope='global',region=None,layout='single'):
    p=ROOT/path
    if kind=='png': png(p,w,h,lid)
    else: wav(p)
    records.append({'logicalId':lid,'path':str(p),'category':path.parts[0],'scope':scope,'region':region,'dimensions':[w,h] if kind=='png' else None,'layout':layout,'placeholder':True,'replacementTarget':'original-polished-plushbound-final-art','provenance':'generated-placeholder','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'qaStatus':'generated'})

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--clean',action='store_true');a=ap.parse_args()
    if a.clean and ROOT.exists():
        import shutil; shutil.rmtree(ROOT)
    rec=[]
    # Protected canon characters: MV-like 3x4 walking sheets + portraits/faces.
    for c in CANON:
        add(rec,f'npc/{c}/sprite',Path('canon')/c/'sprite.png',144,192,layout='3x4-48px')
        add(rec,f'npc/{c}/portrait',Path('canon')/c/'portrait.png',288,384)
        add(rec,f'npc/{c}/face',Path('canon')/c/'face.png',144,144)
    # Creator representative slots preserve all layer geometry; IDs remain stable replacement targets.
    layers={'body':24,'skin':18,'front-hair':96,'back-hair':96,'eyes':48,'brows':32,'mouths':32,'facial-details':48,'tops':120,'bottoms':96,'full-outfits':96,'outerwear':72,'footwear':64,'headwear':64,'accessories':96,'palettes':24}
    for layer,count in layers.items():
        for i in range(1,count+1): add(rec,f'creator/{layer}/{i:03d}',Path('creator')/layer/f'{i:03d}.png',144,192,layout='3x4-48px')
    # Guardian capacity: all required subassets.
    gslots={'overworld':(144,192),'portrait':(288,288),'silhouette':(192,192),'battle-idle':(192,192),'battle-action':(192,192),'battle-hurt':(192,192),'bond-expression':(144,144),'icon':(96,96),'field-interaction':(192,192),'resting-pose':(192,192)}
    for i in range(1,97):
        gid=f'guardian-{i:03d}'
        for slot,(w,h) in gslots.items(): add(rec,f'guardian/{gid}/{slot}',Path('guardians')/gid/f'{slot}.png',w,h)
    # Region packs: deterministic representative capacity files for every required family.
    fam={'tilesets':32,'autotiles':48,'terrain':96,'buildings':56,'building-states':128,'interiors':28,'dungeons':20,'props':288,'flora':192,'roads':144,'waystitch':40,'parallaxes':40,'battlebacks':64,'weather':40,'overlays':64,'secrets':48,'npc-sprites':128,'enemy-battle':64,'boss-battle':8,'items':112}
    dims={'tilesets':(768,768),'autotiles':(288,144),'terrain':(48,48),'buildings':(192,192),'building-states':(192,192),'interiors':(768,768),'dungeons':(768,768),'props':(48,48),'flora':(48,48),'roads':(48,48),'waystitch':(96,96),'parallaxes':(816,624),'battlebacks':(816,624),'weather':(192,192),'overlays':(816,624),'secrets':(48,48),'npc-sprites':(144,192),'enemy-battle':(288,288),'boss-battle':(576,576),'items':(96,96)}
    for r in REGIONS:
        for family,count in fam.items():
            w,h=dims[family]
            for i in range(1,count+1): add(rec,f'reg/{r}/{family}/{i:03d}',Path('regions')/r/family/f'{i:03d}.png',w,h,scope='regional',region=r,layout='48px-grid' if family in {'tilesets','autotiles','terrain','interiors','dungeons','props','flora','roads','secrets'} else 'single')
    # Global item master/runtime pairs, UI, VFX.
    for i in range(1,1233):
        add(rec,f'item/global/{i:04d}/master',Path('items/master')/f'{i:04d}.png',96,96)
        add(rec,f'item/global/{i:04d}/runtime',Path('items/runtime')/f'{i:04d}.png',48,48)
    for family,count in {'menu':96,'map':64,'status':48,'quest':48,'touch':48,'frames':24}.items():
        for i in range(1,count+1): add(rec,f'ui/{family}/{i:03d}',Path('ui')/family/f'{i:03d}.png',96,96)
    for family,count in {'combat':256,'guardian':128,'bond':96,'boss':64,'field':96,'weather':48,'waystitch':48,'crafting-ui':64}.items():
        for i in range(1,count+1): add(rec,f'vfx/{family}/{i:03d}',Path('vfx')/family/f'{i:03d}.png',192,192)
    # Audio source WAV placeholders. Workflow converts to OGG and removes WAV from packaged output.
    for family,count in {'bgm':48,'ambience':96,'combat':128,'guardian':96,'ui':96,'environment':128}.items():
        for i in range(1,count+1): add(rec,f'audio/{family}/{i:03d}',Path('audio-src')/family/f'{i:03d}.wav',0,0,kind='wav')
    ROOT.mkdir(parents=True,exist_ok=True)
    (ROOT/'placeholder-index.json').write_text(json.dumps({'schemaVersion':1,'phase':'asset-production-only','gameDevelopmentStarted':False,'gameplayImplementation':False,'generatedAssetCount':len(rec),'records':rec},indent=2)+'\n')
    print(f'Materialized {len(rec)} placeholder source assets')
if __name__=='__main__': main()
