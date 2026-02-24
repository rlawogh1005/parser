const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { parseJavascript } = require('./src/parse_treesitter');

// 경로 설정
const RESULTS_DIR = path.join(__dirname, 'parser-results');

// 결과 폴더 생성
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, 'samples');
const JS_SAMPLE = path.join(SAMPLE_DIR, 'sample.js');

console.log('=== Parser Demonstration (File Based) ===\n');

(async () => {
    // tree-sitter
    try {
        console.log(`--- tree-sitter (JavaScript) ---`);
        console.log(`File: ${JS_SAMPLE}`);

        const result = await parseJavascript(JS_SAMPLE);
        const outputPath = path.join(RESULTS_DIR, 'tree-sitter.json');

        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
        console.log(`Result saved to: ${outputPath}`);
    } catch (e) {
        console.error('tree-sitter error:', e.message);
    }
})();