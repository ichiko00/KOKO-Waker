export function send(request={}){

const c = globalThis.SillyTavern?.getContext?.();
if (!c) throw new Error('酒馆未就绪');
const id = String(c.getCurrentChatId?.() || '');
const binding = id ? JSON.stringify([c.groupId ?? null, c.characterId ?? null, id]) : '';
if (!binding || binding !== request.binding) throw new Error('酒馆已切换聊天，请确认新聊天后再发送');
if (c.streamingProcessor && !c.streamingProcessor.isFinished) throw new Error('酒馆正在生成，请稍后再发');
const input = document.querySelector('#send_textarea');
const send = document.querySelector('#send_but');
if (!input || !send || send.disabled || send.getAttribute('aria-disabled') === 'true') throw new Error('酒馆发送按钮不可用');
if (String(input.value || '').trim()) throw new Error('酒馆输入框已有草稿，请先处理草稿');
if (!request.text || request.text.length > 8000) throw new Error('消息为空或超过 8000 字');
input.value = request.text;
input.dispatchEvent(new Event('input', {bubbles: true}));
send.click();
return {accepted: true};

}
