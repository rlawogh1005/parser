const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const Parser = require('tree-sitter');
const { parseTypescript } = require('./src/parse_typescript');
const { BenchmarkCollector } = require('./src/benchmark');

const parser = new Parser();

// 언어별 Tree-sitter 모듈 로드
const languages = {
    '.java': require('tree-sitter-java'),
    '.py': require('tree-sitter-python'),
    '.ts': require('tree-sitter-typescript').typescript,
    '.js': require('tree-sitter-javascript'),
    '.cpp': require('tree-sitter-cpp'),
    '.h': require('tree-sitter-cpp')
};

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3001;

app.use(bodyParser.json({ limit: '100mb' }));

// 4계층 추출을 위한 노드 타입 정의 (Standardization)
const TARGET_NODE_TYPES = {
    // Common
    class_declaration: 'CLASS',
    class_definition: 'CLASS',
    class_specifier: 'CLASS',
    method_declaration: 'METHOD',
    method_definition: 'METHOD',
    function_definition: 'METHOD',
    function_declaration: 'METHOD',
    interface_declaration: 'INTERFACE'
};

/**
 * Tree-sitter 노드에서 이름(identifier) 추출
 */
function getIdentifier(node) {
    const nameNode = node.childForFieldName('name');
    if (nameNode) return nameNode.text;
    for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child.type === 'identifier' || child.type === 'type_identifier') {
            return child.text;
        }
    }
    return "anonymous";
}

/**
 * AST 데이터 추출
 */
function traverseAndExtract(node, targetArray) {
    const mappedType = TARGET_NODE_TYPES[node.type];
    let nextChildren = targetArray; // 기본적으로 현재 레벨의 배열을 가리킴

    if (mappedType) {
        const item = {
            type: mappedType,
            name: getIdentifier(node),
            range: {
                start: { line: node.startPosition.row + 1, col: node.startPosition.column },
                end: { line: node.endPosition.row + 1, col: node.endPosition.column }
            },
            children: []
        };
        targetArray.push(item);
        nextChildren = item.children; // 매핑된 노드라면 하위 노드는 이 item의 자식으로 들어감
    }

    // 자식 노드 순회
    for (let i = 0; i < node.childCount; i++) {
        traverseAndExtract(node.child(i), nextChildren);
    }
}

/**
 * Tree-sitter ERROR 노드 카운팅 (Robustness 측정)
 */
function countErrorNodes(node) {
    let count = 0;
    if (node.type === 'ERROR') count++;
    for (let i = 0; i < node.childCount; i++) {
        count += countErrorNodes(node.child(i));
    }
    return count;
}

/**
 * 디렉토리/파일 순회 및 분석 (내장 Tree-sitter 사용, 벤치마크 계측 포함)
 */
function processDirectory(currentPath, bench) {
    try {
        const stats = fs.statSync(currentPath);
        const name = path.basename(currentPath);

        if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            const children = files
                .filter(f => !['node_modules', '.git', 'dist', '__pycache__'].includes(f))
                .map(f => processDirectory(path.join(currentPath, f), bench))
                .filter(Boolean);

            return { type: 'DIRECTORY', name: currentPath, children };
        } else {
            const ext = path.extname(currentPath);
            const language = languages[ext];
            if (!language) return null;

            const code = fs.readFileSync(currentPath, 'utf8');
            const loc = BenchmarkCollector.countLoc(code);

            try {
                const { result: tree, elapsedMs } = BenchmarkCollector.measure(() => {
                    parser.setLanguage(language);
                    return parser.parse(code);
                });

                const structureChildren = [];
                let errorNodes = 0;
                if (tree.rootNode) {
                    traverseAndExtract(tree.rootNode, structureChildren);
                    errorNodes = countErrorNodes(tree.rootNode);
                }

                bench.recordFile(currentPath, true, loc, elapsedMs, null, errorNodes);

                return { type: 'FILE', name, children: structureChildren };
            } catch (astErr) {
                console.error(`[AST Error] File: ${currentPath}, Size: ${code.length}, Error: ${astErr.message}`);
                bench.recordFile(currentPath, false, loc, 0, astErr.message);
                return { type: 'FILE', name, children: [], error: astErr.message };
            }
        }
    } catch (e) {
        console.error(`[FS Error] Path: ${currentPath}, Error: ${e.message}`);
        return null;
    }
}

/**
 * 디렉토리/파일 순회 및 분석 (src 폴더의 커스텀 파서 사용, 벤치마크 계측 포함)
 */
function processDirectoryCustomAst(currentPath, bench) {
    try {
        const stats = fs.statSync(currentPath);
        const name = path.basename(currentPath);

        if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            const children = files
                .filter(f => !['node_modules', '.git', 'dist', '__pycache__'].includes(f))
                .map(f => processDirectoryCustomAst(path.join(currentPath, f), bench))
                .filter(Boolean);

            return { type: 'directory', name: name, filePath: currentPath, children };
        } else {
            const ext = path.extname(currentPath);

            let code = '';
            try {
                code = fs.readFileSync(currentPath, 'utf8');
            } catch {
                return null;
            }
            const loc = BenchmarkCollector.countLoc(code);

            try {
                let parsedResult;

                const { result, elapsedMs } = BenchmarkCollector.measure(() => {
                    if (ext === '.java') {
                        const javaSource = path.join(__dirname, 'src', 'ParseJava.java');
                        const javaLib = path.join(__dirname, 'lib', 'javaparser-core.jar');
                        const classPath = `.${path.delimiter}${javaLib}`;
                        const customCmd = `java -cp "${classPath}" "${javaSource}" "${currentPath}"`;
                        return execSync(customCmd, { cwd: __dirname }).toString();
                    }
                    else if (ext === '.ts' || ext === '.js') {
                        return parseTypescript(currentPath);
                    }
                    else if (ext === '.py') {
                        const pyCmd = `python3 src/parse_python.py "${currentPath}"`;
                        return execSync(pyCmd, { cwd: __dirname }).toString();
                    }
                    else if (ext === '.c') {
                        let clangCmd;
                        if (fs.existsSync(path.join(__dirname, 'src', 'parse_c'))) {
                            clangCmd = `./src/parse_c "${currentPath}"`;
                        } else {
                            clangCmd = `clang -Xclang -ast-dump=json -fsyntax-only "${currentPath}"`;
                        }
                        return execSync(clangCmd, { cwd: __dirname }).toString();
                    }
                    else {
                        return null;
                    }
                });

                if (result === null) return null;

                if (ext === '.java' || ext === '.ts' || ext === '.js') {
                    parsedResult = JSON.parse(result);
                } else if (ext === '.py') {
                    parsedResult = { rawAstDump: result.trim() };
                } else if (ext === '.c') {
                    try {
                        parsedResult = JSON.parse(result);
                    } catch {
                        parsedResult = { rawAstDump: result.trim() };
                    }
                }

                bench.recordFile(currentPath, true, loc, elapsedMs);

                return { type: 'file', name, filePath: currentPath, ast: parsedResult };
            } catch (astErr) {
                console.error(`[Custom AST Error] File: ${currentPath}, Error: ${astErr.message}`);
                bench.recordFile(currentPath, false, loc, 0, astErr.message);
                return { type: 'file', name, filePath: currentPath, error: astErr.message };
            }
        }
    } catch (e) {
        console.error(`[FS Error] Path: ${currentPath}, Error: ${e.message}`);
        return null;
    }
}


// --- API Endpoints ---

// 기존 Tree-sitter 기반 분석 엔드포인트
app.post('/analyze', upload.single('file'), async (req, res) => {
    console.log(`[Parser] Received analyze request (Tree-sitter)...`);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const extractPath = path.join(__dirname, 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7));

    const bench = new BenchmarkCollector('tree-sitter');
    bench.startTotal();

    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        const rootNode = processDirectory(extractPath, bench);
        bench.endTotal();

        const repoName = req.body?.repoName
            || req.query?.repoName
            || path.basename(req.file.originalname, '.zip')
            || 'unknown';

        const benchResult = bench.getResult(repoName);
        BenchmarkCollector.printCILog(benchResult);
        BenchmarkCollector.saveResult(benchResult);

        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        return res.json({
            nodes: rootNode ? [rootNode] : [],
            timestamp: new Date().toISOString(),
            benchmark: benchResult
        });
    } catch (e) {
        try { if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true }); } catch (rmErr) { }
        res.status(500).json({ error: e.message });
    }
});

// 신규: src 내부의 도구(JavaParser, TS Compiler API 등)를 사용한 분석 엔드포인트
app.post('/analyze-raw', upload.single('file'), async (req, res) => {
    console.log(`[Parser] Received analyze request (Custom Raw AST)...`);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const extractPath = path.join(__dirname, 'temp_raw_' + Date.now() + '_' + Math.random().toString(36).substring(7));

    const bench = new BenchmarkCollector('native-ast');
    bench.startTotal();

    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        const rootNode = processDirectoryCustomAst(extractPath, bench);
        bench.endTotal();

        const repoName = req.body?.repoName
            || req.query?.repoName
            || path.basename(req.file.originalname, '.zip')
            || 'unknown';

        const benchResult = bench.getResult(repoName);
        BenchmarkCollector.printCILog(benchResult);
        BenchmarkCollector.saveResult(benchResult);

        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        return res.json({
            nodes: rootNode ? [rootNode] : [],
            timestamp: new Date().toISOString(),
            benchmark: benchResult
        });
    } catch (e) {
        try { if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true }); } catch (rmErr) { }
        res.status(500).json({ error: e.message });
    }
});

// ─── 벤치마크 결과 조회 엔드포인트 ─────────────────────────

app.get('/benchmark/results', (req, res) => {
    const resultsDir = '/app/benchmark-results';
    if (!fs.existsSync(resultsDir)) {
        return res.json({ results: [] });
    }
    const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();

    const results = files.map(f => {
        try {
            return JSON.parse(fs.readFileSync(path.join(resultsDir, f), 'utf8'));
        } catch { return null; }
    }).filter(Boolean);

    res.json({ results });
});

app.get('/benchmark/summary', (req, res) => {
    const csvPath = '/app/benchmark-results/benchmark_summary.csv';
    if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ error: 'No benchmark data yet' });
    }
    const csv = fs.readFileSync(csvPath, 'utf8');
    res.type('text/csv').send(csv);
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Parser ready on port ${PORT}`));