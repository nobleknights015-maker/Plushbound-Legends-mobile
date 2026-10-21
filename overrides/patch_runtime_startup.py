from pathlib import Path

path = Path('app/src/main/assets/game.js')
data = path.read_text(encoding='utf-8')

# Fix creator preview regression: escapeHtml is not defined in the current runtime.
old = "p.innerHTML=`<div class=\"mv-preview-stage\"><div class=\"mv-preview-name\">${escapeHtml(v.name)}</div><div class=\"mv-preview-sub\">Threadbound Adventurer</div></div>`;"
new = "p.innerHTML=`<div class=\"mv-preview-stage\"><div class=\"mv-preview-name\"></div><div class=\"mv-preview-sub\">Threadbound Adventurer</div></div>`;p.querySelector('.mv-preview-name').textContent=v.name;"
if old in data:
    data = data.replace(old, new, 1)
    print('Removed undefined escapeHtml dependency from creator preview')
else:
    print('Creator preview escapeHtml dependency already absent')

# Ensure the starter renderer exists. Some compatibility passes preserved the call
# to renderStarters() while dropping the original function body.
if 'function renderStarters()' not in data:
    anchor = 'function selectStarter(id){'
    if anchor not in data:
        raise SystemExit('selectStarter anchor not found')
    renderer = '''function renderStarters(){
  const grid=$('starterGrid');
  if(!grid)return;
  grid.innerHTML='';
  D.starters.forEach(s=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='starter-card';
    b.dataset.id=s.id;
    b.setAttribute('aria-pressed','false');
    b.innerHTML=`<span class="starter-icon">${s.icon}</span><strong>${s.name}</strong><small>${s.species}</small><div class="starter-stat"><span>${s.affinity}</span><span>${s.role}</span></div><span class="starter-pick">Tap to choose</span>`;
    let touchHandled=false;
    b.addEventListener('touchend',ev=>{
      touchHandled=true;
      ev.preventDefault();
      selectStarter(s.id);
      setTimeout(()=>{touchHandled=false},350);
    },{passive:false});
    b.addEventListener('click',()=>{if(!touchHandled)selectStarter(s.id)});
    grid.appendChild(b);
  });
}
'''
    data = data.replace(anchor, renderer + anchor, 1)
    print('Restored renderStarters runtime function')
else:
    print('renderStarters already present')

path.write_text(data, encoding='utf-8')
