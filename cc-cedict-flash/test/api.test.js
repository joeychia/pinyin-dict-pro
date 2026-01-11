import assert from 'node:assert'
import { createCedictFlash } from '../dist/index.js'
import { builtinCedictData } from '../dist/cc-cedict-flash/src/data-adapter.js'

function stringifyTokens(tokens) {
  return tokens.map(t => `${t.zh}|${t.pinyin}|${t.en.join(';')}`).join(' || ')
}

const api = createCedictFlash(builtinCedictData())

// Basic known word
{
  const res = api.pinyinEn('你好')
  assert.ok(Array.isArray(res))
  const first = res[0]
  assert.strictEqual(first.zh, '你好')
  assert.strictEqual(first.pinyin, 'nǐ hǎo')
  assert.ok(first.en.length >= 1)
  assert.ok(first.en.some(d => /Hello|Hi/i.test(d)), 'Expected English definitions to include greeting')
}

// Tone options: none
{
  const res = api.pinyinEn('你好', { toneType: 'none' })
  const first = res[0]
  assert.strictEqual(first.pinyin, 'ni hao')
}

// Tone options: num
{
  const res = api.pinyinEn('你好', { toneType: 'num' })
  const first = res[0]
  assert.strictEqual(first.pinyin, 'ni3 hao3')
}

// Mixed content segmentation
{
  const res = api.pinyinEn('你好, H!')
  const map = new Map(res.map(r => [r.zh, r]))
  assert.strictEqual(map.get('你好').pinyin, 'nǐ hǎo')
  assert.strictEqual(map.get(',').pinyin, ',')
  assert.strictEqual(map.get(' ').pinyin, ' ')
  assert.strictEqual(map.get('H').pinyin, 'H')
  assert.strictEqual(map.get('!').pinyin, '!')
}

// Non-dict supplementary-plane char handled as single-character tokens (UTF-16 surrogate aware)
{
  const res = api.pinyinEn('𠮷') // rare character
  const reconstructed = res.map(t => t.zh).join('')
  assert.strictEqual(reconstructed, '𠮷')
  for (const t of res) {
    assert.strictEqual(t.pinyin, t.zh)
    assert.deepStrictEqual(t.en, [])
  }
}

console.log('All tests passed.')
