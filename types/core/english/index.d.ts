import { BasicOptions } from '../pinyin';
export interface EnglishResult {
    zh: string;
    pinyin: string;
    en: string[];
}
export declare function initEnglish(): void;
export declare function pinyinEn(text: string, options?: BasicOptions): EnglishResult[];
