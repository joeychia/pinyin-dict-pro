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
    
    // Arrays for Structure of Arrays (SoA) layout
    const keys = [];
    const values = []; // definitions
    const pinyins = [];

    // Temporary map to deduplicate keys (keep first entry)
    // We sort keys at the end.
    const tempMap = new Map();
    
    let count = 0;
    for (const line of lines) {
        if (line.startsWith('#') || line.startsWith('%') || line.trim() === '') continue;
        
        // Format: Traditional Simplified [pinyin] /def1/def2/
        const match = line.match(/^(\S+)\s+(\S+)\s+\[(.*?)\]\s+\/(.*)\//);
        if (match) {
            const simplified = match[2];
            const pinyinNum = match[3];
            const defs = match[4].split('/').filter(d => d);
            
            // Only convert valid pinyin
            const pinyinSym = convertPinyin(pinyinNum);
            
            if (!tempMap.has(simplified)) {
                tempMap.set(simplified, {
                    p: pinyinSym,
                    d: defs.join('\u0001')
                });
                count++;
            }
        }
    }
    
    // Convert to sorted arrays
    const sortedKeys = Array.from(tempMap.keys()).sort();
    for (const key of sortedKeys) {
        keys.push(key);
        const entry = tempMap.get(key);
        pinyins.push(entry.p);
        values.push(entry.d);
    }
    
    console.log(`Parsed ${count} entries.`);
    console.log(`Unique Keys: ${keys.length}`);

    // 1. Process Pinyins (Deduplicate and Indices)
    const uniquePinyins = Array.from(new Set(pinyins));
    const pinyinMap = new Map();
    uniquePinyins.forEach((p, i) => pinyinMap.set(p, i));

    const pinyinIndices = new Uint16Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        pinyinIndices[i] = pinyinMap.get(pinyins[i]);
    }

    // 2. Process Definitions (Concatenate and Lengths)
    let definitionsStr = "";
    const defLengths = new Uint16Array(keys.length);
    for (let i = 0; i < keys.length; i++) {
        const def = values[i];
        defLengths[i] = def.length;
        definitionsStr += def;
    }

    // 3. Process Keys into Packed Static Trie
    // Node structure: 
    // - char (Uint16)
    // - valueIndex (Uint32, 0 means no value, index+1 to avoid 0)
    // - childIndex (Uint32, index into the node array where children start)
    // - childCount (Uint16)
    
    // First, build Object Trie
    const root = { children: new Map(), valueIndex: -1 };
    let totalNodes = 1; // Root
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let node = root;
        for (let j = 0; j < key.length; j++) {
            const char = key[j];
            if (!node.children.has(char)) {
                node.children.set(char, { children: new Map(), valueIndex: -1 });
                totalNodes++;
            }
            node = node.children.get(char);
        }
        node.valueIndex = i; // Store index to values array
    }
    
    console.log(`Total Trie Nodes: ${totalNodes}`);
    
    // Flatten to Arrays (BFS/DFS doesn't matter much, but BFS keeps children close?)
    // Actually, to implement "Sorted Array Trie", children of a node MUST be contiguous.
    // So we need to serialize in a specific order.
    // Order: Root, then Root's children, then their children...
    // Actually, standard way:
    // array[0] = root.
    // Root's children are at array[root.childIndex]...array[root.childIndex + root.childCount - 1].
    
    const nodeChars = new Uint16Array(totalNodes);
    const nodeValueIndices = new Uint32Array(totalNodes);
    const nodeChildIndices = new Uint32Array(totalNodes);
    const nodeChildCounts = new Uint16Array(totalNodes);
    
    let nextFreeIndex = 1; // 0 is root
    const queue = [{ node: root, index: 0, char: 0 }]; // char 0 for root (dummy)
    
    // We need to process the queue but strictly allocating children blocks
    // So, standard BFS:
    // Pop node U.
    // Allocate space for U's children (Say, K children).
    // U.childIndex = nextFreeIndex.
    // U.childCount = K.
    // Place children at nextFreeIndex ... nextFreeIndex + K - 1.
    // Add children to queue.
    // Increment nextFreeIndex by K.
    
    // Wait, the 'queue' approach above needs modification.
    // We can't just push to queue and process later because we need to write to the arrays *now* to set parent's pointers.
    // Actually, we can just process the array linearly?
    // No, we need to traverse.
    
    // Let's use a pointer 'currentProcessIndex' starting at 0.
    // We write Root at 0.
    // While currentProcessIndex < nextFreeIndex:
    //   Get node object associated with index 'currentProcessIndex'
    //   Sort children by char code.
    //   Write children to 'nextFreeIndex'.
    //   Update 'nodeChildIndices[currentProcessIndex]' = nextFreeIndex
    //   Update 'nodeChildCounts[currentProcessIndex]' = children.length
    //   Map children objects to their new indices for future processing.
    //   nextFreeIndex += children.length.
    //   currentProcessIndex++.
    
    // We need to map Index -> NodeObject.
    const indexToNode = new Map();
    indexToNode.set(0, root);
    
    // Initialize Root
    nodeChars[0] = 0;
    nodeValueIndices[0] = 0; // Root has no value
    
    let currentProcessIndex = 0;
    
    while (currentProcessIndex < nextFreeIndex) {
        const node = indexToNode.get(currentProcessIndex);
        // Clean up map to save memory
        indexToNode.delete(currentProcessIndex);
        
        if (node.children.size > 0) {
            // Sort children
            const sortedChars = Array.from(node.children.keys()).sort();
            
            const startIdx = nextFreeIndex;
            nodeChildIndices[currentProcessIndex] = startIdx;
            nodeChildCounts[currentProcessIndex] = sortedChars.length;
            
            for (let i = 0; i < sortedChars.length; i++) {
                const char = sortedChars[i];
                const childNode = node.children.get(char);
                const childIdx = startIdx + i;
                
                nodeChars[childIdx] = char.charCodeAt(0);
                // Value Index: 0 means None. So we store actual_index + 1.
                // If valueIndex is -1 (no value), we store 0.
                nodeValueIndices[childIdx] = childNode.valueIndex === -1 ? 0 : childNode.valueIndex + 1;
                
                indexToNode.set(childIdx, childNode);
            }
            
            nextFreeIndex += sortedChars.length;
        }
        
        currentProcessIndex++;
    }

    console.log(`Unique Pinyins: ${uniquePinyins.length}`);
    console.log(`Definitions Length: ${definitionsStr.length}`);

    // Helper to encode Buffer to Base64
    const pinyinBase64 = Buffer.from(pinyinIndices.buffer).toString('base64');
    const defLengthsBase64 = Buffer.from(defLengths.buffer).toString('base64');
    
    // Trie Arrays
    const nodeCharsBase64 = Buffer.from(nodeChars.buffer).toString('base64');
    const nodeValueIndicesBase64 = Buffer.from(nodeValueIndices.buffer).toString('base64');
    const nodeChildIndicesBase64 = Buffer.from(nodeChildIndices.buffer).toString('base64');
    const nodeChildCountsBase64 = Buffer.from(nodeChildCounts.buffer).toString('base64');

    const outputContent = `
export const CEDICT_PINYINS = ${JSON.stringify(uniquePinyins)};
export const CEDICT_PINYIN_INDICES = "${pinyinBase64}";
export const CEDICT_DEF_LENGTHS = "${defLengthsBase64}";
export const CEDICT_DEFINITIONS = ${JSON.stringify(definitionsStr)};

// Trie Data
export const CEDICT_TRIE_CHARS = "${nodeCharsBase64}";
export const CEDICT_TRIE_VALUES = "${nodeValueIndicesBase64}";
export const CEDICT_TRIE_CHILD_INDICES = "${nodeChildIndicesBase64}";
export const CEDICT_TRIE_CHILD_COUNTS = "${nodeChildCountsBase64}";
`;
    
    fs.writeFileSync(outputFile, outputContent);
    console.log(`Written to ${outputFile}`);
}

parseFile();
