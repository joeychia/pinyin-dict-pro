export interface EnglishResult {
    zh: string;
    pinyin: string;
    en: string[];
}
export interface PinyinEnOptions {
    toneType?: 'symbol' | 'none' | 'num';
    tokenized?: boolean;
}
export declare function initEnglish(): void;
export declare function pinyinEn(text: string, options?: PinyinEnOptions): EnglishResult[];
