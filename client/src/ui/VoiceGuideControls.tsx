import {useVoiceGuide} from '../lib/voice/voiceGuide';
import {ALL_VOICE_IDS,VOICE_LINES} from '../lib/voice/voiceCatalogue';
import {isFeatureOn} from '../engine/features';
export default function VoiceGuideControls(){
 const {enabled,volume,current,error,setEnabled,setVolume,playVoice,stopVoice}=useVoiceGuide();
 const toggle=()=>{const on=!enabled;setEnabled(on);if(on)useVoiceGuide.getState().playVoice('VO061',{once:true})};
 if(!isFeatureOn('voiceguide'))return null;
 return <section aria-label="Voice guide settings" className="mt-4 rounded-lg border border-amber-700 bg-gray-900 p-3">
 <div className="flex items-center justify-between gap-2"><strong className="text-sm">Recorded field guide</strong>
 <button type="button" aria-pressed={enabled} className="rounded bg-amber-700 px-3 py-2 text-sm" onClick={toggle}>{enabled?'Voice ON':'Voice OFF'}</button></div>
 <label htmlFor="voice-volume" className="mt-2 block text-xs">Voice volume: {Math.round(volume*100)}%</label>
 <input id="voice-volume" className="w-full" type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/>
 <p className="text-xs text-gray-300">20 saved MP3s. No ElevenLabs charges during gameplay.</p>
 {current&&<button type="button" onClick={stopVoice} className="mt-2 rounded bg-gray-700 p-2 text-xs">Stop voice</button>}
 {error&&<p role="status" className="text-xs text-red-200">{error}</p>}
 <details className="mt-2 rounded bg-gray-800 p-2"><summary className="cursor-pointer text-sm">Listen to all 20 tracks</summary>
 <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">{ALL_VOICE_IDS.map(id=><div key={id} className="rounded border border-gray-600 p-2">
 <button type="button" disabled={!enabled} aria-label={'Replay '+id} className="rounded bg-gray-700 p-2 text-xs disabled:opacity-50" onClick={()=>playVoice(id,{preview:true})}>▶ {id} · {VOICE_LINES[id].label}</button>
 <p className="mt-1 text-xs text-gray-300">{VOICE_LINES[id].text}</p>
 {!VOICE_LINES[id].automatic&&<p className="text-xs text-amber-200">Manual preview only</p>}</div>)}</div></details>
 </section>
}
