import { z } from 'zod';
import { BLOCKS, BlockType } from './blocks';
export const SAVE_KEY='buckland_blocks_save'; export const BACKUP_KEY='buckland_blocks_save_previous';
const CHUNK_SIZE=16*128*16; const block=z.number().int().refine(v=>Object.hasOwn(BLOCKS,v),'Unknown block');
export interface ChunkData{x:number;z:number;voxelData:Uint8Array;timestamp:number}
export interface InventoryData{slots:(BlockType|null)[];counts:number[];selectedSlot:number}
// Furnace (and future container) contents keyed by block position "x,y,z".
// Optional and kept at format version 2 so older builds still read the save.
export interface SavedBlockEntity{id:string;type:BlockType;inventory:(BlockType|null)[];counts:number[];progress:number}
export interface WorldSave{worldSeed?:number;chunks:ChunkData[];inventory:InventoryData;playerPosition:{x:number;y:number;z:number};playerRotation:{x:number;y:number};gameTime:number;blockEntities?:SavedBlockEntity[]}
const blockEntity=z.object({id:z.string().regex(/^-?\d+,-?\d+,-?\d+$/),type:block,inventory:z.array(block.nullable()).max(27),counts:z.array(z.number().int().nonnegative().max(64)).max(27),progress:z.number().finite().min(0)});
const schema=z.object({version:z.union([z.literal(1),z.literal(2)]).optional(),worldSeed:z.number().int().min(0).max(2147483647).optional(),chunks:z.array(z.object({x:z.number().int(),z:z.number().int(),voxelData:z.array(block).length(CHUNK_SIZE),timestamp:z.number().finite()})).max(1024),inventory:z.object({slots:z.array(block.nullable()).length(36),counts:z.array(z.number().int().nonnegative().max(64)).length(36),selectedSlot:z.number().int().min(0).max(8)}),playerPosition:z.object({x:z.number().finite(),y:z.number().finite(),z:z.number().finite()}),playerRotation:z.object({x:z.number().finite(),y:z.number().finite()}),gameTime:z.number().finite().min(0).max(24000),timestamp:z.number().finite().optional(),blockEntities:z.array(blockEntity).max(4096).optional()});
function serialise(data:WorldSave){const raw={...data,version:2,timestamp:Date.now(),chunks:data.chunks.map(c=>({...c,voxelData:Array.from(c.voxelData)}))};const out=JSON.stringify(schema.parse(raw));if(out.length>16*1024*1024)throw new Error('World is too large for this save format.');return out}
export function parseSave(raw:string):WorldSave{if(raw.length>16*1024*1024)throw new Error('Save is too large to load safely.');const p=schema.parse(JSON.parse(raw));return {...p,chunks:p.chunks.map(c=>({...c,voxelData:new Uint8Array(c.voxelData)}))}}
export function saveWorld(data:WorldSave){const out=serialise(data);const old=localStorage.getItem(SAVE_KEY);if(old!==null){parseSave(old);localStorage.setItem(BACKUP_KEY,old)}localStorage.setItem(SAVE_KEY,out)}
export function loadWorld():WorldSave|null{const raw=localStorage.getItem(SAVE_KEY);if(raw===null)return null;try{return parseSave(raw)}catch{return null}}
export function deleteSave(){const old=localStorage.getItem(SAVE_KEY);if(old!==null)localStorage.setItem(BACKUP_KEY,old);localStorage.removeItem(SAVE_KEY)}
export function hasSave(){return loadWorld()!==null}
export type SaveRead={data:WorldSave|null;error:string|null}
export function readSave(storage:Storage=localStorage):SaveRead{try{const raw=storage.getItem(SAVE_KEY);return{data:raw?parseSave(raw):null,error:null}}catch{return{data:null,error:'The saved world could not be read.'}}}
export function writeSave(data:WorldSave,storage:Storage=localStorage){const out=serialise(data);const old=storage.getItem(SAVE_KEY);if(old!==null){parseSave(old);storage.setItem(BACKUP_KEY,old)}storage.setItem(SAVE_KEY,out)}
export function saveChunkData(x:number,z:number,voxelData:Uint8Array){const data=loadWorld()||createNewSave();const i=data.chunks.findIndex(c=>c.x===x&&c.z===z);const chunk={x,z,voxelData,timestamp:Date.now()};if(i>=0)data.chunks[i]=chunk;else data.chunks.push(chunk);saveWorld(data)}
function createNewSave():WorldSave{return{chunks:[],inventory:{slots:new Array(36).fill(null),counts:new Array(36).fill(0),selectedSlot:0},playerPosition:{x:0,y:70,z:0},playerRotation:{x:0,y:0},gameTime:0}}
