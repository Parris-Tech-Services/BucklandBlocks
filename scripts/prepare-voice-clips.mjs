// Materialise the existing, approved 20 ElevenLabs MP3s into Vite's public/
// directory at build time. No generation, no network, no new paid speech.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const manifest=JSON.parse(await readFile('audio/buckland-voice-manifest.json','utf8'));
assert.equal(manifest.project,'Buckland Blocks');
assert.equal(manifest.clips.length,20);
const target='client/public/voices';
await mkdir(target,{recursive:true});
const ids=new Set();
for(const clip of manifest.clips){
  assert.match(clip.id,/^VO0(?:6[1-9]|7[0-9]|80)$/);
  assert(!ids.has(clip.id),'Duplicate clip '+clip.id);ids.add(clip.id);
  assert.equal(clip.file,clip.id+'.mp3');
  const bytes=await readFile(clip.file);
  assert.equal(bytes.length,clip.bytes,'Size mismatch: '+clip.id);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),clip.sha256,'Changed ElevenLabs recording: '+clip.id);
  assert(bytes.subarray(0,3).toString('ascii')==='ID3'||(bytes[0]===255&&(bytes[1]&224)===224),'Invalid MP3: '+clip.id);
  await writeFile(join(target,clip.file),bytes);
}
console.log('PASS: 20 approved Buckland ElevenLabs recordings verified and published into Vite public directory');
