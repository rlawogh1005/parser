const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');


// 경로 설정
const LIB_DIR = path.join(__dirname, 'lib');

const BIN_DIR = path.join(__dirname, 'bin');
const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, 'samples');
const PY_SAMPLE = path.join(SAMPLE_DIR, 'sample.py');

console.log('=== Parser Demonstration (File Based) ===\n');

// --- 메인 실행 블록 (Async Wrapper) ---
(async () => {

    // 3. Python ast - Sync (Subprocess)
    try {
        console.log(`--- Python ast ---`);
        console.log(`File: ${PY_SAMPLE}`);
        const output = execSync(`python src/parse_python.py "${PY_SAMPLE}"`, { cwd: __dirname }).toString();
        console.log(output.trim());
    } catch (e) {
        console.error('Python error:', e.message);
    }

})();