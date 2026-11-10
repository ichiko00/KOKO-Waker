export function branchOptions(raw){
 const clean=String(raw||'').replace(/<(think|thinking|analysis|blend)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi,'').replace(/<!--[\s\S]*?(?:-->|$)/g,'').replace(/```[\s\S]*?(?:```|$)/g,'');
 const blocks=[...clean.matchAll(/<branches\b[^>]*>([\s\S]*?)<\/branches\s*>/gi)];const options=[];
 for(const block of blocks){
  const doc=new DOMParser().parseFromString(block[1].replace(/<\/?(?:br|p|div|li|option)\b[^>]*>/gi,'\n'),'text/html');
  doc.querySelectorAll('summary,script,style,iframe,svg').forEach(e=>e.remove());
  const lines=(doc.body.textContent||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);let current='';
  const push=()=>{if(current&&current.length<=8000&&options.length<12)options.push(current);current='';};
  for(const line of lines){if(/^(?:\*\*)?(?:[A-ZＡ-Ｚ]|\d{1,2})[.．、:：)）]\s*/i.test(line)){push();current=line.replace(/\*\*/g,'');}else if(current){current+='\n'+line;}else if(lines.every(s=>! /^(?:\*\*)?(?:[A-ZＡ-Ｚ]|\d{1,2})[.．、:：)）]/i.test(s))){current=line;push();}}
  push();
 }return options;
}
