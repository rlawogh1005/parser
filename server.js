const express = require('express');
const bodyParser = require('body-parser');
const { parseTypescript } = require('./src/parse_tsmorph');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

// Endpoint for TypeScript
app.post('/parse/ts', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tmpFile = path.join(__dirname, 'temp.ts');
        fs.writeFileSync(tmpFile, code);

        const ast = parseTypescript(tmpFile);

        fs.unlinkSync(tmpFile);

        res.json(JSON.parse(ast));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint for Python
app.post('/parse/py', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const pythonScript = path.join(__dirname, 'src', 'parse_python.py');
        const tmpFile = path.join(__dirname, 'temp.py');
        fs.writeFileSync(tmpFile, code);

        const output = execFileSync('python3', [pythonScript, tmpFile], { encoding: 'utf-8' });

        fs.unlinkSync(tmpFile);

        res.json(JSON.parse(output));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Endpoint for Java
app.post('/parse/java', (req, res) => {
    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const tmpFile = path.join(__dirname, 'Temp.java');
        fs.writeFileSync(tmpFile, code);

        const classpath = `lib/javaparser-core.jar${path.delimiter}bin`;

        // Execution command for Java
        const output = execFileSync('java', [
            '-cp', classpath,
            'ParseJava',
            tmpFile
        ], { encoding: 'utf-8', cwd: __dirname });

        fs.unlinkSync(tmpFile);

        res.json(JSON.parse(output));
    } catch (e) {
        console.error(e);
        const errMsg = e.stdout ? e.stdout.toString() : e.message;
        res.status(500).json({ error: errMsg });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
