import { 
  CEDICT_PINYINS, 
  CEDICT_PINYIN_INDICES, 
  CEDICT_DEF_LENGTHS, 
  CEDICT_DEFINITIONS,
  CEDICT_TRIE_CHARS,
  CEDICT_TRIE_VALUES,
  CEDICT_TRIE_CHILD_INDICES,
  CEDICT_TRIE_CHILD_COUNTS
} from '../../data/cedict';

let inited = false;
let pinyinIndices: Uint16Array;
let defOffsets: Uint32Array;

// Trie Arrays
let nodeChars: Uint16Array;
let nodeValueIndices: Uint32Array;
let nodeChildIndices: Uint32Array;
let nodeChildCounts: Uint16Array;

export interface EnglishResult {
  zh: string;
  pinyin: string;
  en: string[];
}

export interface PinyinEnOptions {
  toneType?: 'symbol' | 'none' | 'num';
  tokenized?: boolean;
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

function base64ToUint32Array(base64: string): Uint32Array {
    const binaryString = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new Uint32Array(bytes.buffer);
}

export function initEnglish() {
  if (inited) return;
  
  // Decode packed data
  pinyinIndices = base64ToUint16Array(CEDICT_PINYIN_INDICES);
  const defLengths = base64ToUint16Array(CEDICT_DEF_LENGTHS);
  
  const count = pinyinIndices.length;

  // Reconstruct Def Offsets
  defOffsets = new Uint32Array(count + 1);
  let currentDefOffset = 0;
  for (let i = 0; i < count; i++) {
      defOffsets[i] = currentDefOffset;
      currentDefOffset += defLengths[i];
  }
  defOffsets[count] = currentDefOffset;

  // Decode Trie
  nodeChars = base64ToUint16Array(CEDICT_TRIE_CHARS);
  nodeValueIndices = base64ToUint32Array(CEDICT_TRIE_VALUES);
  nodeChildIndices = base64ToUint32Array(CEDICT_TRIE_CHILD_INDICES);
  nodeChildCounts = base64ToUint16Array(CEDICT_TRIE_CHILD_COUNTS);
  
  // Do NOT add to main segment dictionary (acTree) to save memory
  inited = true;
}

// Find child index using Binary Search on children range
function findChild(nodeIdx: number, charCode: number): number {
    const start = nodeChildIndices[nodeIdx];
    const count = nodeChildCounts[nodeIdx];
    
    if (count === 0) return -1;
    
    let left = start;
    let right = start + count - 1;
    
    while (left <= right) {
        const mid = (left + right) >>> 1;
        const midVal = nodeChars[mid];
        
        if (midVal < charCode) {
            left = mid + 1;
        } else if (midVal > charCode) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}

function removeToneMarks(input: string): string {
  const map: Record<string, string> = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'u','ǘ':'u','ǚ':'u','ǜ':'u',
    'ü':'u'
  };
  let out = '';
  for (const ch of input) {
    out += map[ch] ?? ch;
  }
  return out;
}

function toneSymbolToNumToken(token: string): string {
  const toneMap: Record<string, [string, string]> = {
    'ā':['a','1'],'á':['a','2'],'ǎ':['a','3'],'à':['a','4'],
    'ē':['e','1'],'é':['e','2'],'ě':['e','3'],'è':['e','4'],
    'ī':['i','1'],'í':['i','2'],'ǐ':['i','3'],'ì':['i','4'],
    'ō':['o','1'],'ó':['o','2'],'ǒ':['o','3'],'ò':['o','4'],
    'ū':['u','1'],'ú':['u','2'],'ǔ':['u','3'],'ù':['u','4'],
    'ǖ':['u','1'],'ǘ':['u','2'],'ǚ':['u','3'],'ǜ':['u','4'],
    'ü':['u','']
  };
  let tone = '';
  let out = '';
  for (const ch of token) {
    if (toneMap[ch]) {
      out += toneMap[ch][0];
      tone = toneMap[ch][1];
    } else {
      out += ch;
    }
  }
  return tone ? `${out}${tone}` : out;
}

function toneSymbolToNum(input: string): string {
  return input.split(/\s+/).map(toneSymbolToNumToken).join(' ');
}

export function pinyinEn(text: string, options?: PinyinEnOptions): EnglishResult[] {
  if (!text) return [];

  // Ensure dictionary is loaded
  initEnglish();
  
  const results: EnglishResult[] = [];
  const tokens: EnglishResult[] = [];
  let i = 0;
  
  while (i < text.length) {
      // Forward Maximum Matching using Trie
      let currentNode = 0; // Root
      let longestMatchLen = 0;
      let longestMatchValueIdx = 0;
      
      for (let j = i; j < text.length; j++) {
          const charCode = text.charCodeAt(j);
          const nextNode = findChild(currentNode, charCode);
          
          if (nextNode === -1) {
              break;
          }
          
          currentNode = nextNode;
          // Check if this node has a value
          const valIdx = nodeValueIndices[currentNode];
          if (valIdx > 0) {
              longestMatchLen = j - i + 1;
              longestMatchValueIdx = valIdx - 1; // Convert back to 0-based
          }
      }
      
      if (longestMatchLen > 0) {
          // Found a CEDICT word
          const zh = text.substr(i, longestMatchLen);
          const start = defOffsets[longestMatchValueIdx];
          const end = defOffsets[longestMatchValueIdx + 1];
          const defStr = CEDICT_DEFINITIONS.substring(start, end);
          const en = defStr.split('\u0001');
          let pinyinStr = CEDICT_PINYINS[pinyinIndices[longestMatchValueIdx]];
          
          // Handle toneType option
          if (options?.toneType === 'none') {
              pinyinStr = removeToneMarks(pinyinStr);
          } else if (options?.toneType === 'num') {
              pinyinStr = toneSymbolToNum(pinyinStr);
          }
          
          results.push({
              zh,
              pinyin: pinyinStr,
              en
          });
          tokens.push({
              zh,
              pinyin: pinyinStr,
              en
          });
          
          i += longestMatchLen;
      } else {
          // No match in CEDICT, output single char with original as pinyin, empty en
          const char = text[i];
          results.push({
              zh: char,
              pinyin: char,
              en: []
          });
          tokens.push({
              zh: char,
              pinyin: char,
              en: []
          });
          i++;
      }
  }
  
  if (options?.tokenized === false) {
      const pinyinAll = tokens.map(t => t.pinyin).join(' ');
      const enAll = tokens.length === 1 && tokens[0].zh.length === text.length && tokens[0].en.length > 0 ? tokens[0].en : [];
      return [{
          zh: text,
          pinyin: pinyinAll,
          en: enAll
      }];
  }
  
  return results;
}
