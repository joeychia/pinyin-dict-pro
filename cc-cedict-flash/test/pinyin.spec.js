import assert from 'node:assert'
import { createCedictFlash } from '../dist/index.js'
import { builtinCedictData } from '../dist/cc-cedict-flash/src/data-adapter.js'

const api = createCedictFlash(builtinCedictData())

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
