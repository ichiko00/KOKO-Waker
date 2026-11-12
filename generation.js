let source=null,types=null,binding='',active=false,ended=false;
const listeners=[];
function key(c){return JSON.stringify([c?.groupId??null,c?.characterId??null,c?.getCurrentChatId?.()||'']);}
export function disposeGeneration(){for(const [name,fn] of listeners)source?.removeListener?.(name,fn);listeners.length=0;source=null;types=null;binding='';active=false;ended=false;}
export function observeGeneration(c=globalThis.SillyTavern?.getContext?.()){
 const next=c?.eventSource,t=c?.eventTypes||c?.event_types;
 if(next&&(next!==source||t!==types)){disposeGeneration();source=next;types=t;
  const on=(name,fn)=>{if(types?.[name]){source.on(types[name],fn);listeners.push([types[name],fn]);}};
  on('GENERATION_STARTED',(type,options,dryRun)=>{if(dryRun===true)return;binding=key(globalThis.SillyTavern?.getContext?.());active=true;ended=false;});
  for(const name of ['GENERATION_ENDED','GENERATION_STOPPED'])on(name,()=>{active=false;ended=true;});
  on('CHAT_CHANGED',()=>{active=false;ended=false;binding='';});
 }
 if(binding&&binding!==key(c)){active=false;ended=false;binding='';}
}
export function generationState(c=globalThis.SillyTavern?.getContext?.()){
 observeGeneration(c);
 const streaming=!!c?.streamingProcessor&&!c.streamingProcessor.isFinished;
 const stop=globalThis.document?.querySelector?.('#mes_stop');
 const stopVisible=!!stop&&!stop.hidden&&getComputedStyle(stop).display!=='none'&&getComputedStyle(stop).visibility!=='hidden'&&stop.getClientRects().length>0;
 return {generating:active||(!ended&&(streaming||stopVisible)),streaming:streaming&&!ended};
}
