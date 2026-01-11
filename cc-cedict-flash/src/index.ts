export interface EnglishResult {
  zh: string
  pinyin: string
  en: string[]
}

export interface PinyinEnOptions {
  toneType?: 'symbol' | 'none' | 'num'
}

export interface CedictData {
  pinyins: string[]
  defLengths: Uint16Array
  definitions: string
  trieChars: Uint16Array
  trieValues: Uint32Array
  trieChildIndices: Uint32Array
  trieChildCounts: Uint16Array
}

function removeToneMarks(input: string): string {
  const map: Record<string, string> = {
    'ā':'a','á':'a','ǎ':'a','à':'a',
    'ē':'e','é':'e','ě':'e','è':'e',
    'ī':'i','í':'i','ǐ':'i','ì':'i',
    'ō':'o','ó':'o','ǒ':'o','ò':'o',
    'ū':'u','ú':'u','ǔ':'u','ù':'u',
    'ǖ':'u','ǘ':'u','ǚ':'u','ǜ':'u',
    'ü':'u'
  }
  let out = ''
  for (const ch of input) {
    out += map[ch] ?? ch
  }
  return out
}

function toneSymbolToNumToken(token: string): string {
  const toneMap: Record<string, [string, string]> = {
    'ā':['a','1'],'á':['a','2'],'ǎ':['a','3'],'à':['a','4'],
    'ē':['e','1'],'é':['e','2'],'ě':['e','3'],'è':['e','4'],
    'ī':['i','1'],'í':['i','2'],'ǐ':['i','3'],'ì':['i','4'],
    'ō':['o','1'],'ó':['o','2'],'ǒ':['o','3'],'ò':['o','4'],
    'ū':['u','1'],'ú':['u','2'],'ǔ':['u','3'],'ù':['u','4'],
    'ǖ':['u','1'],'ǘ':['u','2'],'ǚ':['u','3'],'ǜ':['u','4'],
    'ü':['u','']
  }
  let tone = ''
  let out = ''
  for (const ch of token) {
    if (toneMap[ch]) {
      out += toneMap[ch][0]
      tone = toneMap[ch][1]
    } else {
      out += ch
    }
  }
  return tone ? `${out}${tone}` : out
}

function toneSymbolToNum(input: string): string {
  return input.split(/\s+/).map(toneSymbolToNumToken).join(' ')
}

function convertNumericOverride(numeric: string): string {
  return numeric.split(/\s+/).map(convertNumericToken).join(' ')
}

function convertNumericToken(part: string): string {
  return toneSymbolToNumToken(part.replace(/[1-5]$/, (m) => m))
}

function findChild(
  nodeChildIndices: Uint32Array,
  nodeChildCounts: Uint16Array,
  nodeChars: Uint16Array,
  nodeIdx: number,
  charCode: number
): number {
  const start = nodeChildIndices[nodeIdx]
  const count = nodeChildCounts[nodeIdx]
  if (count === 0) return -1
  let left = start
  let right = start + count - 1
  while (left <= right) {
    const mid = (left + right) >>> 1
    const midVal = nodeChars[mid]
    if (midVal < charCode) {
      left = mid + 1
    } else if (midVal > charCode) {
      right = mid - 1
    } else {
      return mid
    }
  }
  return -1
}

export function createCedictFlash(data: CedictData) {
  const defLengths = data.defLengths
  const nodeChars = data.trieChars
  const nodeValueIndices = data.trieValues
  const nodeChildIndices = data.trieChildIndices
  const nodeChildCounts = data.trieChildCounts
  const defOffsets = new Uint32Array(defLengths.length + 1)
  let cur = 0
  for (let i = 0; i < defLengths.length; i++) {
    defOffsets[i] = cur
    cur += defLengths[i]
  }
  defOffsets[defLengths.length] = cur

  // No overrides: longest-match segmentation with per-entry pinyins ensures correct mapping

  function applyToneOptions(pinyinStr: string, toneType?: PinyinEnOptions['toneType']): string {
    if (toneType === 'none') return removeToneMarks(pinyinStr)
    if (toneType === 'num') return toneSymbolToNum(pinyinStr)
    return pinyinStr
  }

  function pinyinEn(text: string, options?: PinyinEnOptions): EnglishResult[] {
    if (!text) return []
    const results: EnglishResult[] = []
    let i = 0
    while (i < text.length) {
      let currentNode = 0
      let longestMatchLen = 0
      let longestMatchValueIdx = 0
      for (let j = i; j < text.length; j++) {
        const charCode = text.charCodeAt(j)
        const nextNode = findChild(nodeChildIndices, nodeChildCounts, nodeChars, currentNode, charCode)
        if (nextNode === -1) {
          break
        }
        currentNode = nextNode
        const valIdx = nodeValueIndices[currentNode]
        if (valIdx > 0) {
          longestMatchLen = j - i + 1
          longestMatchValueIdx = valIdx - 1
        }
      }
      if (longestMatchLen > 0) {
          const zh = text.substr(i, longestMatchLen)
          const start = defOffsets[longestMatchValueIdx]
          const end = defOffsets[longestMatchValueIdx + 1]
          const defStr = data.definitions.substring(start, end)
          const en = defStr.split('\u0001')
        let pinyinStr = data.pinyins[longestMatchValueIdx]
        pinyinStr = applyToneOptions(pinyinStr, options?.toneType)
        results.push({ zh, pinyin: pinyinStr, en })
        i += longestMatchLen
      } else {
        const char = text[i]
        results.push({ zh: char, pinyin: char, en: [] })
        i++
      }
    }
    return results
  }

  return { pinyinEn }
}

import { builtinCedictData } from './data-adapter.js'
let defaultApi: { pinyinEn: (text: string, options?: PinyinEnOptions) => EnglishResult[] } | undefined
export function pinyinEn(text: string, options?: PinyinEnOptions): EnglishResult[] {
  if (!defaultApi) {
    defaultApi = createCedictFlash(builtinCedictData())
  }
  return defaultApi.pinyinEn(text, options)
}

export { builtinCedictData } from './data-adapter.js'
