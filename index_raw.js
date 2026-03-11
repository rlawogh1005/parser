const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parseTypescript } = require('./src/parse_typescript');
const { BenchmarkCollector } = require('./src/benchmark');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 3002;

app.use(bodyParser.json({ limit: '100mb' }));

/**
 * 디렉토리/파일 순회 및 분석 (벤치마크 계측 포함)
 * @param {string} currentPath
 * @param {BenchmarkCollector} bench
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

            // LOC 측정을 위해 소스코드 읽기
            let code = '';
            try {
                code = fs.readFileSync(currentPath, 'utf8');
            } catch {
                return null;
            }
            const loc = BenchmarkCollector.countLoc(code);

            try {
                let parsedResult;

                // ── 개별 파일 파싱 시간 측정
                const { result, elapsedMs } = BenchmarkCollector.measure(() => {
                    if (ext === '.java') {
                        const javaSource = path.join(__dirname, 'src', 'ParseJava.java'); // 분석할 코드
                        const javaLib = path.join(__dirname, 'lib', 'javaparser-core.jar'); // 자바파서
                        const classPath = `.${path.delimiter}${javaLib}`; // 자바파서 경로
                        const customCmd = `java -cp "${classPath}" "${javaSource}" "${currentPath}"`; // 자바 실행 명령어 구성
                        return execSync(customCmd, { cwd: __dirname }).toString(); // 명령어를 실제로 수행
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

                // JSON 파싱 시도
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

                // ── 벤치마크 기록 (성공)
                bench.recordFile(currentPath, true, loc, elapsedMs);

                return { type: 'file', name, filePath: currentPath, ast: parsedResult };
            } catch (astErr) {
                console.error(`[Custom AST Error] File: ${currentPath}, Error: ${astErr.message}`);

                // ── 벤치마크 기록 (실패)
                bench.recordFile(currentPath, false, loc, 0, astErr.message);

                return { type: 'file', name, filePath: currentPath, error: astErr.message };
            }
        }
    } catch (e) {
        console.error(`[FS Error] Path: ${currentPath}, Error: ${e.message}`);
        return null;
    }
}

// ─── API Endpoints ───────────────────────────────────────────

app.post('/analyze', upload.single('file'), async (req, res) => {
    console.log(`[Raw Parser] Received analyze request...`);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    // zip 파일 해제용 임시 디렉토리 경로
    const extractPath = path.join(__dirname, 'temp_raw_' + Date.now() + '_' + Math.random().toString(36).substring(7));

    // ── 벤치마크 수집기 생성
    const bench = new BenchmarkCollector('native-ast');
    bench.startTotal();

    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        const rootNode = processDirectoryCustomAst(extractPath, bench);
        bench.endTotal();

        // ── 레포 이름 추출
        const repoName = req.body?.repoName
            || req.query?.repoName
            || path.basename(req.file.originalname, '.zip')
            || 'unknown';

        // ── 벤치마크 결과 생성 & 저장
        const benchResult = bench.getResult(repoName);
        BenchmarkCollector.printCILog(benchResult);
        BenchmarkCollector.saveResult(benchResult);

        // 임시 파일 정리
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

app.get('/health', (req, res) => res.send('OK (Raw Parser)'));
app.listen(PORT, () => console.log(`Raw Parser ready on port ${PORT}`));
