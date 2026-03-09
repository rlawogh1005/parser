const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 경로 설정
const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(__dirname, 'lib');

const BIN_DIR = path.join(__dirname, 'bin');
const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// 샘플 파일 경로
const SAMPLE_DIR = path.join(__dirname, 'samples');
const JAVA_SAMPLE = path.join(SAMPLE_DIR, 'sample.java');

console.log('=== Parser Demonstration (File Based) ===\n');

// --- 메인 실행 블록 (Async Wrapper) ---
(async () => {

    // 4. JavaParser - Sync (Subprocess) [수정됨]
    try {
        console.log('--- JavaParser ---');
        console.log(`File: ${JAVA_SAMPLE}`);

        // Java 관련 경로 정의
        const javaSource = path.join(SRC_DIR, 'ParseJava.java');
        const javaLib = path.join(LIB_DIR, 'javaparser-core.jar');

        // 라이브러리 파일 존재 확인
        if (!fs.existsSync(javaLib)) {
            throw new Error(`Library not found: ${javaLib}`);
        }

        // Classpath 설정 (OS별 구분자 자동 처리)
        // .:lib/javaparser-core.jar 형태로 설정
        const classPath = `.${path.delimiter}${javaLib}`;

        // 명령어 구성: java -cp ".:lib/..." src/ParseJava.java "samples/..."
        // 컴파일(javac) 없이 소스 파일을 바로 실행합니다.
        const cmd = `java -cp "${classPath}" "${javaSource}" "${JAVA_SAMPLE}"`;

        const output = execSync(cmd, { cwd: __dirname }).toString();
        console.log(output.trim());

    } catch (e) {
        console.error('JavaParser error:', e.message);
        // 에러 발생 시 상세 내용 출력 (stderr 등)
        if (e.stdout) console.log("Stdout:", e.stdout.toString());
        if (e.stderr) console.error("Stderr:", e.stderr.toString());
    }

})();