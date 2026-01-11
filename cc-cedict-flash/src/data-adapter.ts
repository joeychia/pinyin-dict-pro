import {
  CEDICT_PINYINS,
  CEDICT_PINYIN_INDICES,
  CEDICT_DEF_LENGTHS,
  CEDICT_DEFINITIONS,
  CEDICT_TRIE_CHARS,
  CEDICT_TRIE_VALUES,
  CEDICT_TRIE_CHILD_INDICES,
  CEDICT_TRIE_CHILD_COUNTS,
} from '../../lib/data/cedict'
// Use local copy within cc-cedict-flash
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  CEDICT_PINYINS as LOCAL_CEDICT_PINYINS,
  CEDICT_DEF_LENGTHS as LOCAL_CEDICT_DEF_LENGTHS,
  CEDICT_DEFINITIONS as LOCAL_CEDICT_DEFINITIONS,
  CEDICT_TRIE_CHARS as LOCAL_CEDICT_TRIE_CHARS,
  CEDICT_TRIE_VALUES as LOCAL_CEDICT_TRIE_VALUES,
  CEDICT_TRIE_CHILD_INDICES as LOCAL_CEDICT_TRIE_CHILD_INDICES,
  CEDICT_TRIE_CHILD_COUNTS as LOCAL_CEDICT_TRIE_CHILD_COUNTS,
} from './data/cedict.js'
import type { CedictData } from './index'

function base64ToUint16Array(base64: string): Uint16Array {
  const binaryString =
    typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Uint16Array(bytes.buffer)
}

function base64ToUint32Array(base64: string): Uint32Array {
  const binaryString =
    typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary')
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Uint32Array(bytes.buffer)
}

export function builtinCedictData(): CedictData {
  const defLengths = base64ToUint16Array(LOCAL_CEDICT_DEF_LENGTHS)
  const trieChars = base64ToUint16Array(LOCAL_CEDICT_TRIE_CHARS)
  const trieValues = base64ToUint32Array(LOCAL_CEDICT_TRIE_VALUES)
  const trieChildIndices = base64ToUint32Array(LOCAL_CEDICT_TRIE_CHILD_INDICES)
  const trieChildCounts = base64ToUint16Array(LOCAL_CEDICT_TRIE_CHILD_COUNTS)
  return {
    pinyins: LOCAL_CEDICT_PINYINS,
    defLengths,
    definitions: LOCAL_CEDICT_DEFINITIONS,
    trieChars,
    trieValues,
    trieChildIndices,
    trieChildCounts,
  }
}
