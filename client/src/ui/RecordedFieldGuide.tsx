import { useEffect, useRef, useState } from 'react';

// These transcripts are copied from the owner's approved VO061/VO068/VO069
// ElevenLabs manifest. An offer appears only at its actual game event.
const lines = {
  VO061: { label: 'Hear welcome guide', text: 'Welcome to Buckland Blocks. There is no hurry. Take a look around, find your bearings, and choose what to build first.' },
  VO068: { label: 'Hear saved-world confirmation', text: 'World saved. Your changes will be here when you return.' },
  VO069: { label: 'Hear save warning', text: 'The save has not been confirmed. Check the message on screen before leaving.' },
} as const;

export type BucklandGuideId = keyof typeof lines;
export default function RecordedFieldGuide({clipId, enabled}:{clipId:BucklandGuideId, enabled:boolean}) {
  const [status,setStatus]=useState('');
  const [playing,setPlaying]=useState(false);
  const audio=useRef<HTMLAudioElement|null>(null);
  const token=useRef(0);
  const stop=()=>{
    token.current++;
    const old=audio.current;
    audio.current=null;
    if(old){old.onended=null;old.onerror=null;old.pause();old.removeAttribute('src')}
    setPlaying(false);
  };
  useEffect(()=>()=>{token.current++;const old=audio.current;audio.current=null;if(old){old.onended=null;old.onerror=null;old.pause()}},[]);
  useEffect(()=>{
    token.current++;
    const old=audio.current;
    audio.current=null;
    if(old){old.onended=null;old.onerror=null;old.pause()}
    // Different session event or muted guide must stop the previous take.
    // We deliberately never auto-play the new recording.
  },[clipId,enabled]);
  const play=()=>{
    if(!enabled)return;
    if(audio.current){stop();setStatus('Stopped.');return;}
    const mine=++token.current;
    try{
      const source=String(import.meta.env.BASE_URL||'/')+'voices/'+clipId+'.mp3';
      const item=new Audio(source);
      item.preload='none';
      item.volume=0.75;
      audio.current=item;
      setPlaying(true);setStatus(lines[clipId].text);
      const fail=()=>{
        if(mine!==token.current)return;
        stop();setStatus('Recording unavailable. Read the guidance above or retry.');
      };
      item.onended=()=>{if(mine!==token.current)return;stop();setStatus('Finished. '+lines[clipId].text);};
      item.onerror=fail;
      void item.play().catch(fail);
    }catch{
      stop();setStatus('Recording unavailable. Read the guidance above or retry.');
    }
  };
  const clip=lines[clipId];
  return <div className="mt-3 rounded border border-gray-500 p-3 text-sm" data-voice-source="elevenlabs">
    <p className="mb-2">{clip.text}</p>
    <button type="button" onClick={play} disabled={!enabled}
      aria-label={playing?'Stop recorded field guide':clip.label}
      aria-pressed={playing}
      className="w-full rounded bg-gray-700 px-3 py-2 text-white disabled:opacity-50">
      {playing?'■ Stop recording':'▶ '+clip.label}
    </button>
    {!enabled&&<p className="mt-1 text-gray-300">Recorded guide muted. Enable it below to listen.</p>}
    {status&&<p role="status" aria-live="polite" className="mt-1 text-gray-200">{status}</p>}
  </div>;
}
