
function getMemory() {
    if (global.gc) global.gc();
    return Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;
}

const COUNT = 120000;
const keys = [];
const values = [];
for (let i = 0; i < COUNT; i++) {
    keys.push("word" + i);
    values.push("pinyin" + i + "\u0001def" + i);
}

// Case 1: Object
const startMem = getMemory();
const obj = {};
for (let i = 0; i < COUNT; i++) {
    obj[keys[i]] = values[i];
}
const objMem = getMemory();
console.log(`Object Memory: ${objMem - startMem} MB`);

// Clear
let x = obj; 
x = null; 

// Case 2: Arrays
const startMem2 = getMemory();
const arrKeys = [...keys];
const arrValues = [...values];
const arrMem = getMemory();
console.log(`Array Memory: ${arrMem - startMem2} MB`);
