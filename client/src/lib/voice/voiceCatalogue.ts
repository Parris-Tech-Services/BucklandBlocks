// Exact approved Buckland Blocks VO061–VO080 source scripts, no new generation.
export const VOICE_LINES={
  "VO061": {
    "id": "VO061",
    "label": "First launch",
    "text": "Welcome to Buckland Blocks. There is no hurry. Take a look around, find your bearings, and choose what to build first.",
    "automatic": true
  },
  "VO062": {
    "id": "VO062",
    "label": "First block picked up",
    "text": "A block in your inventory is a possibility. A few more, and you will have the start of a shelter.",
    "automatic": true
  },
  "VO063": {
    "id": "VO063",
    "label": "First tool selected",
    "text": "Your tool is ready. Check the block you are aiming at before you swing.",
    "automatic": true
  },
  "VO064": {
    "id": "VO064",
    "label": "Crafting tutorial",
    "text": "Try combining materials at a crafting table. The recipe tells you what the finished item needs.",
    "automatic": true
  },
  "VO065": {
    "id": "VO065",
    "label": "Dusk approaches",
    "text": "The light is changing. You might want to finish your shelter before exploring farther.",
    "automatic": true
  },
  "VO066": {
    "id": "VO066",
    "label": "Health reduced",
    "text": "Your health has dropped. Find somewhere safer before deciding what to do next.",
    "automatic": true
  },
  "VO067": {
    "id": "VO067",
    "label": "Health critical",
    "text": "You are in trouble. Step away from danger and make survival your next job.",
    "automatic": true
  },
  "VO068": {
    "id": "VO068",
    "label": "Save complete",
    "text": "World saved. Your changes will be here when you return.",
    "automatic": true
  },
  "VO069": {
    "id": "VO069",
    "label": "Save not confirmed",
    "text": "The save has not been confirmed. Check the message on screen before leaving.",
    "automatic": true
  },
  "VO070": {
    "id": "VO070",
    "label": "First mined material",
    "text": "There it is. One resource collected, and a little more freedom to make something useful.",
    "automatic": true
  },
  "VO071": {
    "id": "VO071",
    "label": "Craft first item",
    "text": "Your first crafted item. Every useful tool starts with a handful of ordinary materials.",
    "automatic": true
  },
  "VO072": {
    "id": "VO072",
    "label": "Inventory full",
    "text": "Your inventory is full. Make room before you pick anything else up.",
    "automatic": true
  },
  "VO073": {
    "id": "VO073",
    "label": "Tool durability warning proposed",
    "text": "That tool has seen a lot of work. Consider making a replacement before the next big job.",
    "automatic": false
  },
  "VO074": {
    "id": "VO074",
    "label": "Approach high ledge",
    "text": "That is a long way down. Check your footing before you cross.",
    "automatic": false
  },
  "VO075": {
    "id": "VO075",
    "label": "Fall damage",
    "text": "That landing hurt. Give yourself a moment to get clear of the edge.",
    "automatic": true
  },
  "VO076": {
    "id": "VO076",
    "label": "First furnace use proposed",
    "text": "Heat can turn raw material into something more useful. Watch the fuel as well as the result.",
    "automatic": true
  },
  "VO077": {
    "id": "VO077",
    "label": "Return to camp",
    "text": "Back to familiar ground. You can repair, sort your supplies, or head out again.",
    "automatic": false
  },
  "VO078": {
    "id": "VO078",
    "label": "Respawn",
    "text": "You are back. Your next attempt starts with what you learned from the last one.",
    "automatic": true
  },
  "VO079": {
    "id": "VO079",
    "label": "Session complete",
    "text": "That is enough for now if you want to stop. Save your world so the next visit starts smoothly.",
    "automatic": false
  },
  "VO080": {
    "id": "VO080",
    "label": "Voice off setting",
    "text": "Voice guidance is optional. You can turn it off at any time in Settings.",
    "automatic": false
  }
} as const;
export type VoiceId=keyof typeof VOICE_LINES;
export const ALL_VOICE_IDS=Object.keys(VOICE_LINES) as VoiceId[];
export const VOICE_SRC=(id:VoiceId)=>`${import.meta.env.BASE_URL}voice/${id}.mp3`;
