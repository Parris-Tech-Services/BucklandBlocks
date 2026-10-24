# ElevenLabs integration — numbered outstanding tasks

**Status:** OPEN / NOT YET VERIFIED. **Last inventoried:** 2026-10-24. This is a task list, not evidence of successful integration.

**Global tracker:** https://github.com/Parris-Tech-Services/ParrisVoiceBank/blob/main/AUDIO_INTEGRATION_MASTER_TODO.md

**Rules:** Task IDs match the global master checklist 001–048. Check off each task only after passing tests and live production verification. Reuse existing ElevenLabs recordings, do not generate new speech unnecessarily. Preserve gameplay and avoid unintended auto-speaking or generic TTS disguised as recording.

## Tasks relevant to Buckland Blocks (10)

- [ ] **036** [P2] Finish Buckland Blocks integration where recordings suit its gameplay
- [ ] **040** [P2] Audit voice consistency, pronunciation, volume, pauses and audio quality across all characters
- [ ] **041** [P2] Check integrity, captions, wrong-file matches and broken URLs for each recording
- [ ] **042** [P2] Verify no overlapping audio, autoplay problems, stuck players or missing stop controls
- [ ] **043** [P2] Check loading performance and avoid unnecessarily downloading hundreds of recordings on mobile data
- [ ] **044** [P2] Test fallback and retry behaviour without unexpected ElevenLabs API calls or costs
- [ ] **045** [P2] Check accessibility, keyboard controls, reduced-motion preferences and screen-reader labels
- [ ] **046** [P2] Run project builds, automated tests, real-browser journeys and production smoke tests
- [ ] **047** [P2] Confirm save/load, offline support and core gameplay remain unchanged where audio was added
- [ ] **048** [P2] Publish a central audit showing clip ID, voice, source, destination, gameplay trigger, review status and test outcome

_Buckland Blocks scope: do not invent audio-to-event matches. Review actual gameplay first, integrate only suitable audio, and test phone and desktop experience before claiming complete._
