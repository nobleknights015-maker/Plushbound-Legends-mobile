from pathlib import Path

path = Path('app/src/main/assets/game.js')
data = path.read_text(encoding='utf-8')

old = """function renderStarters(){const grid=$('starterGrid');grid.innerHTML='';D.starters.forEach(s=>{const b=document.createElement('button');b.type='button';b.className='starter-card';b.dataset.id=s.id;b.setAttribute('aria-pressed','false');b.innerHTML=`<span class=\"starter-icon\">${s.icon}</span><strong>${s.name}</strong><small>${s.species}</small><div class=\"starter-stat\"><span>${s.affinity}</span><span>${s.role}</span></div><span class=\"starter-pick\">Tap to choose</span>`;const choose=()=>selectStarter(s.id);b.addEventListener('pointerup',choose);b.addEventListener('click',ev=>{if(ev.detail===0)choose()});grid.appendChild(b)})}
function selectStarter(id){selectedStarter=D.starters.find(s=>s.id===id);if(!selectedStarter)return;document.querySelectorAll('.starter-card').forEach(el=>{const chosen=el.dataset.id===id;el.classList.toggle('selected',chosen);el.setAttribute('aria-pressed',String(chosen));const tag=el.querySelector('.starter-pick');if(tag)tag.textContent=chosen?'Selected ✓':'Tap to choose'});$('starterDetail').classList.remove('hidden');$('starterDetail').innerHTML=`<strong>${selectedStarter.name}</strong> — ${selectedStarter.desc}<br><strong>Skills:</strong> ${selectedStarter.skills.map(x=>x.name).join(' • ')}<br><strong>${selectedStarter.trait}</strong><br><label style=\"display:block;margin-top:9px\">Nickname <input id=\"guardianNickname\" maxlength=\"14\" value=\"${selectedStarter.name}\" style=\"min-height:42px;border-radius:9px;border:1px solid #495362;background:#111821;color:#f5f2e9;padding:8px 10px;font-size:16px\"></label>`;$('beginJourneyBtn').disabled=false}
"""

new = """function renderStarters(){
  const grid=$('starterGrid');
  grid.innerHTML='';
  D.starters.forEach(s=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='starter-card';
    b.dataset.id=s.id;
    b.setAttribute('aria-pressed','false');
    b.innerHTML=`<span class=\"starter-icon\">${s.icon}</span><strong>${s.name}</strong><small>${s.species}</small><div class=\"starter-stat\"><span>${s.affinity}</span><span>${s.role}</span></div><span class=\"starter-pick\">Tap to choose</span>`;
    let touchHandled=false;
    b.addEventListener('touchend',ev=>{
      touchHandled=true;
      ev.preventDefault();
      selectStarter(s.id);
      setTimeout(()=>{touchHandled=false},350);
    },{passive:false});
    b.addEventListener('click',()=>{
      if(touchHandled)return;
      selectStarter(s.id);
    });
    grid.appendChild(b);
  });
}
function selectStarter(id){
  selectedStarter=D.starters.find(s=>s.id===id);
  if(!selectedStarter){toast('That Plush could not be selected.');return;}
  document.querySelectorAll('.starter-card').forEach(el=>{
    const chosen=el.dataset.id===id;
    el.classList.toggle('selected',chosen);
    el.setAttribute('aria-pressed',String(chosen));
    const tag=el.querySelector('.starter-pick');
    if(tag)tag.textContent=chosen?'Selected ✓':'Tap to choose';
  });
  const detail=$('starterDetail');
  detail.classList.remove('hidden');
  detail.innerHTML=`<strong>${selectedStarter.name}</strong> — ${selectedStarter.desc}<br><strong>Skills:</strong> ${selectedStarter.skills.map(x=>x.name).join(' • ')}<br><strong>${selectedStarter.trait}</strong><br><label style=\"display:block;margin-top:9px\">Nickname <input id=\"guardianNickname\" maxlength=\"14\" value=\"${selectedStarter.name}\" style=\"min-height:42px;border-radius:9px;border:1px solid #495362;background:#111821;color:#f5f2e9;padding:8px 10px;font-size:16px\"></label>`;
  const begin=$('beginJourneyBtn');
  begin.disabled=false;
  begin.setAttribute('aria-disabled','false');
  requestAnimationFrame(()=>begin.scrollIntoView({block:'nearest',behavior:'smooth'}));
  toast(`${selectedStarter.name} selected. Tap Begin Journey to continue.`,1800);
}
"""

if old not in data:
    raise SystemExit('starter selection block not found')

data = data.replace(old, new)

old_binding = "$('starterBack').addEventListener('click',()=>showScreen('creatorScreen'));$('beginJourneyBtn').addEventListener('click',beginJourney);"
new_binding = "$('starterBack').addEventListener('click',()=>showScreen('creatorScreen'));const beginJourneyButton=$('beginJourneyBtn');beginJourneyButton.addEventListener('click',beginJourney);beginJourneyButton.addEventListener('touchend',ev=>{if(beginJourneyButton.disabled)return;ev.preventDefault();beginJourney();},{passive:false});"

if old_binding not in data:
    raise SystemExit('begin journey binding not found')

data = data.replace(old_binding, new_binding)
path.write_text(data, encoding='utf-8')
print('Patched Guardian selection for Android WebView touch input')
