export function voice(request={}){
// Uses the existing MyPhone player and its configured voice API. Never reads API keys.

const c = globalThis.SillyTavern?.getContext?.();
if (!c) throw Error('未找到酒馆聊天接口');
const chatId = String(c.getCurrentChatId?.() || '');
const binding = chatId ? JSON.stringify([c.groupId ?? null,c.characterId ?? null,chatId]) : '';
if (!binding || binding !== request.binding) throw Error('聊天已切换，请等待桌宠同步');
if (!globalThis.__myPhoneAppPanelBridge) throw Error('小手机未启用或尚未完成加载，请在 TT 启用 MyPhone 后重试');
let frame = document.querySelector('#myphone-panel iframe');
if (!frame && request.action === 'play') {
  const opener=document.querySelector('#myphone-wand-entry, #myphone-open');
  if(opener)opener.click();
  frame=document.querySelector('#myphone-panel iframe');
}
if (!frame) throw Error('小手机面板未就绪，请在 TT 打开小手机后重试');
const api = globalThis.__myPhoneAppPanelBridge.connect(frame.contentWindow);
const status = api.status();
const id = Number(request.messageId), message = c.chat?.[id];
if (!message || message.is_user || message.is_system) throw Error('正文已变化，请等待同步');
let hash = 2166136261;for (const char of String(message.mes || '')) hash = Math.imul(hash ^ char.codePointAt(0),16777619);
if (String(hash >>> 0) !== request.version) throw Error('正文已变化，请等待同步');
const running = ['playing','generating','paused','waiting'].includes(status.phase);
if (request.action === 'play') {
  if (c.streamingProcessor && !c.streamingProcessor.isFinished) throw Error('正文正在生成，请等待完成');
  if (running) throw Error('小手机已有播放任务，请先暂停或退出');
  const settings = api.getState();
  if (!settings.narration?.enabled) throw Error('请在小手机设置中开启「整篇朗读」');
  if (settings.narration.voice !== 'role') throw Error('请将小手机「整篇朗读」的旁白设为角色配音，以使用语音 API');
  api.play(id);
} else if (request.action === 'toggle' || request.action === 'stop') {
  if (api.currentDialogue().id !== id) throw Error('小手机正在播放其他楼层，请在小手机控制');
  if (request.action === 'stop') api.stop();
  else if (['playing','generating','paused'].includes(status.phase)) api.toggle();
  else throw Error(status.phase === 'waiting' ? '请在小手机中为角色选择音色' : '播放状态已变化，请稍后重试');
} else throw Error('不支持的播放操作');
return {accepted:true};

}
