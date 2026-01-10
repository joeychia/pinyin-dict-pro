
const fs = require('fs');
const path = require('path');

function getMemory() {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  return Math.round(used * 100) / 100;
}

const initialMem = getMemory();
console.log(`Initial memory: ${initialMem} MB`);

// Path to dist
const distPath = path.resolve(__dirname, '../dist/index.js');

try {
    const lib = require(distPath);
    const afterImportMem = getMemory();
    console.log(`Memory after import: ${afterImportMem} MB`);
    console.log(`Delta (Import): ${Math.round((afterImportMem - initialMem) * 100) / 100} MB`);

    if (lib.pinyinEn) {
        console.log('pinyinEn is available. Running it...');
        lib.pinyinEn('你好');
        const afterRunMem = getMemory();
        console.log(`Memory after running pinyinEn: ${afterRunMem} MB`);
        console.log(`Delta (Run): ${Math.round((afterRunMem - afterImportMem) * 100) / 100} MB`);
    } else {
        console.log('pinyinEn is NOT available.');
    }
} catch (e) {
    console.error('Error importing lib:', e);
}
