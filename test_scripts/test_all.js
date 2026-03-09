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

// Files
const JAVA_SAMPLE = path.join(SAMPLE_DIR, 'sample.java');
const TS_SAMPLE = path.join(SAMPLE_DIR, 'sample.ts');
const JS_SAMPLE = path.join(SAMPLE_DIR, 'sample.js');
const PY_SAMPLE = path.join(SAMPLE_DIR, 'sample.py');
const C_SAMPLE = path.join(SAMPLE_DIR, 'sample.c');

console.log('=== Multi-Language Parser Test Script ===\n');

(async () => {
    // 1. JavaParser (.java)
    try {
        console.log('--- 1. JavaParser (sample.java) ---');
        const javaSource = path.join(SRC_DIR, 'ParseJava.java');
        const javaLib = path.join(LIB_DIR, 'javaparser-core.jar');

        if (!fs.existsSync(javaLib)) {
            console.warn(`[Warning] Java Library not found: ${javaLib}`);
        } else {
            const classPath = `.${path.delimiter}${javaLib}`;
            const javaCmd = `java -cp "${classPath}" "${javaSource}" "${JAVA_SAMPLE}"`;
            const javaOutput = execSync(javaCmd, { cwd: ROOT_DIR }).toString();
            // Just print a snippet to avoid overwhelming output
            console.log(javaOutput.substring(0, 500) + '\n... [truncated] ...\n');
        }
    } catch (e) {
        console.error('JavaParser error:', e.message);
    }

    // 2. ts-morph (TypeScript Compiler API) (.ts)
    try {
        console.log('\n--- 2. ts-morph (sample.ts) ---');
        const tsOutput = parseTypescript(TS_SAMPLE);
        console.log(tsOutput.substring(0, 500) + '\n... [truncated] ...\n');
    } catch (e) {
        console.error('ts-morph error (.ts):', e.message);
    }

    // 3. ts-morph (TypeScript Compiler API) (.js)
    try {
        console.log('\n--- 3. ts-morph (sample.js) ---');
        const jsOutput = parseTypescript(JS_SAMPLE);
        console.log(jsOutput.substring(0, 500) + '\n... [truncated] ...\n');
    } catch (e) {
        console.error('ts-morph error (.js):', e.message);
    }

    // 4. Python AST (.py)
    try {
        console.log('\n--- 4. Python ast (sample.py) ---');
        const pyCmd = `python src/parse_python.py "${PY_SAMPLE}"`;
        const pyOutput = execSync(pyCmd, { cwd: ROOT_DIR }).toString();
        console.log(pyOutput.substring(0, 500) + '\n... [truncated] ...\n');
    } catch (e) {
        console.error('Python error:', e.message);
    }

    // 5. Clang (.c)
    try {
        console.log('\n--- 5. Clang (sample.c) ---');
        const clangCmd = `clang -Xclang -ast-dump=json -fsyntax-only "${C_SAMPLE}"`;
        const clangOutput = execSync(clangCmd, { cwd: ROOT_DIR, stdio: ['pipe', 'pipe', 'pipe'] }).toString();
        console.log(clangOutput.substring(0, 500) + '\n... [truncated] ...\n');
    } catch (e) {
        if (e.message.includes('command not found') || e.message.includes('clang')) {
            console.error('Clang error: Clang is not installed or available in PATH. Please run `sudo apt install clang`.');
        } else {
            console.error('Clang error:', e.message);
        }
    }

    console.log('\n=== Parsing Test Complete ===');
})();
