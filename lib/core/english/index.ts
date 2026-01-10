import { 
  CEDICT_KEYS, 
  CEDICT_KEY_LENGTHS,
  CEDICT_PINYINS, 
  CEDICT_PINYIN_INDICES, 
  CEDICT_DEF_LENGTHS, 
  CEDICT_DEFINITIONS 
} from '../../data/cedict';
import { addPatterns } from '../dict';
import { segment, OutputFormat } from '../segment';
import { pinyin, BasicOptions } from '../pinyin';

let inited = false;
let pinyinIndices: Uint16Array;
let defOffsets: Uint32Array;
let keyOffsets: Uint32Array;

export interface EnglishResult {
  zh: string;
  pinyin: string;
  en: string[];
}

function getKey(index: number): string {
    const start = keyOffsets[index];
    const end = keyOffsets[index + 1];
    return CEDICT_KEYS.substring(start, end);
}

// Compare keys without creating new strings if possible, 
// but since keys are short, substring is acceptable for now.
// However, to optimize binary search, we can check char codes directly?
// Since CEDICT_KEYS is a string, simple comparison is fast.
function compareKey(index: number, target: string): number {
    const start = keyOffsets[index];
    const end = keyOffsets[index + 1];
    const len = end - start;
    const targetLen = target.length;
    
    // Quick length check optimization if needed? No, just lex compare.
    // Manual loop to avoid alloc
    const minLen = len < targetLen ? len : targetLen;
    for (let i = 0; i < minLen; i++) {
        const c1 = CEDICT_KEYS.charCodeAt(start + i);
        const c2 = target.charCodeAt(i);
        if (c1 < c2) return -1;
        if (c1 > c2) return 1;
    }
    
    if (len < targetLen) return -1;
    if (len > targetLen) return 1;
    return 0;
}

function binarySearch(target: string): number {
    let left = 0;
    let right = pinyinIndices.length - 1;
    
    while (left <= right) {
        const mid = (left + right) >>> 1;
        const cmp = compareKey(mid, target);
        
        if (cmp < 0) {
            left = mid + 1;
        } else if (cmp > 0) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function base64ToUint16Array(base64: string): Uint16Array {
    const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Uint16Array(bytes.buffer);
}

export function initEnglish() {
  if (inited) return;
  
  // Decode packed data
  pinyinIndices = base64ToUint16Array(CEDICT_PINYIN_INDICES);
  const defLengths = base64ToUint16Array(CEDICT_DEF_LENGTHS);
  const keyLengths = base64ToUint8Array(CEDICT_KEY_LENGTHS);
  
  const count = pinyinIndices.length;

  // Reconstruct Def Offsets
  defOffsets = new Uint32Array(count + 1);
  let currentDefOffset = 0;
  for (let i = 0; i < count; i++) {
      defOffsets[i] = currentDefOffset;
      currentDefOffset += defLengths[i];
  }
  defOffsets[count] = currentDefOffset;

  // Reconstruct Key Offsets
  keyOffsets = new Uint32Array(count + 1);
  let currentKeyOffset = 0;
  for (let i = 0; i < count; i++) {
      keyOffsets[i] = currentKeyOffset;
      currentKeyOffset += keyLengths[i];
  }
  keyOffsets[count] = currentKeyOffset;
  
  // Add patterns to dictionary WITHOUT creating a massive object
  // We construct the list of patterns to add. 
  // Optimization: We can check if we should add it?
  // For now, add all.
  const patterns: { zh: string; pinyin: string }[] = [];
  // Batch size to avoid blocking? or just one go.
  // We need to extract the keys and pinyins to pass to addPatterns.
  // This step still creates string objects for 'zh' keys, but they are short-lived in the function scope
  // and passed to addPatterns which builds the Trie.
  for (let i = 0; i < count; i++) {
      const zh = CEDICT_KEYS.substring(keyOffsets[i], keyOffsets[i+1]);
      const pinyin = CEDICT_PINYINS[pinyinIndices[i]];
      patterns.push({ zh, pinyin });
  }
  
  addPatterns(patterns, 'cedict');
  inited = true;
}

export function pinyinEn(text: string, options?: BasicOptions): EnglishResult[] {
  if (!text) return [];

  // Ensure dictionary is loaded
  initEnglish();
  
  // Segment the text using the augmented dictionary
  const segments = segment(text, { format: OutputFormat.ZhSegment, ...options });
  
  // Map segments to results
  return segments.map(seg => {
    const index = binarySearch(seg);
    let en: string[] = [];
    if (index !== -1) {
        const start = defOffsets[index];
        const end = defOffsets[index + 1];
        const defStr = CEDICT_DEFINITIONS.substring(start, end);
        en = defStr.split('\u0001');
    }
    
    return {
      zh: seg,
      pinyin: pinyin(seg, { ...options, type: 'string', separator: ' ' }),
      en: en
    };
  });
}
