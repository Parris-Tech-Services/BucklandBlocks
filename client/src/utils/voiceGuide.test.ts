import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ALL_VOICE_IDS,VOICE_LINES} from '../lib/voice/voiceCatalogue';

const manifest=JSON.parse(readFileSync('audio/buckland-voice-manifest.json','utf8'));
test('all twenty original recordings match approved hashes and exact scripts',()=>{
  assert.equal(ALL_VOICE_IDS.length,20);
  assert.equal(manifest.clips.length,20);
  for(let i=61;i<=80;i++){
    const id='VO'+String(i).padStart(3,'0');
    const clip=manifest.clips.find((c:{id:string})=>c.id===id);
    assert.ok(clip,id+' missing in approved manifest');
    assert.ok(id in VOICE_LINES,id+' missing in UI');
    assert.equal(VOICE_LINES[id as keyof typeof VOICE_LINES].text,clip.text,id+' transcript drift');
    const bytes=readFileSync(id+'.mp3');
    assert.equal(bytes.length,clip.bytes,id+' size mismatch');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,id+' original recording changed');
  }
});
test('uses existing build-time verified voices path and keeps unimplemented events manual',()=>{
  const catalogue=readFileSync('client/src/lib/voice/voiceCatalogue.ts','utf8');
  const prep=readFileSync('scripts/prepare-voice-clips.mjs','utf8');
  assert.ok(catalogue.includes('BASE_URL}voices/'));
  assert.ok(prep.includes("client/public/voices"));
  for(const id of ['VO073','VO074','VO077','VO079','VO080'] as const)assert.equal(VOICE_LINES[id].automatic,false);
});
