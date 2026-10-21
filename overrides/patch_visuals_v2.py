from pathlib import Path
import re

js_path = Path('app/src/main/assets/game.js')
css_path = Path('app/src/main/assets/style.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

def replace_function(name, replacement):
    global js
    pat = rf"function {re.escape(name)}\([^)]*\)\{{.*?\n\}}"
    js2, n = re.subn(pat, replacement, js, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'Could not replace required function: {name}')
    js = js2
    print('Replaced', name)

replace_function('updateCreatorPreview', r'''function updateCreatorPreview(){
  const v=creatorValues();
  const p=$('avatarPreview');
  const hair=colors.hair[v.hairColor]||'#242631';
  const skin=colors.skin[v.skin]||'#c99170';
  const outfit=colors.palette[v.palette]||'#3f6a52';
  const body=v.build==='broad'?'broad':v.build==='slim'?'slim':'balanced';
  const h=v.hair==='long'?'long':v.hair==='braid'?'braid':v.hair==='short'?'short':'wave';
  p.innerHTML=`<div class="creator-scene"><div class="creator-ground"></div><div class="creator-chibi ${body}" style="--skin:${skin};--hair:${hair};--outfit:${outfit}"><span class="cc-shadow"></span><span class="cc-leg l"></span><span class="cc-leg r"></span><span class="cc-boot l"></span><span class="cc-boot r"></span><span class="cc-body"><i></i><b>✦</b></span><span class="cc-arm l"></span><span class="cc-arm r"></span><span class="cc-head"><i class="eye l"></i><i class="eye r"></i><i class="mouth"></i></span><span class="cc-hair ${h}"></span></div><strong class="creator-preview-name"></strong><small>Threadbound Adventurer</small></div>`;
  p.querySelector('.creator-preview-name').textContent=v.name;
}''')

replace_function('renderStarters', r'''function renderStarters(){
  const grid=$('starterGrid');
  if(!grid)return;
  grid.innerHTML='';
  D.starters.forEach(s=>{
    const b=document.createElement('button');
    b.type='button';b.className='starter-card';b.dataset.id=s.id;b.setAttribute('aria-pressed','false');
    b.innerHTML=`<span class="guardian-stage"><span class="guardian-silhouette ${s.id}"><i class="g-body"></i><i class="g-head"></i><i class="g-ear e1"></i><i class="g-ear e2"></i><i class="g-tail"></i><i class="g-mark">${s.icon}</i></span></span><strong>${s.name}</strong><small>${s.species}</small><div class="starter-stat"><span>${s.affinity}</span><span>${s.role}</span></div><span class="starter-pick">Tap to choose</span>`;
    let touchHandled=false;
    b.addEventListener('touchend',ev=>{touchHandled=true;ev.preventDefault();selectStarter(s.id);setTimeout(()=>touchHandled=false,350)},{passive:false});
    b.addEventListener('click',()=>{if(!touchHandled)selectStarter(s.id)});
    grid.appendChild(b);
  });
}''')

helpers = r'''
function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function tile(x,y,c1,c2){ctx.fillStyle=c1;ctx.fillRect(x,y,48,48);ctx.fillStyle=c2;ctx.globalAlpha=.18;ctx.fillRect(x+3,y+4,3,2);ctx.fillRect(x+31,y+18,4,2);ctx.fillRect(x+19,y+36,2,3);ctx.globalAlpha=1}
function drawTree(x,y){ctx.fillStyle='#6b4e32';ctx.fillRect(x-7,y+8,14,30);ctx.fillStyle='#3f6c45';ctx.beginPath();ctx.arc(x,y,27,0,Math.PI*2);ctx.arc(x-18,y+7,20,0,Math.PI*2);ctx.arc(x+18,y+7,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#5f8a57';ctx.beginPath();ctx.arc(x-8,y-8,15,0,Math.PI*2);ctx.fill()}
function drawHouse(x,y){ctx.fillStyle='#d8c59e';ctx.fillRect(x,y+34,112,76);ctx.fillStyle='#815844';ctx.beginPath();ctx.moveTo(x-8,y+40);ctx.lineTo(x+56,y);ctx.lineTo(x+120,y+40);ctx.closePath();ctx.fill();ctx.fillStyle='#6c4637';ctx.fillRect(x+45,y+66,24,44);ctx.fillStyle='#8eb0b8';ctx.fillRect(x+14,y+58,22,20);ctx.fillRect(x+77,y+58,22,20);ctx.strokeStyle='#5b473b';ctx.strokeRect(x+14,y+58,22,20);ctx.strokeRect(x+77,y+58,22,20)}
function drawHumanoidSprite(x,y,skin,hair,outfit,accent='#dfc27a',scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,24,20,7,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2b2e35';ctx.fillRect(-14,7,11,20);ctx.fillRect(3,7,11,20);ctx.fillStyle='#23262c';ctx.fillRect(-15,22,13,8);ctx.fillRect(2,22,13,8);ctx.fillStyle=outfit;rr(-20,-22,40,38,7,outfit);ctx.fillStyle=accent;ctx.fillRect(-18,-4,36,4);ctx.fillRect(-3,-20,6,29);ctx.fillStyle=outfit;rr(-29,-18,9,28,4,outfit);rr(20,-18,9,28,4,outfit);ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-39,20,0,Math.PI*2);ctx.fill();ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,-45,21,Math.PI,Math.PI*2);ctx.lineTo(20,-36);ctx.quadraticCurveTo(7,-43,0,-33);ctx.quadraticCurveTo(-7,-43,-20,-36);ctx.closePath();ctx.fill();ctx.fillStyle='#242129';ctx.beginPath();ctx.arc(-7,-39,2,0,Math.PI*2);ctx.arc(7,-39,2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d0a06f';ctx.fillRect(-2,-30,4,1);ctx.restore()}
function drawGuardianSprite(id,x,y,scale=.85){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const pal={ember:['#c65d45','#f3b16d'],grove:['#72915d','#c9d08f'],tide:['#5892aa','#b7e0e8'],gale:['#a8afd3','#eef1ff']}[id]||['#888','#ddd'];ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,19,22,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[0];ctx.beginPath();ctx.ellipse(0,0,20,17,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(0,-17,15,0,Math.PI*2);ctx.fill();ctx.fillStyle=pal[1];if(id==='ember'){ctx.beginPath();ctx.moveTo(-11,-27);ctx.lineTo(-7,-44);ctx.lineTo(-1,-29);ctx.moveTo(11,-27);ctx.lineTo(7,-44);ctx.lineTo(1,-29);ctx.fill();ctx.strokeStyle=pal[1];ctx.lineWidth=7;ctx.beginPath();ctx.arc(20,3,17,-1.2,.8);ctx.stroke()}else if(id==='grove'){ctx.beginPath();ctx.arc(-11,-29,6,0,Math.PI*2);ctx.arc(11,-29,6,0,Math.PI*2);ctx.fill()}else if(id==='tide'){ctx.beginPath();ctx.moveTo(-12,-28);ctx.quadraticCurveTo(-22,-40,-18,-47);ctx.quadraticCurveTo(-5,-42,-4,-29);ctx.moveTo(12,-28);ctx.quadraticCurveTo(22,-40,18,-47);ctx.quadraticCurveTo(5,-42,4,-29);ctx.fill();ctx.strokeStyle=pal[1];ctx.lineWidth=6;ctx.beginPath();ctx.arc(21,5,18,-1.1,1.1);ctx.stroke()}else{ctx.beginPath();ctx.moveTo(-9,-28);ctx.lineTo(-12,-57);ctx.lineTo(-2,-31);ctx.moveTo(9,-28);ctx.lineTo(12,-57);ctx.lineTo(2,-31);ctx.fill()}ctx.fillStyle='#20242b';ctx.beginPath();ctx.arc(-5,-17,2,0,Math.PI*2);ctx.arc(5,-17,2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,11,.1,2.9);ctx.stroke();ctx.restore()}
'''
if 'function drawHumanoidSprite' not in js:
    js = js.replace('function draw(){', helpers + '\nfunction draw(){', 1)

replace_function('drawField', r'''function drawField(){
  ctx.fillStyle='#47724d';ctx.fillRect(0,0,W,H);
  for(let y=96;y<H;y+=48){for(let x=0;x<W;x+=48){const path=y>470&&y<615;tile(x,y,path?'#a88a60':'#5f8c60',path?'#7a654e':'#3f6f48')}}
  ctx.fillStyle='#b69b71';ctx.beginPath();ctx.moveTo(0,505);ctx.bezierCurveTo(260,470,520,535,760,520);ctx.bezierCurveTo(960,508,1100,470,1280,500);ctx.lineTo(1280,590);ctx.bezierCurveTo(1000,565,760,605,500,575);ctx.bezierCurveTo(260,550,120,595,0,585);ctx.closePath();ctx.fill();
  ctx.fillStyle='#6d93a3';ctx.beginPath();ctx.ellipse(1090,180,150,70,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#accbd2';ctx.lineWidth=5;ctx.stroke();
  drawHouse(120,235);drawHouse(285,255);
  [65,470,540,615,690,760,835,1180,1240].forEach((x,i)=>drawTree(x,205+(i%3)*55));
  ctx.strokeStyle='#7e6244';ctx.lineWidth=5;for(let x=420;x<770;x+=34){ctx.beginPath();ctx.moveTo(x,380);ctx.lineTo(x,420);ctx.stroke()}ctx.beginPath();ctx.moveTo(410,394);ctx.lineTo(780,394);ctx.stroke();ctx.beginPath();ctx.moveTo(410,411);ctx.lineTo(780,411);ctx.stroke();
  ctx.fillStyle='#e9cf79';for(let i=0;i<18;i++){const x=55+i*67,y=440+(i%4)*18;ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='rgba(23,36,28,.72)';rr(32,72,292,52,10,'rgba(23,36,28,.72)','#d6bd79');ctx.fillStyle='#f5f2e9';ctx.font='700 25px Georgia,serif';ctx.fillText('Sunny Plains of Elyndor',50,105)
}''')

replace_function('drawNpc', r'''function drawNpc(n){
  if(n.id==='kazen'){
    drawHumanoidSprite(n.x,n.y,'#c99a7a','#2d2931','#34353f','#d16b4b',1.02);
    drawGuardianSprite('ember',n.x+42,n.y+12,.62);
  }else{
    drawHumanoidSprite(n.x,n.y,'#d8b08d','#6b513c','#48606c','#d4b770',.96);
  }
  ctx.fillStyle='rgba(20,24,30,.78)';rr(n.x-56,n.y-82,112,24,8,'rgba(20,24,30,.78)');ctx.fillStyle='#fff';ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.fillText(n.name,n.x,n.y-65);ctx.textAlign='left'
}''')

replace_function('drawPlayer', r'''function drawPlayer(){
  const p=state.player,pc=colors.palette[p.palette]||'#3f6a52',skin=colors.skin[p.skin]||'#c99170',hair=colors.hair[p.hairColor]||'#242631';
  drawHumanoidSprite(p.x,p.y,skin,hair,pc,'#dfb96a',p.build==='broad'?1.08:p.build==='slim'?.94:1);
  ctx.fillStyle='rgba(20,24,30,.75)';rr(p.x-48,p.y-82,96,22,7,'rgba(20,24,30,.75)');ctx.fillStyle='#fff';ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.fillText(state.player.name,p.x,p.y-66);
  if(state.guardian)drawGuardianSprite(state.guardian.id,p.x-40,p.y+18,.62);ctx.textAlign='left'
}''')

css += r'''

/* Visual pass v2: live creator + Guardian silhouettes */
.creator-scene{position:absolute;inset:0;overflow:hidden;display:flex;align-items:center;justify-content:flex-end;flex-direction:column;padding-bottom:12px;background:linear-gradient(#7da0b0 0 47%,#7e9a65 47% 67%,#9a8462 67%)}
.creator-scene:before{content:'';position:absolute;left:10%;right:10%;bottom:26%;height:16%;background:#bea67c;clip-path:polygon(0 65%,28% 25%,58% 55%,100% 10%,100% 100%,0 100%);opacity:.9}.creator-scene:after{content:'';position:absolute;width:130px;height:70px;border-radius:50%;background:#6e97a4;right:8%;top:20%;box-shadow:inset 0 0 0 4px rgba(255,255,255,.15)}
.creator-chibi{--skin:#c99170;--hair:#242631;--outfit:#3f6a52;position:relative;width:120px;height:235px;z-index:2;filter:drop-shadow(0 5px 3px rgba(0,0,0,.28))}.creator-chibi.broad{transform:scaleX(1.08)}.creator-chibi.slim{transform:scaleX(.93)}.cc-shadow{position:absolute;left:50%;bottom:5px;width:76px;height:18px;border-radius:50%;background:rgba(0,0,0,.22);transform:translateX(-50%)}.cc-head{position:absolute;left:50%;top:27px;width:74px;height:78px;border-radius:43% 43% 48% 48%;background:var(--skin);transform:translateX(-50%);border:3px solid rgba(50,40,38,.35);z-index:4}.cc-head .eye{position:absolute;top:39px;width:7px;height:10px;border-radius:50%;background:#2b2730;box-shadow:inset 0 2px #fff}.cc-head .eye.l{left:19px}.cc-head .eye.r{right:19px}.cc-head .mouth{position:absolute;left:50%;top:59px;width:12px;height:5px;border-bottom:2px solid #8e6158;border-radius:50%;transform:translateX(-50%)}.cc-hair{position:absolute;left:50%;top:18px;width:82px;height:50px;border-radius:50% 50% 34% 34%;background:var(--hair);transform:translateX(-50%);z-index:5}.cc-hair.long{height:105px}.cc-hair.short{height:42px}.cc-hair.braid:after{content:'';position:absolute;right:2px;top:38px;width:13px;height:88px;border-radius:8px;background:repeating-linear-gradient(to bottom,var(--hair) 0 14px,transparent 14px 19px)}.cc-hair.wave{border-radius:58% 48% 42% 50%}.cc-body{position:absolute;left:50%;top:103px;width:70px;height:78px;border-radius:17px 17px 10px 10px;background:var(--outfit);transform:translateX(-50%);border:3px solid rgba(34,35,42,.35);z-index:3}.cc-body i{position:absolute;left:7px;right:7px;top:7px;bottom:18px;border:2px solid rgba(242,213,153,.46);border-radius:10px}.cc-body b{position:absolute;right:8px;bottom:19px;color:#ffe3a0}.cc-arm{position:absolute;top:113px;width:18px;height:67px;border-radius:10px;background:var(--outfit);z-index:2}.cc-arm.l{left:12px;transform:rotate(7deg)}.cc-arm.r{right:12px;transform:rotate(-7deg)}.cc-leg{position:absolute;top:177px;width:22px;height:42px;background:#30343c}.cc-leg.l{left:34px}.cc-leg.r{right:34px}.cc-boot{position:absolute;top:209px;width:27px;height:19px;border-radius:7px 7px 10px 10px;background:#211f24}.cc-boot.l{left:29px}.cc-boot.r{right:29px}.creator-preview-name{z-index:3;margin-top:-4px;font:900 21px Georgia,serif;text-shadow:0 2px 3px #000}.creator-scene small{z-index:3;color:#f0dfae;letter-spacing:.12em;text-transform:uppercase;font-size:10px}
.guardian-stage{height:70px;display:grid;place-items:center;margin-bottom:4px}.guardian-silhouette{position:relative;width:84px;height:60px;display:block;filter:drop-shadow(0 3px 2px rgba(0,0,0,.3));--main:#777;--light:#bbb}.guardian-silhouette.ember{--main:#c65d45;--light:#f3b16d}.guardian-silhouette.grove{--main:#72915d;--light:#c9d08f}.guardian-silhouette.tide{--main:#5892aa;--light:#b7e0e8}.guardian-silhouette.gale{--main:#a8afd3;--light:#eef1ff}.g-body{position:absolute;width:44px;height:30px;border-radius:50%;background:var(--main);left:20px;top:25px}.g-head{position:absolute;width:31px;height:29px;border-radius:48%;background:var(--main);left:27px;top:9px}.g-ear{position:absolute;background:var(--light);z-index:0}.ember .g-ear,.gale .g-ear{width:10px;height:25px;clip-path:polygon(50% 0,100% 100%,0 100%);top:-2px}.ember .e1,.gale .e1{left:27px}.ember .e2,.gale .e2{right:27px}.gale .g-ear{height:35px}.grove .g-ear,.tide .g-ear{width:12px;height:12px;border-radius:50%;top:6px}.grove .e1,.tide .e1{left:24px}.grove .e2,.tide .e2{right:24px}.g-tail{position:absolute;width:31px;height:18px;border:8px solid var(--light);border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;right:0;top:28px;transform:rotate(15deg)}.grove .g-tail{width:15px;height:15px;border:0;background:var(--light);border-radius:50%;right:8px;top:34px}.gale .g-tail{width:26px;height:13px}.g-mark{position:absolute;left:50%;top:17px;transform:translateX(-50%);font-style:normal;color:#252a31;font-size:13px;z-index:3}
'''

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('Applied visual pass v2')
