import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import child_process from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const url = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip'
const zipPath = path.resolve(__dirname, '../cedict_1_0_ts_utf-8_mdbg.zip')
const hashPath = path.resolve(__dirname, '../.cedict.hash')
const unzipDir = path.resolve(__dirname, '../tmp')
const rawDictPath = path.resolve(__dirname, '../cedict_ts.u8')
const outputFile = path.resolve(__dirname, '../src/data/cedict.ts')

const toneMap = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  v: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

function convertTone(pinyin) {
  let tone = 5
  if (/[1-5]$/.test(pinyin)) {
    tone = parseInt(pinyin.slice(-1))
    pinyin = pinyin.slice(0, -1)
  }
  if (tone === 5) tone = 0
  if (pinyin.includes('a')) return pinyin.replace('a', toneMap.a[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('e')) return pinyin.replace('e', toneMap.e[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('o')) return pinyin.replace('o', toneMap.o[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('iu')) return pinyin.replace('u', toneMap.u[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('ui')) return pinyin.replace('i', toneMap.i[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('i')) return pinyin.replace('i', toneMap.i[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('u')) return pinyin.replace('u', toneMap.u[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('v')) return pinyin.replace('v', toneMap.v[tone === 0 ? 4 : tone - 1])
  if (pinyin.includes('ü')) return pinyin.replace('ü', toneMap.v[tone === 0 ? 4 : tone - 1])
  return pinyin
}

function convertPinyin(pinyinStr) {
  return pinyinStr.split(' ').map(convertTone).join(' ')
}

function buildPackedDict(rawPath, outPath) {
  console.log('Building packed dict from: ' + rawPath)
  const content = fs.readFileSync(rawPath, 'utf-8')
  const lines = content.split('\n')
  console.log('Total lines in raw dict: ' + lines.length)

  const keys = []
  const values = []
  const pinyins = []
  const tempMap = new Map()

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('%') || line.trim() === '') continue
    const match = line.match(/^(\S+)\s+(\S+)\s+\[(.*?)\]\s+\/(.*)\//)
    if (match) {
      const simplified = match[2]
      const pinyinNum = match[3]
      const defs = match[4].split('/').filter(d => d)
      const pinyinSym = convertPinyin(pinyinNum)
      if (!tempMap.has(simplified)) {
        tempMap.set(simplified, { p: pinyinSym, d: defs.join('\u0001') })
      }
    }
  }

  const sortedKeys = Array.from(tempMap.keys()).sort()
  console.log('Unique simplified keys: ' + sortedKeys.length)
  for (const key of sortedKeys) {
    keys.push(key)
    const entry = tempMap.get(key)
    pinyins.push(entry.p)
    values.push(entry.d)
  }

  // Per-entry pinyins retained to preserve alignment

  let definitionsStr = ''
  const defLengths = new Uint16Array(keys.length)
  for (let i = 0; i < keys.length; i++) {
    const def = values[i]
    defLengths[i] = def.length
    definitionsStr += def
  }
  console.log('Total definitions concatenated length: ' + definitionsStr.length)

  const root = { children: new Map(), valueIndex: -1 }
  let totalNodes = 1

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    let node = root
    for (let j = 0; j < key.length; j++) {
      const char = key[j]
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), valueIndex: -1 })
        totalNodes++
      }
      node = node.children.get(char)
    }
    node.valueIndex = i
  }
  console.log('Object trie nodes: ' + totalNodes)

  const nodeChars = new Uint16Array(totalNodes)
  const nodeValueIndices = new Uint32Array(totalNodes)
  const nodeChildIndices = new Uint32Array(totalNodes)
  const nodeChildCounts = new Uint16Array(totalNodes)

  let nextFreeIndex = 1
  const indexToNode = new Map()
  indexToNode.set(0, root)
  nodeChars[0] = 0
  nodeValueIndices[0] = 0

  let currentProcessIndex = 0
  while (currentProcessIndex < nextFreeIndex) {
    const node = indexToNode.get(currentProcessIndex)
    indexToNode.delete(currentProcessIndex)
    if (node.children.size > 0) {
      const sortedChars = Array.from(node.children.keys()).sort()
      const startIdx = nextFreeIndex
      nodeChildIndices[currentProcessIndex] = startIdx
      nodeChildCounts[currentProcessIndex] = sortedChars.length
      for (let i = 0; i < sortedChars.length; i++) {
        const char = sortedChars[i]
        const childNode = node.children.get(char)
        const childIdx = startIdx + i
        nodeChars[childIdx] = char.charCodeAt(0)
        nodeValueIndices[childIdx] = childNode.valueIndex === -1 ? 0 : childNode.valueIndex + 1
        indexToNode.set(childIdx, childNode)
      }
      nextFreeIndex += sortedChars.length
    }
    currentProcessIndex++
  }
  console.log('Packed trie nodes: ' + totalNodes)

  const defLengthsBase64 = Buffer.from(defLengths.buffer).toString('base64')
  const nodeCharsBase64 = Buffer.from(nodeChars.buffer).toString('base64')
  const nodeValueIndicesBase64 = Buffer.from(nodeValueIndices.buffer).toString('base64')
  const nodeChildIndicesBase64 = Buffer.from(nodeChildIndices.buffer).toString('base64')
  const nodeChildCountsBase64 = Buffer.from(nodeChildCounts.buffer).toString('base64')

  const outputContent =
    'export const CEDICT_PINYINS = ' + JSON.stringify(pinyins) + ';\n' +
    'export const CEDICT_DEF_LENGTHS = "' + defLengthsBase64 + '";\n' +
    'export const CEDICT_DEFINITIONS = ' + JSON.stringify(definitionsStr) + ';\n' +
    '\n' +
    '// Trie Data\n' +
    'export const CEDICT_TRIE_CHARS = "' + nodeCharsBase64 + '";\n' +
    'export const CEDICT_TRIE_VALUES = "' + nodeValueIndicesBase64 + '";\n' +
    'export const CEDICT_TRIE_CHILD_INDICES = "' + nodeChildIndicesBase64 + '";\n' +
    'export const CEDICT_TRIE_CHILD_COUNTS = "' + nodeChildCountsBase64 + '";\n'
  fs.writeFileSync(outPath, outputContent)
  console.log('Written to ' + outPath)
}

async function run() {
  console.log('Starting CC-CEDICT fetch: ' + url)
  const res = await fetch(url)
  if (!res.ok) {
    console.error('Download failed', res.status, res.statusText)
    process.exit(1)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  console.log('Download completed, size bytes: ' + buf.length)
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  const prev = fs.existsSync(hashPath) ? fs.readFileSync(hashPath, 'utf-8') : ''
  if (hash !== prev) {
    console.log('New dict detected, updating local cache')
    fs.writeFileSync(zipPath, buf)
    fs.writeFileSync(hashPath, hash)
    if (!fs.existsSync(unzipDir)) fs.mkdirSync(unzipDir, { recursive: true })
    console.log('Unzipping to: ' + unzipDir)
    child_process.execSync(`unzip -o "${zipPath}" -d "${unzipDir}"`)
    const entries = fs.readdirSync(unzipDir)
    let found = ''
    for (const name of entries) {
      const p = path.join(unzipDir, name)
      if (fs.statSync(p).isFile() && /cedict_ts\.u8$/i.test(name)) {
        found = p
        break
      }
    }
    if (!found) {
      console.log('Searching nested directories for cedict_ts.u8')
      const nested = entries.map(n => path.join(unzipDir, n)).filter(p => fs.statSync(p).isDirectory())
      for (const d of nested) {
        const files = fs.readdirSync(d)
        for (const f of files) {
          const p = path.join(d, f)
          if (fs.statSync(p).isFile() && /cedict_ts\.u8$/i.test(f)) {
            found = p
            break
          }
        }
        if (found) break
      }
    }
    if (!found) {
      console.error('cedict_ts.u8 not found in zip')
      process.exit(1)
    }
    console.log('Found raw dict: ' + found)
    fs.copyFileSync(found, rawDictPath)
    console.log('Copied raw dict to: ' + rawDictPath)
  } else {
    console.log('No update detected, using existing raw dict and packed output')
    if (!fs.existsSync(rawDictPath)) {
      console.log('Raw dict missing; refreshing from zip buffer')
      fs.writeFileSync(zipPath, buf)
      if (!fs.existsSync(unzipDir)) fs.mkdirSync(unzipDir, { recursive: true })
      child_process.execSync(`unzip -o "${zipPath}" -d "${unzipDir}"`)
      const entries = fs.readdirSync(unzipDir)
      let found = ''
      for (const name of entries) {
        const p = path.join(unzipDir, name)
        if (fs.statSync(p).isFile() && /cedict_ts\.u8$/i.test(name)) {
          found = p
          break
        }
      }
      if (!found) {
        const nested = entries.map(n => path.join(unzipDir, n)).filter(p => fs.statSync(p).isDirectory())
        for (const d of nested) {
          const files = fs.readdirSync(d)
          for (const f of files) {
            const p = path.join(d, f)
            if (fs.statSync(p).isFile() && /cedict_ts\.u8$/i.test(f)) {
              found = p
              break
            }
          }
          if (found) break
        }
      }
      if (!found) {
        console.error('cedict_ts.u8 not found in zip (refresh)')
        process.exit(1)
      }
      fs.copyFileSync(found, rawDictPath)
      console.log('Restored raw dict to: ' + rawDictPath)
    }
  }
  buildPackedDict(rawDictPath, outputFile)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
