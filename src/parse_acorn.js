const acorn = require('acorn');
const fs = require('fs');
const path = require('path');

function parseJavascript(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const comments = [];
        // 1. 주석 수집을 위한 옵션 추가
        const ast = acorn.parse(code, {
            ecmaVersion: 2020,
            locations: true,
            onComment: comments
        });

        // 2. 계층 구조화를 위한 데이터 가공 (Extraction)
        const structuredData = {
            meta: {
                directory: path.dirname(filePath),
                fileName: path.basename(filePath),
                fullPath: filePath
            },
            metrics: {
                sloc: code.split('\n').length,
                commentCount: comments.length
            },
            // Raw AST는 필요 시 저장하되, 분석용 데이터는 분리
            structure: extractStructure(ast),
            // rawAst: ast // DB 용량이 허락한다면 저장, 아니면 제외
        };

        return JSON.stringify(structuredData, null, 2);
    } catch (e) {
        return JSON.stringify({ error: e.message });
    }
}

// 3. 클래스와 메서드만 추출하여 평탄화하는 함수 구현 필요
function extractStructure(ast) {
    const classes = [];
    const functions = [];

    // 단순 순회 로직 (실제로는 재귀적 탐색이나 acorn-walk 사용 권장)
    ast.body.forEach(node => {
        if (node.type === 'ClassDeclaration') {
            classes.push({ name: node.id.name, loc: node.loc });
            // 클래스 내부 메서드 추출 로직 추가 필요
        } else if (node.type === 'FunctionDeclaration') {
            functions.push({ name: node.id.name, loc: node.loc, params: node.params.length });
        }
    });

    return { classes, functions };
}

module.exports = { parseJavascript };