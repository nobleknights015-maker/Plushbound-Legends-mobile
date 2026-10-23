export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

function pagesOf(event){
  if(!event||typeof event!=='object')throw new Error('A valid event is required');
  if(!Array.isArray(event.pages))event.pages=[];
  return event.pages;
}

function pageAt(event,pageIndex){
  const pages=pagesOf(event),index=Number(pageIndex);
  if(!Number.isInteger(index)||index<0||index>=pages.length)throw new Error(`Unknown page: ${Number(pageIndex)+1}`);
  return {pages,index,page:pages[index]};
}

export function duplicateEventPage(event,pageIndex,{insertIndex}={}){
  const {pages,index,page}=pageAt(event,pageIndex);
  const target=insertIndex===undefined?index+1:Math.max(0,Math.min(pages.length,Math.floor(Number(insertIndex)||0)));
  const copy=clone(page);
  pages.splice(target,0,copy);
  return {page:copy,index:target};
}

export function moveEventPage(event,pageIndex,targetIndex){
  const {pages,index,page}=pageAt(event,pageIndex);
  const target=Math.max(0,Math.min(pages.length-1,Math.floor(Number(targetIndex)||0)));
  if(target===index)return {page,index};
  pages.splice(index,1);
  pages.splice(target,0,page);
  return {page,index:target};
}

export function moveEventPageBy(event,pageIndex,delta){
  return moveEventPage(event,pageIndex,Number(pageIndex)+Number(delta||0));
}

export function removeEventPage(event,pageIndex,{allowEmpty=false}={}){
  const {pages,index}=pageAt(event,pageIndex);
  if(!allowEmpty&&pages.length<=1)throw new Error('An event must keep at least one page');
  return {page:pages.splice(index,1)[0],index};
}
