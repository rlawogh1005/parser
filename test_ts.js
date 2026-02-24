const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { parseTypescript } = require('./src/parse_tsmorph');

// 경로 설정
const LIB_DIR = path.join(__dirname, 'lib');

const BIN_DIR = path.join(__dirname, 'bin');
const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, 'samples');
const TS_SAMPLE = path.join(SAMPLE_DIR, 'sample.ts');

console.log('=== Parser Demonstration (File Based) ===\n');

// --- 메인 실행 블록 (Async Wrapper) ---
(async () => {
    // 2. ts-morph (TypeScript) - Sync
    try {
        console.log(`--- ts-morph (TypeScript) ---`);
        console.log(`File: ${TS_SAMPLE}`);
        console.log(parseTypescript(TS_SAMPLE));
    } catch (e) {
        console.error('ts-morph error:', e.message);
    }
})();