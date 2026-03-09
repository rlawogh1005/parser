const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { parseJavascript } = require('../src/parse_acorn');

// 경로 설정
const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(__dirname, 'lib');

const BIN_DIR = path.join(__dirname, 'bin');
const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, 'samples');
const JS_SAMPLE = path.join(SAMPLE_DIR, 'sample.js');
const TS_SAMPLE = path.join(SAMPLE_DIR, 'sample.ts');
const PY_SAMPLE = path.join(SAMPLE_DIR, 'sample.py');
const JAVA_SAMPLE = path.join(SAMPLE_DIR, 'sample.java');

console.log('=== Parser Demonstration (File Based) ===\n');

// --- 메인 실행 블록 (Async Wrapper) ---
(async () => {

    // 1. Acorn (JavaScript)
    try {
        console.log(`--- Acorn (JavaScript) ---`);
        console.log(`File: ${JS_SAMPLE}`);
        console.log(parseJavascript(JS_SAMPLE));
    } catch (e) {
        console.error('Acorn error:', e.message);
    }
})();