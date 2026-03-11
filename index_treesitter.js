const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const Parser = require('tree-sitter');
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

/**
 * Tree-sitter 노드를 Raw JSON으로 재귀 변환, tree-sitter가 생성하는 전체 AST를 그대로 반환한다.
 */
function treeToRawJson(node) {
    const result = {
        type: node.type,
        isNamed: node.isNamed,
        range: {
            start: { line: node.startPosition.row + 1, col: node.startPosition.column },
            end: { line: node.endPosition.row + 1, col: node.endPosition.column }
        }
    };

    // leaf 노드에만 text 포함 (트리 크기 최적화)
    if (node.childCount === 0) {
        result.text = node.text;
    }

    // field name이 있으면 포함
    if (node.parent) {
        for (let i = 0; i < node.parent.childCount; i++) {
            const sibling = node.parent.child(i);
            if (sibling.id === node.id) {
                const fieldName = node.parent.fieldNameForChild(i);
                if (fieldName) {
                    result.fieldName = fieldName;
                }
                break;
            }
        }
    }

    // 자식 노드 재귀 변환
    if (node.childCount > 0) {
        result.children = [];
        for (let i = 0; i < node.childCount; i++) {
            result.children.push(treeToRawJson(node.child(i)));
        }
    }

    return result;
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
 * 디렉토리/파일 순회 및 분석 (벤치마크 계측 포함)
 * @param {string} currentPath
 * @param {BenchmarkCollector} bench
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

            return { type: 'directory', name: name, filePath: currentPath, children };
        } else {
            const ext = path.extname(currentPath);
            const language = languages[ext];
            if (!language) return null;

            const code = fs.readFileSync(currentPath, 'utf8');
            const loc = BenchmarkCollector.countLoc(code);

            try {
                // ── 개별 파일 파싱 시간 측정
                const { result: tree, ms } = BenchmarkCollector.measure(() => {
                    parser.setLanguage(language);
                    return parser.parse(code);
                });

                let rawAst = null;
                let errorNodes = 0;
                if (tree.rootNode) {
                    rawAst = treeToRawJson(tree.rootNode);
                    errorNodes = countErrorNodes(tree.rootNode);
                }

                // ── 벤치마크 기록
                bench.record(currentPath, loc, ms);

                return { type: 'file', name, filePath: currentPath, ast: rawAst };
            } catch (astErr) {
                console.error(`[AST Error] File: ${currentPath}, Size: ${code.length}, Error: ${astErr.message}`);

                // ── 실패도 기록
                bench.record(currentPath, loc, 0);

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
    console.log(`[TreeSitter Parser] Received analyze request...`);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const extractPath = path.join(__dirname, 'temp_ts_' + Date.now() + '_' + Math.random().toString(36).substring(7));

    // ── 벤치마크 수집기 생성
    const bench = new BenchmarkCollector('tree-sitter');
    bench.startTotal();

    try {
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        const rootNode = processDirectory(extractPath, bench);
        bench.endTotal();

        // ── 레포 이름 추출
        const repoName = req.body?.repoName
            || req.query?.repoName
            || path.basename(req.file.originalname, '.zip')
            || 'unknown';

        // ── 벤치마크 결과 생성
        const benchResult = bench.getResult(repoName);
        BenchmarkCollector.save(benchResult, rootNode);

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



app.get('/health', (req, res) => res.send('OK (TreeSitter)'));
app.listen(PORT, () => console.log(`TreeSitter Parser ready on port ${PORT}`));
