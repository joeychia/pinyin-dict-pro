import assert from 'node:assert'
import { pinyinEn } from '../dist/cc-cedict-flash/src/index.js'

const pinyinEnWrapper = (text, options) => pinyinEn(text, options)

// should get English for known words
{
  const result = pinyinEnWrapper('88')
  assert.strictEqual(result[0].zh, '88')
  assert.strictEqual(result[0].pinyin, 'bā bā')
  assert.ok(result[0].en.includes('(Internet slang) bye-bye (alternative for 拜拜[bai2 bai2])'))
}

// should segment and get English
{
  const result = pinyinEnWrapper('110')
  assert.strictEqual(result[0].zh, '110')
  assert.strictEqual(result[0].pinyin, 'yāo yāo líng')
}

// should handle mixed content
{
  const result = pinyinEnWrapper('110我')
  assert.strictEqual(result[0].zh, '110')
  assert.strictEqual(result[1].zh, '我')
}

// should support pinyin options
{
  const result = pinyinEnWrapper('110', { toneType: 'none' })
  assert.strictEqual(result[0].pinyin, 'yao yao ling')
}

// should handle long sentences with mixed content (numbers, english, chinese)
{
  const sentence = '3Q! 11区有4S店吗？'
  const result = pinyinEnWrapper(sentence)
  const s3Q = result.find(r => r.zh === '3Q')
  assert.ok(s3Q)
  assert.ok(s3Q.en.some(e => e.includes('(Internet slang) thank you (loanword)')))
  const s11Area = result.find(r => r.zh === '11区')
  assert.ok(s11Area)
  assert.strictEqual(s11Area.pinyin, 'Shí yī Qū')
  const s4S = result.find(r => r.zh === '4S店')
  assert.ok(s4S)
  assert.ok(s4S.en[0].includes('authorized full-service car dealership'))
}

// should handle punctuation and special symbols
{
  const text = 'Hello, 世界! 123 @#$'
        const result = pinyinEnWrapper(text);
  const combined = result.map(r => r.zh).join('')
  assert.strictEqual(combined, text)
  const h = result.find(r => r.zh === 'H')
  assert.ok(h)
  assert.strictEqual(h.pinyin, 'H')
}

// reconstruction: should be able to reconstruct original text from segments
{
  const inputs = [
    'Hello, 世界!',
    '3Q! 11区有4S店吗？',
    'Multi-line\ntext with\ttabs.',
    'Emoji: 👨‍👩‍👧‍👦 works too!',
    'Mixed: 123 中文 English 456',
    '',
    '   ',
  ]
  for (const text of inputs) {
    const result = pinyinEn(text)
    const reconstructed = result.map(r => r.zh).join('')
    assert.strictEqual(reconstructed, text)
  }
}

// reconstruction: should have empty English/Pinyin for non-dict items where appropriate
{
      const result = pinyinEnWrapper('Hi!');
  const punc = result.find(r => r.zh === '!')
  assert.ok(punc)
  assert.deepStrictEqual(punc.en, [])
  assert.strictEqual(punc.pinyin, '!')
}

console.log('english.spec.js passed.')
