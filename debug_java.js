const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BIN_DIR = path.join(__dirname, 'bin');
const SRC_DIR = path.join(__dirname, 'src');
const LIB_DIR = path.join(__dirname, 'lib');

const javaHome = process.env.JAVA_HOME || 'C:\\Program Files\\Java\\jdk-21.0.2';
const javac = path.join(javaHome, 'bin', 'javac.exe');

console.log(`Using javac: ${javac}`);

const args = ['-help'];

console.log(`Args: ${JSON.stringify(args)}`);

const result = spawnSync(javac, args, { encoding: 'utf8' });

console.log('Exit Code:', result.status);
console.log('Stdout:', result.stdout);
console.log('Stderr:', result.stderr);

if (result.error) {
    console.error('Spawn error:', result.error);
}

if (fs.existsSync(path.join(BIN_DIR, 'ParseJava.class'))) {
    console.log('Success: ParseJava.class exists');
} else {
    console.log('Failure: ParseJava.class does NOT exist');
}
