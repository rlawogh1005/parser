const { execSync, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { parseJavascript } = require('./src/parse_treesitter');
const { parseTypescript } = require('./src/parse_tsmorph');

const BIN_DIR = path.join(__dirname, 'bin');
const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(__dirname, 'lib');
const JAVA_CP = `${path.join(LIB_DIR, 'javaparser-core.jar')}${path.delimiter}${BIN_DIR}`;

// Compile Java
let javaAvailable = false;
try {
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR);

    // Simple check for javac in PATH
    try {
        console.log(`Compiling Java with javac...`);

        execFileSync('javac', [
            '--release', '17',
            '-d', BIN_DIR,
            '-cp', path.join(LIB_DIR, 'javaparser-core.jar'),
            path.join(SRC_DIR, 'ParseJava.java')
        ], { stdio: 'inherit' });

        if (fs.existsSync(path.join(BIN_DIR, 'ParseJava.class'))) {
            console.log('Compilation successful.');
            javaAvailable = true;
        } else {
            console.error('Java Compilation Failed: Output file not created.');
        }
    } catch (err) {
        console.log('Javac execution failed:', err.message);
    }
} catch (e) {
    console.error('Java Setup error:', e.message);
}

// Define sample file paths
const SAMPLE_DIR = path.join(__dirname, 'samples');
const JS_SAMPLE = path.join(SAMPLE_DIR, 'sample.js');
const TS_SAMPLE = path.join(SAMPLE_DIR, 'sample.ts');
const PY_SAMPLE = path.join(SAMPLE_DIR, 'sample.py');
const JAVA_SAMPLE = path.join(SAMPLE_DIR, 'sample.java');

console.log('=== Parser Demonstration (File Based) ===\n');

// 1. Tree-sitter
try {
    console.log(`--- Tree-sitter (JavaScript) ---`);
    console.log(`File: ${JS_SAMPLE}`);
    console.log(parseJavascript(JS_SAMPLE));
} catch (e) {
    console.error('Tree-sitter error:', e.message);
}

console.log('\n');

// 2. ts-morph
try {
    console.log(`--- ts-morph (TypeScript) ---`);
    console.log(`File: ${TS_SAMPLE}`);
    console.log(parseTypescript(TS_SAMPLE));
} catch (e) {
    console.error('ts-morph error:', e.message);
}

console.log('\n');

// 3. Python ast
// 3. Python ast
try {
    console.log(`--- Python ast ---`);
    console.log(`File: ${PY_SAMPLE}`);
    const output = execSync(`python src/parse_python.py "${PY_SAMPLE}"`, { cwd: __dirname }).toString();
    console.log(output.trim());
} catch (e) {
    console.error('Python error:', e.message);
}

console.log('\n');

// 4. JavaParser
try {
    if (javaAvailable) {
        console.log(`File: ${JAVA_SAMPLE}`);
        // Java argument is file path now
        const cmd = `java -cp "${JAVA_CP}" ParseJava "${JAVA_SAMPLE}"`;
        const output = execSync(cmd, { cwd: __dirname }).toString();
        console.log(output.trim());
    } else {
        console.log('--- JavaParser ---');
        console.log('Skipping JavaParser demo due to compilation failure.');
    }
} catch (e) {
    console.error('JavaParser error:', e.message);
}
