from pathlib import Path
import re

js_path = Path('app/src/main/assets/game.js')
css_path = Path('app/src/main/assets/style.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

creator_new = r'''function updateCreatorPreview(){
  const v=creatorValues();
  const p=$('avatarPreview');
  const hair=colors.hair[v.hairColor]||'#2a2630';
  const skin=colors.skin[v.skin]||'#c99170';
  const outfit=colors.palette[v.palette]||'#3f6a52';
  const bodyClass=v.build==='broad'?'broad':v.build==='slim'?'slim':'balanced';
  const hairClass=v.hair==='long'?'long':v.hair==='braid'?'braid':v.hair==='spike'?'spike':'wave';
  p.innerHTML=`<div class="mv-preview-stage">
    <div class="mv-chibi ${bodyClass}" style="--skin:${skin};--hair:${hair};--outfit:${outfit}">
      <div class="mv-shadow"></div>
      <div class="mv-leg leg-l"></div><div class="mv-leg leg-r"></div>
      <div class="mv-boot boot-l"></div><div class="mv-boot boot-r"></div>
      <div class="mv-body"><div class="mv-vest"></div><div class="mv-belt"></div><div class="mv-charm">✦</div></div>
      <div class="mv-arm arm-l"></div><div class="mv-arm arm-r"></div>
      <div class="mv-head"><div class="mv-ear ear-l"></div><div class="mv-ear ear-r"></div><div class="mv-eye eye-l"></div><div class="mv-eye eye-r"></div><div class="mv-mouth"></div></div>
      <div class="mv-hair ${hairClass}"><span class="lock a"></span><span class="lock b"></span><span class="lock c"></span></div>
      <div class="mv-thread-badge"></div>
    </div>
    <div class="mv-preview-name">${escapeHtml(v.name)}</div>
    <div class="mv-preview-sub">Threadbound Adventurer</div>
  </div>`;
}'''

js, n = re.subn(r"function updateCreatorPreview\(\)\{.*?\n\}", creator_new, js, count=1, flags=re.S)
if n != 1:
    raise SystemExit('updateCreatorPreview block not found')

insert_before = "function drawNpc(n){"
helpers = r'''function drawChibi(x,y,skin,hair,outfit,accent='#dfc27a',scale=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,20,18,7,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a2630';ctx.fillRect(-13,4,10,18);ctx.fillRect(3,4,10,18);
  ctx.fillStyle=outfit;roundRect(-19,-20,38,32,9);ctx.fill();
  ctx.fillStyle=accent;ctx.fillRect(-18,-5,36,4);ctx.fillRect(-3,-20,6,31);
  ctx.fillStyle=outfit;roundRect(-27,-17,9,24,5);ctx.fill();roundRect(18,-17,9,24,5);ctx.fill();
  ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,-36,19,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,-42,20,Math.PI,Math.PI*2);ctx.lineTo(19,-34);ctx.quadraticCurveTo(6,-40,0,-31);ctx.quadraticCurveTo(-8,-41,-19,-34);ctx.closePath();ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-7,-36,2.2,0,Math.PI*2);ctx.arc(7,-36,2.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#7c4d3a';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-30,5,.3*Math.PI,.7*Math.PI);ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.strokeRect(-17,-18,34,28);
  ctx.restore();
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function drawHono(x,y){ctx.save();ctx.translate(x,y);ctx.fillStyle='#c65d45';ctx.beginPath();ctx.ellipse(0,0,14,11,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-10,-8);ctx.lineTo(-6,-18);ctx.lineTo(-1,-7);ctx.fill();ctx.beginPath();ctx.moveTo(10,-8);ctx.lineTo(6,-18);ctx.lineTo(1,-7);ctx.fill();ctx.fillStyle='#f2d6b4';ctx.beginPath();ctx.ellipse(0,3,6,5,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#2a2020';ctx.beginPath();ctx.arc(-4,-1,1.5,0,Math.PI*2);ctx.arc(4,-1,1.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f0a26d';ctx.lineWidth=3;ctx.beginPath();ctx.arc(13,2,10,-.7,.9);ctx.stroke();ctx.restore();}
function setDialoguePortrait(name){
  const el=$('dialoguePortrait');
  const kazen=name==='Kazen Ryujin';
  const lio=name==='Lio';
  el.innerHTML=`<div class="dialogue-chibi ${kazen?'kazen':lio?'lio':'default'}"><div class="d-hair"></div><div class="d-face"><i></i><i></i></div><div class="d-body"></div>${kazen?'<span class="hono-mark">✦</span>':''}</div>`;
}
'''
js = js.replace(insert_before, helpers + insert_before, 1)

npc_new = r'''function drawNpc(n){
  if(n.id==='kazen'){
    drawChibi(n.x,n.y,'#c99a7a','#2c2a34','#34353f','#d06a4a',1.02);
    drawHono(n.x+38,n.y+12);
  }else{
    drawChibi(n.x,n.y,'#d8b08d','#6b513c','#48606c','#d4b770',.96);
  }
  ctx.fillStyle='#f5f2e9';ctx.font='700 15px system-ui';ctx.textAlign='center';ctx.fillText(n.name,n.x,n.y-72);ctx.textAlign='left';
}'''
js, n = re.subn(r"function drawNpc\(n\)\{.*?\n\}", npc_new, js, count=1, flags=re.S)
if n != 1:
    raise SystemExit('drawNpc block not found')

player_new = r'''function drawPlayer(){
  const p=state.player;
  const skin=colors.skin[p.skin]||'#c99170',hair=colors.hair[p.hairColor]||'#242631',outfit=colors.palette[p.palette]||'#3f6a52';
  drawChibi(p.x,p.y,skin,hair,outfit,'#dfb96a',p.build==='broad'?1.08:p.build==='slim'?.94:1);
  ctx.fillStyle='#f5f2e9';ctx.font='700 14px system-ui';ctx.textAlign='center';ctx.fillText(state.player.name,p.x,p.y-74);
  if(state.guardian){ctx.fillStyle=affinityColor(state.guardian.id);ctx.beginPath();ctx.arc(p.x-34,p.y+14,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#11151c';ctx.font='14px system-ui';ctx.fillText(state.guardian.icon,p.x-34,p.y+19)}ctx.textAlign='left';
}'''
js, n = re.subn(r"function drawPlayer\(\)\{.*?\n\}", player_new, js, count=1, flags=re.S)
if n != 1:
    raise SystemExit('drawPlayer block not found')

js = js.replace("function dialogue(name,text,choices=[]){$('dialogueName').textContent=name;$('dialoguePortrait').textContent=name.charAt(0);", "function dialogue(name,text,choices=[]){$('dialogueName').textContent=name;setDialoguePortrait(name);", 1)

css += r'''

/* In-game original MV-era-inspired character baseline */
.avatar-preview{background:linear-gradient(#6f96aa 0 52%,#8da36e 52% 68%,#7c6a52 68%);border:2px solid #6d5c3d;box-shadow:inset 0 0 0 3px rgba(242,211,141,.15)}
.mv-preview-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;padding-top:4px;background:radial-gradient(circle at 50% 30%,rgba(255,255,255,.18),transparent 48%)}
.mv-chibi{position:relative;width:130px;height:250px;transform:scale(.95);transform-origin:center bottom}.mv-shadow{position:absolute;left:50%;bottom:8px;width:86px;height:20px;border-radius:50%;background:rgba(0,0,0,.24);transform:translateX(-50%)}
.mv-head{position:absolute;left:50%;top:34px;width:82px;height:88px;border-radius:44% 44% 48% 48%;background:var(--skin);transform:translateX(-50%);border:3px solid rgba(49,37,37,.38);z-index:4}.mv-ear{position:absolute;top:37px;width:13px;height:20px;border-radius:50%;background:var(--skin)}.ear-l{left:-7px}.ear-r{right:-7px}.mv-eye{position:absolute;top:42px;width:7px;height:11px;border-radius:50%;background:#33272b;box-shadow:inset 0 2px #fff}.eye-l{left:21px}.eye-r{right:21px}.mv-mouth{position:absolute;left:50%;top:63px;width:13px;height:6px;border-bottom:2px solid #8f5f55;border-radius:50%;transform:translateX(-50%)}
.mv-hair{position:absolute;left:50%;top:25px;width:91px;height:56px;border-radius:48% 48% 36% 36%;background:var(--hair);transform:translateX(-50%);z-index:5}.mv-hair.long{height:110px}.mv-hair.braid:after{content:'';position:absolute;right:4px;top:43px;width:14px;height:95px;border-radius:9px;background:linear-gradient(var(--hair) 0 16%,transparent 16% 22%,var(--hair) 22% 38%,transparent 38% 44%,var(--hair) 44% 61%,transparent 61% 67%,var(--hair) 67%)}.mv-hair.spike{clip-path:polygon(5% 55%,0 18%,20% 27%,29% 0,42% 21%,58% 2%,66% 24%,91% 12%,84% 44%,100% 56%,74% 74%,26% 75%)}.mv-hair.wave{border-radius:60% 48% 44% 50%}.mv-hair .lock{position:absolute;width:18px;height:35px;background:var(--hair);border-radius:50%}.mv-hair .a{left:17px;top:31px;transform:rotate(18deg)}.mv-hair .b{left:38px;top:35px}.mv-hair .c{right:15px;top:30px;transform:rotate(-20deg)}
.mv-body{position:absolute;left:50%;top:111px;width:76px;height:86px;border-radius:20px 20px 12px 12px;background:var(--outfit);transform:translateX(-50%);border:3px solid rgba(39,39,45,.4);z-index:3}.mv-chibi.broad .mv-body{width:88px}.mv-chibi.slim .mv-body{width:68px}.mv-vest{position:absolute;left:8px;right:8px;top:8px;bottom:22px;border:2px solid rgba(240,214,159,.48);border-radius:12px}.mv-belt{position:absolute;left:0;right:0;bottom:18px;height:8px;background:#4c342b;border-top:2px solid #d3aa60;border-bottom:2px solid #d3aa60}.mv-charm{position:absolute;right:10px;bottom:23px;color:#ffe39a;font-size:16px}.mv-arm{position:absolute;top:122px;width:20px;height:74px;border-radius:11px;background:var(--outfit);z-index:2;border:2px solid rgba(39,39,45,.35)}.arm-l{left:13px;transform:rotate(7deg)}.arm-r{right:13px;transform:rotate(-7deg)}.mv-leg{position:absolute;top:188px;width:24px;height:46px;background:#2d3038;border-radius:6px;z-index:1}.leg-l{left:38px}.leg-r{right:38px}.mv-boot{position:absolute;top:224px;width:30px;height:20px;background:#241f24;border-radius:9px 9px 12px 12px;z-index:2}.boot-l{left:32px}.boot-r{right:32px}.mv-thread-badge{position:absolute;left:50%;top:133px;width:14px;height:14px;border:2px solid #f0cf87;border-radius:50%;transform:translateX(-50%);z-index:6;box-shadow:0 0 0 3px rgba(240,207,135,.18)}.mv-preview-name{margin-top:-12px;font-weight:900;font-family:Georgia,serif;font-size:22px;text-shadow:0 2px 4px #000}.mv-preview-sub{font-size:11px;color:#efe0b4;text-transform:uppercase;letter-spacing:.13em}
.portrait{overflow:hidden;background:linear-gradient(#445267,#27313e);border:2px solid #7b6744}.dialogue-chibi{position:relative;width:100%;height:100%;--skin:#d1a17f;--hair:#4a3a35;--coat:#58677a}.dialogue-chibi.kazen{--skin:#c99a7a;--hair:#2c2a34;--coat:#3a3b46}.dialogue-chibi.lio{--skin:#d8b08d;--hair:#6b513c;--coat:#48606c}.d-face{position:absolute;left:50%;top:19px;width:52px;height:56px;border-radius:45%;background:var(--skin);transform:translateX(-50%);border:2px solid rgba(0,0,0,.3)}.d-face i{position:absolute;top:28px;width:5px;height:8px;border-radius:50%;background:#2b2730}.d-face i:first-child{left:13px}.d-face i:last-child{right:13px}.d-hair{position:absolute;left:50%;top:11px;width:60px;height:34px;border-radius:50% 50% 35% 35%;background:var(--hair);transform:translateX(-50%);z-index:2}.d-body{position:absolute;left:50%;bottom:-15px;width:78px;height:56px;border-radius:20px 20px 0 0;background:var(--coat);transform:translateX(-50%);border:2px solid rgba(0,0,0,.3)}.hono-mark{position:absolute;right:5px;bottom:5px;color:#f09a63;font-size:21px;text-shadow:0 1px #000}
'''

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('Applied in-game MV-inspired character creator and NPC visual baseline')
