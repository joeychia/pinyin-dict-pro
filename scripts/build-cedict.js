const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, '../cedict_ts.u8');
const outputFile = path.resolve(__dirname, '../lib/data/cedict.ts');

const toneMap = {
    'a': ['ā', 'á', 'ǎ', 'à', 'a'],
    'e': ['ē', 'é', 'ě', 'è', 'e'],
    'i': ['ī', 'í', 'ǐ', 'ì', 'i'],
    'o': ['ō', 'ó', 'ǒ', 'ò', 'o'],
    'u': ['ū', 'ú', 'ǔ', 'ù', 'u'],
    'v': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
    'ü': ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
};

function getTone(pinyin) {
    const tone = pinyin.match(/[1-5]/);
    if (!tone) return 0;
    return parseInt(tone[0]) % 5; // 5 becomes 0 (neutral)
}

function convertTone(pinyin) {
    // pinyin is like "pin1" or "pin"
    let tone = 5;
    if (/[1-5]$/.test(pinyin)) {
        tone = parseInt(pinyin.slice(-1));
        pinyin = pinyin.slice(0, -1);
    }
    if (tone === 5) tone = 0;
    
    // Find vowel to place tone mark
    // Priority: a, e, o, then i/u/v/ü (if i and u, second one gets tone? No. "iu" -> "iú", "ui" -> "uī")
    // Rule: a, e, o take precedence. If none, then the last vowel.
    
    if (pinyin.includes('a')) return pinyin.replace('a', toneMap['a'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('e')) return pinyin.replace('e', toneMap['e'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('o')) return pinyin.replace('o', toneMap['o'][tone === 0 ? 4 : tone - 1]);
    
    // iu or ui
    if (pinyin.includes('iu')) return pinyin.replace('u', toneMap['u'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('ui')) return pinyin.replace('i', toneMap['i'][tone === 0 ? 4 : tone - 1]);
    
    if (pinyin.includes('i')) return pinyin.replace('i', toneMap['i'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('u')) return pinyin.replace('u', toneMap['u'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('v')) return pinyin.replace('v', toneMap['v'][tone === 0 ? 4 : tone - 1]);
    if (pinyin.includes('ü')) return pinyin.replace('ü', toneMap['v'][tone === 0 ? 4 : tone - 1]);
    
    return pinyin;
}

function convertPinyin(pinyinStr) {
    // pinyinStr is like "er4 ling2 yi1 jiu3 ..."
    const parts = pinyinStr.split(' ');
    return parts.map(part => {
        // Handle special cases like 'r5' -> 'er' with neutral?
        // CEDICT uses 'r5' for 'er' suffix sometimes? No, usually 'r5' is 'er5'.
        // Let's just handle standard pinyin.
        return convertTone(part);
    }).join(' ');
}

function parseFile() {
    const content = fs.readFileSync(inputFile, 'utf-8');
    const lines = content.split('\n');
    
    const data = {};
    
    let count = 0;
    for (const line of lines) {
        if (line.startsWith('#') || line.startsWith('%') || line.trim() === '') continue;
        
        // Format: Traditional Simplified [pinyin] /def1/def2/
        // Relaxed regex to handle potential trailing spaces
        const match = line.match(/^(\S+)\s+(\S+)\s+\[(.*?)\]\s+\/(.*)\//);
        if (match) {
            const simplified = match[2];
            const pinyinNum = match[3];
            const defs = match[4].split('/').filter(d => d);
            
            // Only convert valid pinyin
            const pinyinSym = convertPinyin(pinyinNum);
            
            if (!data[simplified]) {
                data[simplified] = {
                    p: pinyinSym,
                    e: defs
                };
                count++;
            } else {
                // If exists, maybe multiple pronunciations.
                // For simplicity, we keep the first one or merge?
                // If we want to support polyphones correctly, we need context.
                // But here we are just building a lookup map.
                // Let's just keep the first one for now as per "digest" request simplicity.
                // Or better, store array.
            }
        }
    }
    
    console.log(`Parsed ${count} entries.`);
    
    const outputContent = `export const CEDICT_DATA: Record<string, { p: string, e: string[] }> = ${JSON.stringify(data, null, 2)};`;
    
    fs.writeFileSync(outputFile, outputContent);
    console.log(`Written to ${outputFile}`);
}

parseFile();
