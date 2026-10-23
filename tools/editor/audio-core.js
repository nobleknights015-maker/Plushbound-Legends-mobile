const AUDIO_TYPES=new Set(['bgm','bgs','me','se']);
export function audioEntries(manifest={}){return (manifest.entries||[]).filter(entry=>AUDIO_TYPES.has(String(entry?.type||'').toLowerCase())).map(entry=>({...entry,type:String(entry.type).toLowerCase()}));}
export function audioStatus(entry={}){return String(entry.status||'planned').toLowerCase();}
export function audioPlayable(entry={}){return audioStatus(entry)==='ready'&&!!String(entry.path||'').trim();}
export function audioCommand(entry={}){const type=String(entry.type||'').toUpperCase();if(!AUDIO_TYPES.has(String(entry.type||'').toLowerCase()))return null;return {code:type,parameters:[String(entry.id||''),{}]};}
export function filterAudio(entries=[],{query='',type='',status=''}={}){const q=String(query).trim().toLowerCase();return entries.filter(entry=>(!type||entry.type===type)&&(!status||audioStatus(entry)===status)&&(!q||`${entry.id||''} ${entry.path||''} ${entry.type||''} ${entry.status||''}`.toLowerCase().includes(q)));}
