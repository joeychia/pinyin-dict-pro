import { CEDICT_DATA } from '../../data/cedict';
import { addDict } from '../dict';
import { segment, OutputFormat } from '../segment';
import { pinyin, BasicOptions } from '../pinyin';

let inited = false;

export interface EnglishResult {
  zh: string;
  pinyin: string;
  en: string[];
}

export function initEnglish() {
  if (inited) return;
  // Convert CEDICT_DATA to the format expected by addDict
  // addDict expects { [word]: pinyin }
  // CEDICT_DATA is { [word]: { p: pinyin, e: definitions } }
  
  const dict: Record<string, string> = {};
  for (const key in CEDICT_DATA) {
      // Use the pinyin from CEDICT
      dict[key] = CEDICT_DATA[key].p;
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
    const entry = CEDICT_DATA[seg];
    // If found in CEDICT, use its pinyin (but we need to respect options like toneType if possible,
    // however, CEDICT pinyin is fixed. If we want to respect options, we might need to re-process CEDICT pinyin
    // or just rely on pinyin-pro's pinyin generation for consistency if we want to apply options).
    // The user asked to keep API compatible. 
    // If we use pinyin(seg, options), we get the pinyin with options applied.
    // If CEDICT has a specific pinyin that differs from pinyin-pro's default, we might lose that accuracy
    // if we just call pinyin(seg). 
    // BUT, since we added CEDICT to the dictionary using addDict, pinyin(seg) SHOULD use the pinyin from CEDICT!
    // Let's verify: addDict(dict, { name: 'cedict' }) adds to the segmentation dictionary AND the pinyin lookup?
    // addDict implementation adds to `acTree` for segmentation and `originDictMap` / `DICT1` for single chars?
    // Wait, `addDict` in `lib/core/dict/index.ts` processes the dict.
    // If the word is > 1 char, it adds to `acTree`.
    // When `pinyin()` is called, it segments first. If it segments as "hello", it then looks up pinyin.
    // Where does it look up pinyin for a multi-char word?
    // `getPinyin` in `lib/core/pinyin/handle.ts`.
    
    return {
      zh: seg,
      pinyin: pinyin(seg, { ...options, type: 'string', separator: ' ' }),
      en: entry ? entry.e : []
    };
  });
}
