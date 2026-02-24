const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const Parser = require('tree-sitter');

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
 * 재귀적으로 AST 구조 추출 (Standardized Format)
 */
function extractStructure(node) {
    const children = [];
    const mappedType = TARGET_NODE_TYPES[node.type];

    // 자식 노드 순회
    for (let i = 0; i < node.childCount; i++) {
        children.push(...extractStructure(node.child(i)));
    }

    if (mappedType) {
        return [{
            type: mappedType,
            name: getIdentifier(node),
            range: {
                start: { line: node.startPosition.row + 1, col: node.startPosition.column },
                end: { line: node.endPosition.row + 1, col: node.endPosition.column }
            },
            children: children
        }];
    }
    return children;
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
 * 디렉토리/파일 순회 및 분석
 */
function processDirectory(currentPath) {
    try {
        const stats = fs.statSync(currentPath);
        const name = path.basename(currentPath);

        if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            const children = files
                .filter(f => !['node_modules', '.git', 'dist', '__pycache__'].includes(f))
                .map(f => processDirectory(path.join(currentPath, f)))
                .filter(Boolean);

            return { type: 'DIRECTORY', name: currentPath, children };
        } else {
            const ext = path.extname(currentPath);
            const language = languages[ext];
            if (!language) return null;

            const code = fs.readFileSync(currentPath, 'utf8');


            try {
                parser.setLanguage(language);
                const tree = parser.parse(code);
                const structureChildren = [];
                if (tree.rootNode) {
                    traverseAndExtract(tree.rootNode, structureChildren);
                }
                return { type: 'FILE', name, children: structureChildren };
            } catch (astErr) {
                console.error(`[AST Error] File: ${currentPath}, Size: ${code.length}, Error: ${astErr.message}`);
                // 파싱 실패 시 빈 결과 반환하되 전체 프로세스는 계속 진행
                return { type: 'FILE', name, children: [], error: astErr.message };
            }
        }
    } catch (e) {
        console.error(`[FS Error] Path: ${currentPath}, Error: ${e.message}`);
        return null;
    }
}

// --- API Endpoints ---

app.post('/analyze', upload.single('file'), async (req, res) => {
    console.log(`[Parser] Received analyze request...`);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    const extractPath = path.join(__dirname, 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7));

    try {
        // 1. 압축 해제
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(extractPath, true);

        // 2. 분석
        const rootNode = processDirectory(extractPath);

        // 3. 청소
        if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
        }
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.json({
            nodes: rootNode ? [rootNode] : [],
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error('[Critical Error]', e.stack);
        // 에러 발생 시에도 청소 시도
        try { if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true }); } catch (rmErr) { }
        res.status(500).json({ error: e.message });
    }
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => console.log(`Parser ready on port ${PORT}`));