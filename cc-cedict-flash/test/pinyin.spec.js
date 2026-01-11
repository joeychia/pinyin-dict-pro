import assert from 'node:assert'
import { pinyinEn } from '../dist/cc-cedict-flash/src/index.js'

const api = { pinyinEn }

function expectToneNone(zh, expected) {
  const res = api.pinyinEn(zh, { toneType: 'none' })
  const token = res.find(t => t.zh === zh) || res[0]
  assert.ok(token, `Expected token for ${zh}`)
  assert.strictEqual(token.pinyin.toLowerCase(), expected.toLowerCase(), `toneNone for ${zh}`)
}

function expectToneNum(zh, expected) {
  const res = api.pinyinEn(zh, { toneType: 'num' })
  const token = res.find(t => t.zh === zh) || res[0]
  assert.ok(token, `Expected token for ${zh}`)
  assert.strictEqual(token.pinyin.toLowerCase(), expected.toLowerCase(), `toneNum for ${zh}`)
}

// 问候：你好
expectToneNone('你好', 'ni hao')
expectToneNum('你好', 'ni3 hao3')

// 单字：刘（iu）
expectToneNone('刘', 'liu')
expectToneNum('刘', 'liu2')

// 单字：绿（lü）
expectToneNone('绿', 'lu')
expectToneNum('绿', 'lu4')

// 单字：对（ui）
expectToneNone('对', 'dui')
expectToneNum('对', 'dui4')

// 单字：买（a 优先规则）
expectToneNone('买', 'mai')
expectToneNum('买', 'mai3')

// 长文本混合验证（使用已知存在的词 3Q、11区、4S店）
{
  const text = 'Hello! 11区的4S店和对、买，还有刘、绿。'
  const resNone = api.pinyinEn(text, { toneType: 'none' })
  const resNum = api.pinyinEn(text, { toneType: 'num' })
  const recon = resNone.map(t => t.zh).join('')
  assert.strictEqual(recon, text)
  const token = (zh, arr) => arr.find(t => t.zh === zh)
  assert.ok(token('11区', resNone))
  assert.ok(token('4S店', resNone))
  assert.ok(token('绿', resNone))
  assert.ok(token('刘', resNone))
  assert.ok(token('对', resNone))
}

console.log('pinyin.spec.js passed.')
// 多音字长文本
{
  const text = '我们在银行办理业务，音乐会上表演，面对严重问题与成长的挑战。'
  const resNone = api.pinyinEn(text, { toneType: 'none' })
  const recon = resNone.map(t => t.zh).join('')
  assert.strictEqual(recon, text)
  const token = (zh) => resNone.find(t => t.zh === zh)
  const tConcert = token('音乐会')
  const tSerious = token('严重问题')
  const tGrow = token('成长')
  assert.ok(tConcert && tSerious && tGrow, 'Expected tokens present')
  // Assert pinyin exactly as returned by API for current dict snapshot
  assert.strictEqual(tConcert.pinyin.toLowerCase(), 'yin yue hui')
  assert.strictEqual(tSerious.pinyin.toLowerCase(), 'yan zhong wen ti')
  assert.strictEqual(tGrow.pinyin.toLowerCase(), 'cheng zhang')
}

// 长文本包含多音字与已知词条
{
  const text = '长乐重行3Q! 11区和4S店都在这里，2019冠状病毒病曾出现过。'
  const res = api.pinyinEn(text, { toneType: 'none' })
  const recon = res.map(t => t.zh).join('')
  assert.strictEqual(recon, text)
  const token = (zh) => res.find(t => t.zh === zh)
  assert.ok(token('3Q') && token('11区') && token('4S店') && token('2019冠状病毒病'))
}
