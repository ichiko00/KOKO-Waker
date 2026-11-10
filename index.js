import {start} from './panel.js';
import {read} from './read.js';
import {send} from './send.js';
import {voice} from './voice.js';

let cleanup=null;
export function enable(){
    if(cleanup)return;
    cleanup=start({port:17864,clientToken:''},window.fetch.bind(window),{read,send,voice});
}
export function disable(){if(cleanup){cleanup();cleanup=null;}}
export const dispose=disable;
// ST loads enabled extensions as modules; TT additionally calls lifecycle hooks.
enable();
