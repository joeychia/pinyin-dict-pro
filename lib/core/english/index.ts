import { CEDICT_KEYS, CEDICT_VALUES, CEDICT_PINYINS } from '../../data/cedict';
import { addDict } from '../dict';
import { segment, OutputFormat } from '../segment';
import { pinyin, BasicOptions } from '../pinyin';

let inited = false;

export interface EnglishResult {
  zh: string;
  pinyin: string;
  en: string[];
}

function binarySearch(keys: string[], target: string): number {
    let left = 0;
    let right = keys.length - 1;
    
    while (left <= right) {
        const mid = (left + right) >>> 1;
        const midVal = keys[mid];
        
        if (midVal < target) {
            left = mid + 1;
        } else if (midVal > target) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}

export function initEnglish() {
  if (inited) return;
  
  const dict: Record<string, string> = {};
  const len = CEDICT_KEYS.length;
  for (let i = 0; i < len; i++) {
      dict[CEDICT_KEYS[i]] = CEDICT_PINYINS[i];
  }
  
  // Add to the segmentation dictionary
  addDict(dict, { name: 'cedict' });
  inited = true;
}

export function pinyinEn(text: string, options?: BasicOptions): EnglishResult[] {
  if (!text) return [];

  // Ensure dictionary is loaded
  initEnglish();
  
  // Segment the text using the augmented dictionary
  // Use ZhSegment to get an array of Chinese string segments
  const segments = segment(text, { format: OutputFormat.ZhSegment, ...options });
  
  // Map segments to results
  return segments.map(seg => {
    const index = binarySearch(CEDICT_KEYS, seg);
    let en: string[] = [];
    if (index !== -1) {
        en = CEDICT_VALUES[index].split('\u0001');
    }
    
    return {
      zh: seg,
      pinyin: pinyin(seg, { ...options, type: 'string', separator: ' ' }),
      en: en
    };
  });
}
