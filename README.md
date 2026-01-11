### 📖 Introduction

`@joeychia/pinyin-dict-pro` is a compact, cc-cedict–based Chinese→English lookup library with pinyin output. It uses a Packed Static Trie to achieve fast lookups with low memory overhead.

### 🚀 Features

- Chinese→English conversion via CEDICT
- Pinyin output from CEDICT entries
- Tone formatting: symbol (default), none, or numeric
- Memory efficient Packed Static Trie (~50MB runtime)

### 🔨 Install

```bash
npm install @joeychia/pinyin-dict-pro
```

Browser:

```html
<script src="https://unpkg.com/@joeychia/pinyin-dict-pro"></script>
```

### 💡 Usage

```js
import { pinyinEn } from "@joeychia/pinyin-dict-pro";

const res = pinyinEn("你好");
/*
[
  { zh: "你好", pinyin: "nǐ hǎo", en: ["Hello!", "Hi!", "How are you?"] }
]
*/

// Tone formatting
pinyinEn("你好", { toneType: "none" }); // "ni hao"
pinyinEn("你好", { toneType: "num" });  // "ni3 hao3"
```

Notes:
- If a character/word is not present in CEDICT, the result returns `{ zh: <char>, pinyin: '', en: [] }`.
- Tone formatting applies to pinyin from CEDICT entries only.

### 🔎 Segmentation

- Algorithm: Forward Maximum Matching (FMM) over a Packed Static Trie built from CC-CEDICT entries.
- Process:
  - For each position i in the text, traverse the Trie using character codes and binary search among children to find the longest dictionary match.
  - If a longest match exists, emit one segment `{ zh, pinyin, en }` for that word.
  - If no match exists at i, emit a single-character segment with `{ zh: char, pinyin: char, en: [] }`.
- Scope:
  - Only CEDICT entries are treated as multi-character words.
  - Non-dictionary content (Latin letters, digits, punctuation) is segmented per character.
- No dependency on external segmentation libraries or AC automata; segmentation is fully self-contained.

### 📦 Data Source

- Based on [CC-CEDICT](https://cc-cedict.org/) (compressed and packed into TypedArrays).

### 📠 Feedback

Please open an issue for feature requests or problems.
