import {create} from 'zustand';
import {VOICE_LINES,VOICE_SRC,ALL_VOICE_IDS,type VoiceId} from './voiceCatalogue';
type Options={once?:boolean;preview?:boolean};
type VoiceState={enabled:boolean;volume:number;current:VoiceId|null;error:string|null;setEnabled:(v:boolean)=>void;setVolume:(v:number)=>void;playVoice:(id:VoiceId,options?:Options)=>boolean;stopVoice:()=>void};
const key='buckland_voice_settings_v1';
const prefs=(()=>{try{if(typeof localStorage==='undefined')return {enabled:false,volume:.75};const v=JSON.parse(localStorage.getItem(key)||'{}');return{enabled:v.enabled===true,volume:Number.isFinite(v.volume)?Math.max(0,Math.min(1,v.volume)):.75}}catch{return{enabled:false,volume:.75}}})();
const persist=(enabled:boolean,volume:number)=>{try{localStorage.setItem(key,JSON.stringify({enabled,volume}))}catch{/*optional*/}};
let active:HTMLAudioElement|null=null,token=0;
const played=new Set<VoiceId>();let waiting:{id:VoiceId;once:boolean}[]=[];
export const useVoiceGuide=create<VoiceState>((set,get)=>({
 enabled:prefs.enabled,volume:prefs.volume,current:null,error:null,
 stopVoice:()=>{token++;waiting=[];if(active){active.onended=null;active.onerror=null;active.pause();active=null}set({current:null})},
 setEnabled:enabled=>{if(!enabled)get().stopVoice();set({enabled,error:null});persist(enabled,get().volume)},
 setVolume:volume=>{const v=Math.max(0,Math.min(1,volume));if(active)active.volume=v;set({volume:v});persist(get().enabled,v)},
 playVoice:(id,options={})=>{
  if(!get().enabled||!ALL_VOICE_IDS.includes(id))return false;
  const once=options.once===true;
  if(once&&(played.has(id)||waiting.some(x=>x.id===id)))return false;
  if(active&&!options.preview){if(waiting.length>=3)return false;waiting.push({id,once});return true}
  if(active)get().stopVoice();
  const mine=++token;
  let player:HTMLAudioElement;
  try{player=new Audio(VOICE_SRC(id))}catch{set({error:'Recording cannot start on this device.'});return false}
  active=player;player.preload='auto';player.volume=get().volume;set({current:id,error:null});
  const done=()=>{if(mine!==token)return;if(active===player)active=null;set({current:null});const next=waiting.shift();if(next&&get().enabled)get().playVoice(next.id,{once:next.once})};
  const fail=()=>{if(mine!==token)return;if(once)played.delete(id);set({error:'Recording could not play. Try the voice library.'});done()};
  player.onended=done;player.onerror=fail;
  if(once)played.add(id);
  try{Promise.resolve(player.play()).catch(fail)}catch{fail();return false}
  return true;
 }
}));
export const emitVoiceEvent=(id:VoiceId)=>VOICE_LINES[id].automatic?useVoiceGuide.getState().playVoice(id,{once:true}):false;
