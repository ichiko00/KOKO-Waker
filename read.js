import {branchOptions} from './branches.js';
export function read(request={}){
// Read-only adapter for the existing, locally paired TT/ST debugging bridge.
const c = globalThis.SillyTavern?.getContext?.();
if (!c) throw new Error('未找到酒馆聊天接口');
const chatId = String(c.getCurrentChatId?.() || '');
const binding = chatId ? JSON.stringify([c.groupId ?? null, c.characterId ?? null, chatId]) : '';
const streaming = !!c.streamingProcessor && !c.streamingProcessor.isFinished;
let index = (c.chat || []).length - 1;
while (index >= 0 && (c.chat[index].is_user || c.chat[index].is_system)) index--;
let raw = index >= 0 ? String(c.chat[index].mes || '') : '';
const filterSource = streaming ? '' : raw.slice(0, 200000);
const branches=streaming?[]:branchOptions(raw);
let voiceHash=2166136261;for(const char of raw)voiceHash=Math.imul(voiceHash^char.codePointAt(0),16777619);
let voice={available:false,phase:'idle',message:'小手机未启用或尚未完成加载，请在 TT 启用 MyPhone',id:-1};
try {const frame=document.querySelector('#myphone-panel iframe');if(frame&&globalThis.__myPhoneAppPanelBridge){const api=globalThis.__myPhoneAppPanelBridge.connect(frame.contentWindow),s=api.status();voice={available:true,phase:s.phase,message:String(s.message||''),id:api.currentDialogue().id};}else if(globalThis.__myPhoneAppPanelBridge&&document.querySelector('#myphone-wand-entry, #myphone-open')){voice={available:true,phase:'idle',message:'点击播放将打开小手机并开始朗读',id:-1};}}catch(e){voice.message='小手机接口未就绪：'+e.message;}
// Do not show unfinished reasoning or execute generated HTML/scripts.
raw = raw.replace(/<(think|thinking|analysis|blend)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
  .replace(/<!--[\s\S]*?(?:-->|$)/g, '');
const content = raw.match(/<content\b[^>]*>([\s\S]*?)<\/content\s*>/i);
if (content) raw = content[1];
raw = raw.replace(/<(branches|script|style|iframe|svg|tts|phone|details)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
  .replace(/```[\s\S]*?(?:```|$)/g, '')
  .replace(/<(?:img|link|source|video|audio|object|embed)\b[^>]*>/gi, '')
  .replace(/<\/?(?:p|div|br|section|h[1-6]|li)\b[^>]*>/gi, '\n');
const doc = new DOMParser().parseFromString(raw, 'text/html');
doc.querySelectorAll('script,style,iframe,object,embed,template').forEach(e => e.remove());
const text = (doc.body.textContent || '').replace(/\n[ \t]*\n(?:[ \t]*\n)+/g, '\n\n').trim().slice(0, 30000);
return {binding, title: chatId, character: String(c.name2 || '当前角色'), streaming, filterSource,
  messageId: index, text: streaming ? '' : text, hasChat: !!binding,voice,voiceVersion:String(voiceHash>>>0),branches};

}
