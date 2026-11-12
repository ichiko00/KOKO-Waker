import {generationState} from './generation.js';
import {branchOptions} from './branches.js';
export function send(request={}){

const c = globalThis.SillyTavern?.getContext?.();
if (!c) throw new Error('酒馆未就绪');
const id = String(c.getCurrentChatId?.() || '');
const binding = id ? JSON.stringify([c.groupId ?? null, c.characterId ?? null, id]) : '';
if (!binding || binding !== request.binding) throw new Error('酒馆已切换聊天，请确认新聊天后再发送');
if (generationState(c).generating) throw new Error('酒馆正在生成，请稍后再发');
if(request.branch){
 const b=request.branch,id=Number(b.messageId);let latest=(c.chat||[]).length-1;
 while(latest>=0&&c.chat[latest].is_system)latest--;
 if(latest!==id||!c.chat[id]||c.chat[id].is_user)throw Error('剧情选项已过期，请等待最新正文');
 const raw=String(c.chat[id].mes||'');let hash=2166136261;for(const char of raw)hash=Math.imul(hash^char.codePointAt(0),16777619);
 if(String(hash>>>0)!==b.version)throw Error('正文已变化，请重新选择剧情');
 const options=branchOptions(raw);if(!Number.isInteger(b.index)||!options[b.index])throw Error('剧情选项不存在');
 request={...request,text:options[b.index]};
}
const input = document.querySelector('#send_textarea');
const send = document.querySelector('#send_but');
if (!input || !send || send.disabled || send.getAttribute('aria-disabled') === 'true') throw new Error('酒馆发送按钮不可用');
if (String(input.value || '').trim()) throw new Error('酒馆输入框已有草稿，请先处理草稿');
if (!request.text || request.text.length > 8000) throw new Error('消息为空或超过 8000 字');
input.value = request.text;
input.dispatchEvent(new Event('input', {bubbles: true}));
send.click();
// The explicit choice advances the story: stop old narration only after handing off the message.
if(request.branch){try{const frame=document.querySelector('#myphone-panel iframe');if(frame&&globalThis.__myPhoneAppPanelBridge)globalThis.__myPhoneAppPanelBridge.connect(frame.contentWindow).stop();}catch{}}
return {accepted: true};

}
