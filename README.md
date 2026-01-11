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

### 📦 Data Source

- Based on [CC-CEDICT](https://cc-cedict.org/) (compressed and packed into TypedArrays).

### 📠 Feedback

Please open an issue for feature requests or problems.
