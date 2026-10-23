import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync,readFileSync} from 'node:fs';
import {VOICE_LINES,ALL_VOICE_IDS} from '../lib/voice/voiceCatalogue';
test('all twenty approved voiced clips match their shipped files',()=>{
 assert.equal(ALL_VOICE_IDS.length,20);
 assert.deepEqual(ALL_VOICE_IDS,Array.from({length:20},(_,i)=>'VO'+String(i+61).padStart(3,'0')));
 for(const id of ALL_VOICE_IDS){
  assert.ok(VOICE_LINES[id].text.length>25,id+' missing spoken script');
  const file='client/public/voice/'+id+'.mp3';
  assert.ok(statSync(file).size>10_000,id+' size');
  const bytes=readFileSync(file);
  assert.ok(bytes.subarray(0,3).toString('ascii')==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),id+' MP3 header');
 }
});
test('narration will not claim nonexistent durability, ledge or camp detection',()=>{
 for(const id of ['VO073','VO074','VO077','VO079','VO080'] as const)assert.equal(VOICE_LINES[id].automatic,false);
});
