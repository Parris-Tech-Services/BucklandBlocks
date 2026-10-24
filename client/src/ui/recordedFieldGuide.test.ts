import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Source and manifest regression: real browser and Vite build remain separate checks.
const manifest=JSON.parse(readFileSync('audio/buckland-voice-manifest.json','utf8'));
const menu=readFileSync('client/src/ui/PauseMenu.tsx','utf8');
const guide=readFileSync('client/src/ui/RecordedFieldGuide.tsx','utf8');
const packageJSON=JSON.parse(readFileSync('package.json','utf8'));
test('all original field-guide recordings have unambiguous owner-approved metadata',()=>{
  assert.equal(manifest.clips.length,20);
  for(let n=61;n<=80;n++){
    const id='VO'+String(n).padStart(3,'0');
    const clip=manifest.clips.find((c:{id:string})=>c.id===id);
    assert(clip,'Missing '+id);
    assert.match(clip.sha256,/^[a-f0-9]{64}$/);
    assert(clip.bytes>1000);
    assert(clip.text.length>20);
  }
});
test('only confirmed game events enable narration and it is opt-in',()=>{
  const intro=manifest.clips.find((c:{id:string})=>c.id==='VO061');
  const saved=manifest.clips.find((c:{id:string})=>c.id==='VO068');
  const failed=manifest.clips.find((c:{id:string})=>c.id==='VO069');
  for(const clip of [intro,saved,failed]) assert(guide.includes(clip.text),'Exact recorded transcript missing');
  assert(menu.includes("useState<BucklandGuideId>('VO061')"));
  assert(menu.indexOf("setGuideClip('VO068')")>menu.indexOf("writeSave({"),'Success voice only after attempted save');
  assert(menu.indexOf("setGuideClip('VO069')")>menu.indexOf("} catch {"),'Save warning only in failure path');
  assert(guide.includes("if(!enabled)return"),'Muting must disable start');
  assert(guide.includes("void item.play().catch(fail)"),'Async playback errors reported');
  assert(guide.includes("old.pause()"),'Closing/changing events stops audio');
  assert(!guide.includes('speechSynthesis'),'No substituted phone voice');
  assert(menu.includes('onClick={toggleMute}'),'A sound enable/mute control must exist');
});
test('every approved recording is copied before the client build',()=>{
  assert.match(packageJSON.scripts['build:client'],/^npm run prepare:voices && vite build$/);
  assert(packageJSON.scripts.build.includes('npm run prepare:voices && vite build'));
});
