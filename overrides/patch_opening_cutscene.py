from pathlib import Path

path = Path('app/src/main/assets/game.js')
data = path.read_text(encoding='utf-8')

old = "function beginJourney(){if(!selectedStarter)return;const nickname=($('guardianNickname')?.value||selectedStarter.name).trim().slice(0,14)||selectedStarter.name;state.guardian={...selectedStarter,nickname,hp:selectedStarter.maxHp};state.created=true;state.quest={id:'first_thread',stage:1,title:'Meet the wandering protector'};saveGame();enterWorld();toast(`${nickname} formed a First Thread bond with ${state.player.name}.`,3200)}"
new = r'''function beginJourney(){
  if(!selectedStarter)return;
  const nickname=($('guardianNickname')?.value||selectedStarter.name).trim().slice(0,14)||selectedStarter.name;
  state.guardian={...selectedStarter,nickname,hp:selectedStarter.maxHp};
  state.created=true;
  state.quest={id:'first_thread',stage:1,title:'Meet the wandering protector'};
  state.flags=state.flags||{};
  state.flags.openingSeen=true;
  saveGame();
  enterWorld();
  runOpeningCutscene();
}

function finishOpeningCutscene(){
  closeDialogue();
  updateHud();
  saveGame();
  toast('Objective: Speak with Kazen Ryujin',2600);
}

function runOpeningCutscene(){
  target=null;
  const scenes=[
    ['Sunny Plains of Elyndor','Morning light rolls across the grasslands as old Waystitch threads hum beneath the road. For a moment, the whole plain feels as though it is holding its breath.'],
    [state.player.name,`${state.guardian.nickname} stays close at your side. The First Thread between you is new, but its pull already feels strangely familiar.`],
    ['???','A faint pulse travels through the eastern Waystitch. Loose strands of light flicker above the path, then vanish into the wind.'],
    ['Kazen Ryujin','Hono felt that too. If your Guardian reacted, then whatever is fraying out there is already tugging at your bond.'],
    ['Sunny Plains of Elyndor','A wandering protector waits ahead with an ember-fox Guardian at his side. Beyond him, something restless stirs near the eastern path.']
  ];
  let index=0;
  const showNext=()=>{
    if(index>=scenes.length){finishOpeningCutscene();return;}
    const scene=scenes[index++];
    const finalScene=index>=scenes.length;
    dialogue(scene[0],scene[1],[
      {t:finalScene?'Begin':'Continue',a:showNext},
      {t:'Skip Intro',a:finishOpeningCutscene}
    ]);
  };
  showNext();
}
'''

if old not in data:
    raise SystemExit('beginJourney anchor not found for opening cutscene patch')

data = data.replace(old, new, 1)
path.write_text(data, encoding='utf-8')
print('Added syntax-safe opening Elyndor cutscene after First Thread bonding')
