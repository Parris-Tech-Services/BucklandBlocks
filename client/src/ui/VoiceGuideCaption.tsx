import {useVoiceGuide} from '../lib/voice/voiceGuide';
import {VOICE_LINES} from '../lib/voice/voiceCatalogue';
import {isFeatureOn} from '../engine/features';
export default function VoiceGuideCaption(){
 const {enabled,current,error,stopVoice}=useVoiceGuide();
 if(!isFeatureOn('voiceguide')||!enabled||(!current&&!error))return null;
 return <aside aria-live="polite" className="fixed bottom-24 left-3 z-40 max-w-[min(90vw,26rem)] rounded-md border border-amber-300/70 bg-gray-950/95 p-3 text-white shadow-xl pointer-events-auto">
 <div className="flex items-start justify-between gap-2"><div><strong className="text-xs text-amber-200">Field guide {current ? '· '+VOICE_LINES[current].label : ''}</strong>
 {current&&<p className="mt-1 text-sm">{VOICE_LINES[current].text}</p>}
 {error&&<p className="text-xs text-red-200">{error}</p>}</div>
 <button type="button" aria-label="Stop field guide" className="rounded bg-gray-700 p-2 text-xs" onClick={stopVoice}>Stop</button></div></aside>
}
