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
      // CEDICT_DATA is { [word]: "pinyin\u0001def1\u0001def2..." }
      const val = CEDICT_DATA[key];
      const separatorIndex = val.indexOf('\u0001');
      if (separatorIndex !== -1) {
          dict[key] = val.substring(0, separatorIndex);
      }
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
    let en: string[] = [];
    if (entry) {
        en = entry.split('\u0001').slice(1);
    }
    
    return {
      zh: seg,
      pinyin: pinyin(seg, { ...options, type: 'string', separator: ' ' }),
      en: en
    };
  });
}
