type DICT = {
    [key: string]: string | [string] | [string, number] | [string, number, string];
};
type DictOptions = {
    name?: string;
    dict1?: "add" | "replace" | "ignore";
};
export declare function addDict(dict: DICT | {}, options?: string | DictOptions): void;
export declare function addPattern(word: string, pinyin: string, dictName?: string | symbol): void;
export declare function addPatterns(patterns: {
    zh: string;
    pinyin: string;
}[], dictName?: string | symbol): void;
export declare function removeDict(dictName?: string): void;
export {};
