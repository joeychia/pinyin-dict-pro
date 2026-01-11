import fs from 'node:fs'
import path from 'node:path'
import child_process from 'node:child_process'

function formatBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(2)} ${units[i]}`
}

function dirSize(p) {
  let total = 0
  const entries = fs.readdirSync(p, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(p, e.name)
    if (e.isDirectory()) total += dirSize(full)
    else total += fs.statSync(full).size
  }
  return total
}

function packTarball() {
  const out = child_process.execSync('npm pack --json', { encoding: 'utf8' })
  let json
  try {
    json = JSON.parse(out)
  } catch {
    json = [{ filename: out.trim(), size: fs.statSync(out.trim()).size }]
  }
  const item = Array.isArray(json) ? json[0] : json
  const tarballPath = path.resolve(process.cwd(), item.filename)
  const tarballSize = fs.statSync(tarballPath).size
  return { tarballPath, tarballSize }
}

async function measureMemory() {
  const before = process.memoryUsage()
  const { pinyinEn } = await import('../dist/cc-cedict-flash/src/index.js')
  const afterImport = process.memoryUsage()
  pinyinEn('你好')
  pinyinEn('3Q! 11区有4S店吗？ 2019冠状病毒病很可怕。')
  const afterCalls = process.memoryUsage()
  return { before, afterImport, afterCalls }
}

async function main() {
  child_process.execSync('npm run build', { stdio: 'inherit' })
  const distPath = path.resolve(process.cwd(), 'dist')
  const distTotal = dirSize(distPath)
  const { tarballPath, tarballSize } = packTarball()
  const mem = await measureMemory()
  try {
    fs.unlinkSync(tarballPath)
  } catch {}
  console.log('Download size (npm pack .tgz):', formatBytes(tarballSize))
  console.log('Installed dist size:', formatBytes(distTotal))
  console.log('Memory RSS before:', formatBytes(mem.before.rss))
  console.log('Memory RSS after import:', formatBytes(mem.afterImport.rss))
  console.log('Memory RSS after calls:', formatBytes(mem.afterCalls.rss))
  console.log('Heap used before:', formatBytes(mem.before.heapUsed))
  console.log('Heap used after import:', formatBytes(mem.afterImport.heapUsed))
  console.log('Heap used after calls:', formatBytes(mem.afterCalls.heapUsed))
}

await main()
