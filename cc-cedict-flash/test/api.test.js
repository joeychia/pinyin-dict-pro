import assert from 'node:assert'
import { pinyinEn } from '../dist/cc-cedict-flash/src/index.js'

function stringifyTokens(tokens) {
  return tokens.map(t => `${t.zh}|${t.pinyin}|${t.en.join(';')}`).join(' || ')
}

const api = { pinyinEn }

{
  const res = api.pinyinEn('你好')
  assert.ok(Array.isArray(res))
  const first = res[0]
  assert.strictEqual(first.zh, '你好')
  assert.strictEqual(first.pinyin, 'nǐ hǎo')
  assert.ok(first.en.length >= 1)
  assert.ok(first.en.some(d => /Hello|Hi/i.test(d)), 'Expected English definitions to include greeting')
}

{
  const res = api.pinyinEn('你好', { toneType: 'none' })
  const first = res[0]
  assert.strictEqual(first.pinyin, 'ni hao')
}

{
  const res = api.pinyinEn('你好', { toneType: 'num' })
  const first = res[0]
  assert.strictEqual(first.pinyin, 'ni3 hao3')
}

{
  const res = api.pinyinEn('你好, H!')
  const map = new Map(res.map(r => [r.zh, r]))
  assert.strictEqual(map.get('你好').pinyin, 'nǐ hǎo')
  assert.strictEqual(map.get(',').pinyin, ',')
  assert.strictEqual(map.get(' ').pinyin, ' ')
  assert.strictEqual(map.get('H').pinyin, 'H')
  assert.strictEqual(map.get('!').pinyin, '!')
}

{
  const res = api.pinyinEn('𠮷') // rare character
  const reconstructed = res.map(t => t.zh).join('')
  assert.strictEqual(reconstructed, '𠮷')
  for (const t of res) {
    assert.strictEqual(t.pinyin, t.zh)
    assert.deepStrictEqual(t.en, [])
  }
}

{
  const text = '3Q! 11区有4S店吗？ 2019冠状病毒病很可怕。Hello世界123 @#$'
  const res = api.pinyinEn(text)
  const reconstructed = res.map(t => t.zh).join('')
  assert.strictEqual(reconstructed, text)
  const has3Q = res.find(t => t.zh === '3Q')
  assert.ok(has3Q)
  const has11Area = res.find(t => t.zh === '11区')
  assert.ok(has11Area)
  const has4S = res.find(t => t.zh === '4S店')
  assert.ok(has4S)
  const covid = res.find(t => t.zh === '2019冠状病毒病')
  assert.ok(covid)
  assert.ok(covid.en.some(d => /COVID-19/i.test(d)))
  const hChar = res.find(t => t.zh === 'H')
  assert.ok(hChar)
  const emojiSeqReconstructed = api.pinyinEn('👨‍👩‍👧‍👦').map(t => t.zh).join('')
  assert.strictEqual(emojiSeqReconstructed, '👨‍👩‍👧‍👦')
}

{
  const res = api.pinyinEn('3Q! 11区和4S店都在这里', { toneType: 'none' })
  const s3Q = res.find(t => t.zh === '3Q')
  const s11Area = res.find(t => t.zh === '11区')
  const s4S = res.find(t => t.zh === '4S店')
  assert.ok(s3Q && s11Area && s4S)
  assert.ok(/q/.test(s3Q.pinyin.toLowerCase()))
  assert.ok(/\d/.test(s11Area.pinyin) === false)
}

{
  const res = api.pinyinEn('11区')
  const tokens = res.map(t => t.zh)
  assert.ok(tokens.includes('11区'))
  assert.ok(!tokens.includes('11'))
}

console.log('All tests passed.')
