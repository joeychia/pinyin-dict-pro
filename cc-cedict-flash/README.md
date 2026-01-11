### cc-cedict-flash

CC-CEDICT based Chinese→English lookup with pinyin output and Trie-based segmentation. Minimal, fast, and independent.

### Install

```bash
npm install cc-cedict-flash
```

### Usage

```ts
import { createCedictFlash } from 'cc-cedict-flash'

const data = {
  pinyins: [...],
  pinyinIndices: new Uint16Array(...),
  defLengths: new Uint16Array(...),
  definitions: '...',
  trieChars: new Uint16Array(...),
  trieValues: new Uint32Array(...),
  trieChildIndices: new Uint32Array(...),
  trieChildCounts: new Uint16Array(...)
}

const api = createCedictFlash(data)
const res = api.pinyinEn('你好')
```

### Build the dict locally

```bash
# From cc-cedict-flash/
npm run build:dict
```

This reads `cedict_ts.u8` (raw CC‑CEDICT) and generates `src/data/cedict.ts` with packed arrays used by the API.

### Segmentation

- Forward Maximum Matching over a Packed Static Trie built from CC-CEDICT entries.
- Longest dictionary word per position; non-dict content becomes single-character tokens.

### Options

- `toneType`: `'symbol' | 'none' | 'num'`

### Response

- Array of tokens: `{ zh: string, pinyin: string, en: string[] }`
