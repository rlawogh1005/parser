const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parser functions mapping
const { parseTypescript } = require('../src/parse_typescript');

// Directories
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const LIB_DIR = path.join(ROOT_DIR, 'lib');
const SAMPLE_DIR = path.join(ROOT_DIR, 'samples');
const OUT_DIR = path.join(ROOT_DIR, 'parser-results');

// Files
const JAVA_SAMPLE = path.join(SAMPLE_DIR, 'sample.java');
const TS_SAMPLE = path.join(SAMPLE_DIR, 'sample.ts');
const JS_SAMPLE = path.join(SAMPLE_DIR, 'sample.js');
const PY_SAMPLE = path.join(SAMPLE_DIR, 'sample.py');
const C_SAMPLE = path.join(SAMPLE_DIR, 'sample.c');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

console.log('=== Saving ASTs to parser-results ===\n');

(async () => {
    // 1. JavaParser (.java)
    try {
        console.log('Parsing sample.java...');
        const javaSource = path.join(SRC_DIR, 'ParseJava.java');
        const javaLib = path.join(LIB_DIR, 'javaparser-core.jar');

        if (!fs.existsSync(javaLib)) {
            console.warn(`[Warning] Java Library not found: ${javaLib}`);
        } else {
            const classPath = `.${path.delimiter}${javaLib}`;
            const javaCmd = `java -cp "${classPath}" "${javaSource}" "${JAVA_SAMPLE}"`;
            const javaOutput = execSync(javaCmd, { cwd: ROOT_DIR }).toString();
            fs.writeFileSync(path.join(OUT_DIR, 'sample.java.json'), javaOutput.trim(), 'utf8');
            console.log(' -> Saved: parser-results/sample.java.json');
        }
    } catch (e) {
        console.error('JavaParser error:', e.message);
    }

    // 2. TypeScript Compiler API (.ts)
    try {
        console.log('Parsing sample.ts...');
        const tsOutput = parseTypescript(TS_SAMPLE);
        fs.writeFileSync(path.join(OUT_DIR, 'sample.ts.json'), tsOutput, 'utf8');
        console.log(' -> Saved: parser-results/sample.ts.json');
    } catch (e) {
        console.error('ts error (.ts):', e.message);
    }

    // 3. TypeScript Compiler API (.js)
    try {
        console.log('Parsing sample.js...');
        const jsOutput = parseTypescript(JS_SAMPLE);
        fs.writeFileSync(path.join(OUT_DIR, 'sample.js.json'), jsOutput, 'utf8');
        console.log(' -> Saved: parser-results/sample.js.json');
    } catch (e) {
        console.error('ts error (.js):', e.message);
    }

    // 4. Python AST (.py)
    try {
        console.log('Parsing sample.py...');
        const pyCmd = `python src/parse_python.py "${PY_SAMPLE}"`;
        const pyOutput = execSync(pyCmd, { cwd: ROOT_DIR }).toString();
        fs.writeFileSync(path.join(OUT_DIR, 'sample.py.json'), pyOutput.trim(), 'utf8');
        console.log(' -> Saved: parser-results/sample.py.json');
    } catch (e) {
        console.error('Python error:', e.message);
    }

    // 5. Clang (.c)
    try {
        console.log('Parsing sample.c...');
        const clangCmd = `./src/parse_c "${C_SAMPLE}"`;
        const clangOutput = execSync(clangCmd, { cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
        fs.writeFileSync(path.join(OUT_DIR, 'sample.c.txt'), clangOutput.trim(), 'utf8');
        console.log(' -> Saved: parser-results/sample.c.txt (Custom Tree Format)');
    } catch (e) {
        if (e.message.includes('No such file') || e.message.includes('not found')) {
            console.error('Clang error: src/parse_c executable not found. Please compile it first.');
        } else {
            console.error('Clang error:', e.message);
        }
    }

    console.log('\n=== Parsing and Saving Complete ===');
})();
